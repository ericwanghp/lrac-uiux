import { NextResponse } from "next/server";
import { readQASessionsFile, writeQASessionsFile } from "@/lib/utils/qa-session-operations";
import { UpdateQASessionInputSchema } from "@/lib/validation";
import type { QASession } from "@/lib/types/qa-session";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/qa/sessions/[id]
 * Get a single Q&A session by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
        },
        { status: 400 }
      );
    }

    // Read sessions file
    const sessionsData = await readQASessionsFile();

    // Find session
    const session = sessionsData.sessions.find((s) => s.id === id);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: `Q&A session with ID "${id}" not found`,
        },
        { status: 404 }
      );
    }

    // Return response
    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Error getting Q&A session:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get Q&A session",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/qa/sessions/[id]
 * Update a Q&A session (add answers, update status)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedInput = UpdateQASessionInputSchema.parse(body);

    // Read sessions file
    const sessionsData = await readQASessionsFile();

    // Find session index
    const sessionIndex = sessionsData.sessions.findIndex((s) => s.id === id);

    if (sessionIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Q&A session with ID "${id}" not found`,
        },
        { status: 404 }
      );
    }

    // Get existing session
    const existingSession = sessionsData.sessions[sessionIndex];

    if (!existingSession) {
      return NextResponse.json(
        {
          success: false,
          error: `Q&A session with ID "${id}" not found`,
        },
        { status: 404 }
      );
    }

    // Build updated session
    const now = new Date().toISOString();
    const updatedSession: QASession = {
      id: existingSession.id,
      projectId: existingSession.projectId,
      phase: existingSession.phase,
      status: validatedInput.status ?? existingSession.status,
      questions: validatedInput.questions ?? existingSession.questions,
      answers: validatedInput.answers ?? existingSession.answers,
      createdAt: existingSession.createdAt,
      updatedAt: now,
      completedAt:
        validatedInput.status === "completed" && existingSession.status !== "completed"
          ? now
          : existingSession.completedAt,
    };

    // Update in array
    sessionsData.sessions[sessionIndex] = updatedSession;

    // Write back to file
    await writeQASessionsFile(sessionsData);

    // Return response
    return NextResponse.json({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    console.error("Error updating Q&A session:", error);

    if (error instanceof Error && error.message.includes("validation failed")) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update Q&A session",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/qa/sessions/[id]
 * Delete a Q&A session
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
        },
        { status: 400 }
      );
    }

    // Read sessions file
    const sessionsData = await readQASessionsFile();

    // Find session index
    const sessionIndex = sessionsData.sessions.findIndex((s) => s.id === id);

    if (sessionIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Q&A session with ID "${id}" not found`,
        },
        { status: 404 }
      );
    }

    // Remove session from array
    sessionsData.sessions.splice(sessionIndex, 1);

    // Write back to file
    await writeQASessionsFile(sessionsData);

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        message: `Q&A session "${id}" deleted successfully`,
      },
    });
  } catch (error) {
    console.error("Error deleting Q&A session:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete Q&A session",
      },
      { status: 500 }
    );
  }
}
