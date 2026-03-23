import {
  appendEventBySessionId,
  appendEventToSession,
  createTerminalSession,
  generateTerminalEventId,
  generateTerminalSessionId,
  initializeTerminalSessions,
  mutateTerminalSessions,
  readTerminalSessionsFile,
  TERMINAL_SESSIONS_DIR,
  TERMINAL_SESSIONS_FILE,
  writeTerminalSessionsFile,
} from "@/lib/utils/terminal-session-operations";

export const ACTIVITY_FEEDS_DIR = TERMINAL_SESSIONS_DIR;
export const ACTIVITY_FEEDS_FILE = TERMINAL_SESSIONS_FILE;

export const initializeActivityFeeds = initializeTerminalSessions;
export const readActivityFeedsFile = readTerminalSessionsFile;
export const writeActivityFeedsFile = writeTerminalSessionsFile;
export const mutateActivityFeeds = mutateTerminalSessions;

export const generateActivityFeedId = generateTerminalSessionId;
export const generateActivityEventId = generateTerminalEventId;
export const createActivityFeed = createTerminalSession;
export const appendEventToActivityFeed = appendEventToSession;
export const appendEventByFeedId = appendEventBySessionId;
