import type {
  TerminalActor,
  TerminalEvent,
  TerminalEventPayload,
  TerminalEventType,
  TerminalSession,
  TerminalSessionsJson,
  TerminalSessionStatus,
  TerminalSessionType,
  TerminalStreamType,
} from "./terminal";

export type ActivityFeedStatus = TerminalSessionStatus;
export type ActivityFeedType = TerminalSessionType;
export type ActivityEventType = TerminalEventType;
export type ActivityStreamType = TerminalStreamType;

export type ActivityActor = TerminalActor;
export type ActivityEventPayload = TerminalEventPayload;
export type ActivityEvent = TerminalEvent;
export type ActivityFeed = TerminalSession;
export type ActivityFeedsJson = TerminalSessionsJson;
