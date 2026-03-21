import { NextRequest, NextResponse } from "next/server";
import {
  readQASessionsFile,
  writeQASessionsFile,
  generateSessionId,
} from "@/lib/utils/qa-session-operations";
import { ListQASessionsInputSchema, CreateQASessionInputSchema } from "@/lib/validation";
import type { QASession, Question } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/qa/sessions
 * List all Q&A sessions with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const input = {
      projectId: searchParams.get("projectId") || undefined,
      phase: searchParams.get("phase") ? parseInt(searchParams.get("phase")!, 10) : undefined,
      status: searchParams.get("status") || undefined,
    };

    // Validate input
    const validatedInput = ListQASessionsInputSchema.parse(input);

    // Read sessions file
    const sessionsData = await readQASessionsFile();

    // Filter sessions
    let filteredSessions = sessionsData.sessions;

    if (validatedInput.projectId) {
      filteredSessions = filteredSessions.filter((s) => s.projectId === validatedInput.projectId);
    }

    if (validatedInput.phase !== undefined) {
      filteredSessions = filteredSessions.filter((s) => s.phase === validatedInput.phase);
    }

    if (validatedInput.status) {
      filteredSessions = filteredSessions.filter((s) => s.status === validatedInput.status);
    }

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        sessions: filteredSessions,
        total: filteredSessions.length,
        filters: validatedInput,
      },
    });
  } catch (error) {
    console.error("Error listing Q&A sessions:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list Q&A sessions",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/qa/sessions
 * Create a new Q&A session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedInput = CreateQASessionInputSchema.parse(body);

    // Read existing sessions
    const sessionsData = await readQASessionsFile();

    // Generate session ID
    const sessionId = generateSessionId();

    // Create initial questions if provided
    const now = new Date().toISOString();
    const questions: Question[] = (validatedInput.initialQuestions || []).map((question, index) => {
      if (typeof question === "string") {
        return {
          id: `q-${Date.now().toString(36)}-${index}`,
          question,
          timestamp: now,
          asker: "system",
        };
      }

      return {
        id: question.id || `q-${Date.now().toString(36)}-${index}`,
        question: question.question,
        timestamp: now,
        asker: question.asker || "system",
        type: question.type,
        options: question.options,
        helpText: question.helpText,
      };
    });

    // Create new session
    const newSession: QASession = {
      id: sessionId,
      projectId: validatedInput.projectId,
      phase: validatedInput.phase,
      status: "pending",
      questions,
      answers: [],
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    // Add to sessions array
    sessionsData.sessions.push(newSession);

    // Write back to file
    await writeQASessionsFile(sessionsData);

    // Return response
    return NextResponse.json(
      {
        success: true,
        data: newSession,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating Q&A session:", error);

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
        error: error instanceof Error ? error.message : "Failed to create Q&A session",
      },
      { status: 500 }
    );
  }
}
