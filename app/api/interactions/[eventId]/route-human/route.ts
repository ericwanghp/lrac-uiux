import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendEventBySessionId } from "@/lib/utils/terminal-session-operations";
import { createHumanRoutingAdapter } from "@/lib/integrations/human-routing-adapter";

const RouteHumanSchema = z.object({
  sessionId: z.string().min(1),
  assignee: z.string().min(1),
  channel: z.string().min(1),
  message: z.string().min(1),
  actorId: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const body = await request.json();
    const validatedInput = RouteHumanSchema.parse(body);
    const adapter = createHumanRoutingAdapter();
    const delivery = await adapter.send({
      ticketId: `${params.eventId}-${Date.now().toString(36)}`,
      sessionId: validatedInput.sessionId,
      eventId: params.eventId,
      assignee: validatedInput.assignee,
      channel: validatedInput.channel,
      message: validatedInput.message,
      createdAt: new Date().toISOString(),
    });
    const { event } = await appendEventBySessionId(
      validatedInput.sessionId,
      {
        eventType: "interaction.human.routing.created",
        streamType: "system",
        actor: {
          type: "user",
          id: validatedInput.actorId || "frontend-user",
        },
        payload: {
          sourceEventId: params.eventId,
          assignee: validatedInput.assignee,
          channel: validatedInput.channel,
          message: validatedInput.message,
          adapter: adapter.name,
          externalId: delivery.externalId,
        },
      },
      projectRoot
    );
    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to route interaction";
    if (message.includes("not found")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
