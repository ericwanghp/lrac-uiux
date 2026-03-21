import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendEventBySessionId } from "@/lib/utils/terminal-session-operations";

const RejectSchema = z.object({
  sessionId: z.string().min(1),
  comment: z.string().min(1),
  actorId: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const body = await request.json();
    const validatedInput = RejectSchema.parse(body);
    const { event } = await appendEventBySessionId(validatedInput.sessionId, {
      eventType: "interaction.approval.decided",
      streamType: "system",
      actor: {
        type: "user",
        id: validatedInput.actorId || "frontend-user",
      },
      payload: {
        sourceEventId: params.eventId,
        decision: "rejected",
        comment: validatedInput.comment,
      },
    });
    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reject interaction";
    if (message.includes("not found")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
