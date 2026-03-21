import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";
import {
  appendEventToSession,
  mutateTerminalSessions,
} from "@/lib/utils/terminal-session-operations";
import {
  hasActiveTerminalProcess,
  runTerminalCommand,
} from "@/lib/services/terminal-command-runner";
import {
  terminalCommandsEnabled,
  validateTerminalCommand,
} from "@/lib/services/terminal-command-policy";

const SubmitCommandSchema = z.object({
  command: z.string().min(1, "command is required"),
  actorId: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!terminalCommandsEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Terminal command execution is disabled. Set LRAC_ENABLE_TERMINAL_COMMANDS=true to enable it.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedInput = SubmitCommandSchema.parse(body);
    const validatedCommand = validateTerminalCommand(validatedInput.command);
    const projectRoot = getCurrentProjectRoot();
    const actor = {
      type: "user" as const,
      id: validatedInput.actorId || "frontend-user",
    };
    if (hasActiveTerminalProcess(params.id, projectRoot)) {
      return NextResponse.json(
        {
          success: false,
          error: `A command is already running in terminal session: ${params.id}`,
        },
        { status: 409 }
      );
    }
    const { session, event } = await mutateTerminalSessions(async (sessionsData) => {
      const matchedSession = sessionsData.sessions.find((item) => item.id === params.id);
      if (!matchedSession) {
        throw new Error(`Terminal session not found: ${params.id}`);
      }
      if (matchedSession.status === "closed") {
        throw new Error(`Terminal session is closed: ${params.id}`);
      }
      const submittedEvent = appendEventToSession(matchedSession, {
        eventType: "terminal.command.submitted",
        streamType: "system",
        actor,
        payload: {
          command: validatedCommand.displayCommand,
        },
      });
      return {
        session: matchedSession,
        event: submittedEvent,
      };
    }, projectRoot);
    void runTerminalCommand(session.id, validatedCommand, actor, projectRoot);
    return NextResponse.json(
      {
        success: true,
        data: {
          sessionId: session.id,
          event,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit terminal command";
    if (message.includes("not found")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    if (message.includes("closed")) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    if (message.includes("blocked") || message.includes("allowlisted")) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
