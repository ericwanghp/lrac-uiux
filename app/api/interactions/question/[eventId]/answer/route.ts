import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendEventBySessionId } from "@/lib/utils/terminal-session-operations";

const AnswerQuestionSchema = z.object({
  sessionId: z.string().min(1),
  answer: z.string().min(1),
  actorId: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const body = await request.json();
    const validatedInput = AnswerQuestionSchema.parse(body);
    const { event } = await appendEventBySessionId(
      validatedInput.sessionId,
      {
        eventType: "interaction.question.answered",
        streamType: "system",
        actor: {
          type: "user",
          id: validatedInput.actorId || "frontend-user",
        },
        payload: {
          sourceEventId: eventId,
          answer: validatedInput.answer,
        },
      },
      projectRoot
    );
    return NextResponse.json(
      {
        success: true,
        data: event,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to answer question";
    if (message.includes("not found")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
