import { NextRequest, NextResponse } from "next/server";
import type { InboxMessage } from "@/lib/types";
import { getCurrentAuthSession } from "@/lib/utils/member-auth-operations";
import { readInboxFile } from "@/lib/utils/inbox-operations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const session = await getCurrentAuthSession(projectRoot);
    if (!session.member || !session.projectRoot) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const inbox = await readInboxFile(session.projectRoot);
    const messages = inbox.messages
      .filter((message: InboxMessage) => message.recipientMemberId === session.member?.id)
      .sort((left: InboxMessage, right: InboxMessage) => right.createdAt.localeCompare(left.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        member: session.member,
        messages,
        unread: messages.filter((message: InboxMessage) => message.status === "unread").length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load inbox" },
      { status: 500 }
    );
  }
}
