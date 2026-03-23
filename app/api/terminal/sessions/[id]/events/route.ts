import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readTerminalSessionsFile } from "@/lib/utils/terminal-session-operations";

export const dynamic = "force-dynamic";

const EventsQuerySchema = z.object({
  afterSeq: z.coerce.number().int().min(0).optional().default(0),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const projectRoot = searchParams.get("project");
    const validatedQuery = EventsQuerySchema.parse({
      afterSeq: searchParams.get("afterSeq") ?? 0,
    });
    const sessionsData = await readTerminalSessionsFile(projectRoot);
    const session = sessionsData.sessions.find((item) => item.id === params.id);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: `Terminal session not found: ${params.id}`,
        },
        { status: 404 }
      );
    }
    const events = session.events.filter((event) => event.seqNo > validatedQuery.afterSeq);
    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        afterSeq: validatedQuery.afterSeq,
        nextSeqNo: session.nextSeqNo,
        events,
        total: events.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list terminal events",
      },
      { status: 500 }
    );
  }
}
