import fs from "fs/promises";
import path from "path";
import type {
  TerminalActor,
  TerminalEvent,
  TerminalEventPayload,
  TerminalEventType,
  TerminalSession,
  TerminalSessionType,
  TerminalSessionsJson,
  TerminalStreamType,
} from "@/lib/types/terminal";
import { PROJECT_ROOT, getCurrentProjectRoot } from "@/lib/utils/file-operations";

async function getTerminalSessionsDir(projectRoot?: string | null): Promise<string> {
  return path.join(await getCurrentProjectRoot(projectRoot), ".auto-coding", "terminal-sessions");
}

async function getTerminalSessionsFile(projectRoot?: string | null): Promise<string> {
  return path.join(await getTerminalSessionsDir(projectRoot), "sessions.json");
}
export const TERMINAL_SESSIONS_DIR = path.join(PROJECT_ROOT, ".auto-coding", "terminal-sessions");
export const TERMINAL_SESSIONS_FILE = path.join(PROJECT_ROOT, ".auto-coding", "terminal-sessions", "sessions.json");
let mutationQueue: Promise<unknown> = Promise.resolve();

export async function initializeTerminalSessions(projectRoot?: string | null): Promise<void> {
  const terminalSessionsDir = await getTerminalSessionsDir(projectRoot);
  await fs.mkdir(terminalSessionsDir, { recursive: true });
  const data: TerminalSessionsJson = {
    version: "1.0",
    sessions: [],
  };
  await writeTerminalSessionsFile(data, projectRoot);
}

export async function readTerminalSessionsFile(
  projectRoot?: string | null
): Promise<TerminalSessionsJson> {
  const terminalSessionsFile = await getTerminalSessionsFile(projectRoot);
  try {
    await fs.access(terminalSessionsFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await initializeTerminalSessions(projectRoot);
      return { version: "1.0", sessions: [] };
    }
    throw error;
  }
  const content = await fs.readFile(terminalSessionsFile, "utf-8");
  return JSON.parse(content) as TerminalSessionsJson;
}

export async function writeTerminalSessionsFile(
  data: TerminalSessionsJson,
  projectRoot?: string | null
): Promise<void> {
  const terminalSessionsDir = await getTerminalSessionsDir(projectRoot);
  const terminalSessionsFile = await getTerminalSessionsFile(projectRoot);
  await fs.mkdir(terminalSessionsDir, { recursive: true });
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(terminalSessionsFile, content, "utf-8");
}

export function generateTerminalSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `ts-${timestamp}-${random}`;
}

export function generateTerminalEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `te-${timestamp}-${random}`;
}

export function createTerminalSession(input: {
  sessionType: TerminalSessionType;
  featureId?: string | null;
  parentSessionId?: string | null;
}): TerminalSession {
  const now = new Date().toISOString();
  return {
    id: generateTerminalSessionId(),
    parentSessionId: input.parentSessionId ?? null,
    sessionType: input.sessionType,
    featureId: input.featureId ?? null,
    status: "active",
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    nextSeqNo: 1,
    events: [],
  };
}

export function appendEventToSession(
  session: TerminalSession,
  input: {
    eventType: TerminalEventType;
    streamType?: TerminalStreamType;
    actor?: TerminalActor;
    payload?: TerminalEventPayload;
    timestamp?: string;
  }
): TerminalEvent {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const event: TerminalEvent = {
    id: generateTerminalEventId(),
    sessionId: session.id,
    seqNo: session.nextSeqNo,
    eventType: input.eventType,
    streamType: input.streamType ?? "system",
    timestamp,
    actor: input.actor ?? { type: "system", id: "api" },
    payload: input.payload ?? {},
  };
  session.events.push(event);
  session.nextSeqNo += 1;
  session.updatedAt = timestamp;
  return event;
}

export async function mutateTerminalSessions<T>(
  mutator: (data: TerminalSessionsJson) => Promise<T> | T,
  projectRoot?: string | null
): Promise<T> {
  const runMutation = async () => {
    const sessionsData = await readTerminalSessionsFile(projectRoot);
    const result = await mutator(sessionsData);
    await writeTerminalSessionsFile(sessionsData, projectRoot);
    return result;
  };
  const resultPromise = mutationQueue.then(runMutation, runMutation) as Promise<T>;
  mutationQueue = resultPromise.then(
    () => undefined,
    () => undefined
  );
  return resultPromise;
}

export async function appendEventBySessionId(
  sessionId: string,
  input: {
    eventType: TerminalEventType;
    streamType?: TerminalStreamType;
    actor?: TerminalActor;
    payload?: TerminalEventPayload;
    timestamp?: string;
  },
  projectRoot?: string | null
): Promise<{ session: TerminalSession; event: TerminalEvent }> {
  return mutateTerminalSessions(async (sessionsData) => {
    const session = sessionsData.sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new Error(`Terminal session not found: ${sessionId}`);
    }
    const event = appendEventToSession(session, input);
    return { session, event };
  }, projectRoot);
}
