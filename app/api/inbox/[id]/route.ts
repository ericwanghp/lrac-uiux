import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { InboxMessage } from "@/lib/types";
import { markInboxMessageRead, readInboxFile } from "@/lib/utils/inbox-operations";
import { getCurrentAuthSession } from "@/lib/utils/member-auth-operations";
import { applyPhaseGateDecision } from "@/lib/utils/phase-gate-operations";

export const dynamic = "force-dynamic";

const UpdateInboxSchema = z.object({
  action: z.enum(["read", "approve", "reject", "needs_revision"]),
  comment: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const session = await getCurrentAuthSession(projectRoot);
    if (!session.member || !session.projectRoot) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const body = UpdateInboxSchema.parse(await request.json());
    const inbox = await readInboxFile(session.projectRoot);
    const message =
      inbox.messages.find(
        (entry: InboxMessage) => entry.id === id && entry.recipientMemberId === session.member?.id
      ) ?? null;

    if (!message) {
      return NextResponse.json({ success: false, error: "Inbox message not found" }, { status: 404 });
    }

    if (body.action === "read") {
      const updated = await markInboxMessageRead({ projectRoot: session.projectRoot, messageId: id });
      return NextResponse.json({ success: true, data: updated });
    }

    if (!message.gateId) {
      return NextResponse.json({ success: false, error: "No gate is attached to this message" }, { status: 400 });
    }

    const decision =
      body.action === "approve"
        ? "approved"
        : body.action === "reject"
          ? "rejected"
          : "needs_revision";

    const updatedGate = await applyPhaseGateDecision({
      projectRoot: session.projectRoot,
      gateId: message.gateId,
      decision: {
        actorId: session.member.id,
        actorName: session.member.name,
        role: Array.isArray(session.member.roles) ? session.member.roles.join(", ") : (session.member.roles ?? ""),
        decision,
        comment: body.comment || "",
        timestamp: new Date().toISOString(),
      },
    });

    await markInboxMessageRead({ projectRoot: session.projectRoot, messageId: id });
    return NextResponse.json({ success: true, data: { gate: updatedGate } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update inbox item" },
      { status: 400 }
    );
  }
}
