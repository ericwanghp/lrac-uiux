import { spawn, type ChildProcess } from "child_process";
import {
  appendEventBySessionId,
  mutateTerminalSessions,
} from "@/lib/utils/terminal-session-operations";
import type { TerminalActor, TerminalStreamType } from "@/lib/types/terminal";
import type { ValidatedTerminalCommand } from "@/lib/services/terminal-command-policy";

type ActiveTerminalProcess = {
  child: ChildProcess;
  requestedClose: boolean;
};

const activeProcesses = new Map<string, ActiveTerminalProcess>();

function getProcessKey(sessionId: string, projectRoot: string) {
  return `${projectRoot}::${sessionId}`;
}

function splitLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

async function appendOutputLines(
  sessionId: string,
  lines: string[],
  streamType: TerminalStreamType,
  actor: TerminalActor,
  projectRoot: string
) {
  for (const line of lines) {
    await appendEventBySessionId(
      sessionId,
      {
        eventType: "terminal.output.appended",
        streamType,
        actor,
        payload: { content: line },
      },
      projectRoot
    );
  }
}

function drainBuffer(buffer: string, force: boolean) {
  const segments = buffer.split(/\r?\n/);
  const trailing = force ? "" : (segments.pop() ?? "");
  if (force && trailing) {
    segments.push(trailing);
  }
  return {
    remaining: trailing,
    lines: splitLines(segments.join("\n")),
  };
}

export function hasActiveTerminalProcess(sessionId: string, projectRoot: string): boolean {
  return activeProcesses.has(getProcessKey(sessionId, projectRoot));
}

async function markSessionClosed(sessionId: string, projectRoot: string) {
  return mutateTerminalSessions(async (sessionsData) => {
    const session = sessionsData.sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new Error(`Terminal session not found: ${sessionId}`);
    }
    session.status = "closed";
    session.closedAt = new Date().toISOString();
    session.updatedAt = session.closedAt;
    return session;
  }, projectRoot);
}

function registerProcess(sessionId: string, projectRoot: string, child: ChildProcess) {
  activeProcesses.set(getProcessKey(sessionId, projectRoot), {
    child,
    requestedClose: false,
  });
}

function markProcessClosing(sessionId: string, projectRoot: string): ChildProcess | null {
  const key = getProcessKey(sessionId, projectRoot);
  const processRef = activeProcesses.get(key);
  if (!processRef) {
    return null;
  }
  processRef.requestedClose = true;
  return processRef.child;
}

export async function runTerminalCommand(
  sessionId: string,
  command: ValidatedTerminalCommand,
  actor: TerminalActor,
  projectRoot: string
) {
  const startedAt = Date.now();
  const child = spawn(command.executable, command.args, {
    cwd: projectRoot,
    shell: false,
    env: {
      ...process.env,
      PWD: projectRoot,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  registerProcess(sessionId, projectRoot, child);

  let stdoutBuffer = "";
  let stderrBuffer = "";

  const flushBuffer = async (streamType: TerminalStreamType, force = false) => {
    if (streamType === "stdout") {
      const drained = drainBuffer(stdoutBuffer, force);
      stdoutBuffer = drained.remaining;
      if (drained.lines.length > 0) {
        await appendOutputLines(sessionId, drained.lines, streamType, actor, projectRoot);
      }
      return;
    }

    const drained = drainBuffer(stderrBuffer, force);
    stderrBuffer = drained.remaining;
    if (drained.lines.length > 0) {
      await appendOutputLines(sessionId, drained.lines, streamType, actor, projectRoot);
    }
  };

  child.stdout.on("data", async (chunk: Buffer) => {
    stdoutBuffer += chunk.toString("utf-8");
    await flushBuffer("stdout");
  });

  child.stderr.on("data", async (chunk: Buffer) => {
    stderrBuffer += chunk.toString("utf-8");
    await flushBuffer("stderr");
  });

  child.on("close", async (code, signal) => {
    const key = getProcessKey(sessionId, projectRoot);
    const processRef = activeProcesses.get(key);
    activeProcesses.delete(key);
    await flushBuffer("stdout", true);
    await flushBuffer("stderr", true);
    await appendEventBySessionId(
      sessionId,
      {
        eventType: "terminal.command.finished",
        streamType: "system",
        actor,
        payload: {
          code: code ?? 0,
          signal: signal ?? null,
          durationMs: Date.now() - startedAt,
          reason: processRef?.requestedClose ? "session_closed" : "completed",
        },
      },
      projectRoot
    );
  });

  child.on("error", async (error) => {
    const key = getProcessKey(sessionId, projectRoot);
    activeProcesses.delete(key);
    await appendEventBySessionId(
      sessionId,
      {
        eventType: "terminal.output.appended",
        streamType: "stderr",
        actor,
        payload: { content: error.message },
      },
      projectRoot
    );
    await appendEventBySessionId(
      sessionId,
      {
        eventType: "terminal.command.finished",
        streamType: "system",
        actor,
        payload: {
          code: 1,
          signal: null,
          durationMs: Date.now() - startedAt,
          reason: "spawn_error",
        },
      },
      projectRoot
    );
  });
}

export async function submitTerminalInput(
  sessionId: string,
  input: string,
  _actor: TerminalActor,
  projectRoot: string
) {
  const processRef = activeProcesses.get(getProcessKey(sessionId, projectRoot));
  if (!processRef) {
    throw new Error(`Terminal process is not active for session: ${sessionId}`);
  }
  const stdin = processRef.child.stdin;
  if (!stdin || stdin.destroyed || !stdin.writable) {
    throw new Error(`Terminal stdin is unavailable for session: ${sessionId}`);
  }

  const payload = input.endsWith("\n") ? input : `${input}\n`;
  await new Promise<void>((resolve, reject) => {
    stdin.write(payload, "utf-8", (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function closeTerminalSession(sessionId: string, projectRoot: string) {
  const child = markProcessClosing(sessionId, projectRoot);
  if (child && !child.killed) {
    child.kill("SIGTERM");
    const timeout = setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }, 2000);
    timeout.unref?.();
  }

  return markSessionClosed(sessionId, projectRoot);
}
