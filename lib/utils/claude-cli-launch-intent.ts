export interface ClaudeCliLaunchIntentOptions {
  defaultPrompt?: string;
  continueWithRecentContext?: boolean;
  dangerouslySkipPermissions?: boolean;
}

export interface ClaudeCliLaunchIntent {
  projectRoot?: string | null;
  activePanel?: "current" | "projects" | "session";
  autoStart?: boolean;
  launchOptions?: ClaudeCliLaunchIntentOptions;
}

export const CLAUDE_CLI_LAUNCH_INTENT_EVENT = "lrac:claude-cli-launch-intent";
const CLAUDE_CLI_LAUNCH_INTENT_STORAGE_KEY = "lrac-uiux:claude-cli-launch-intent";

export function queueClaudeCliLaunchIntent(intent: ClaudeCliLaunchIntent) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(intent);
  window.localStorage.setItem(CLAUDE_CLI_LAUNCH_INTENT_STORAGE_KEY, serialized);
  window.dispatchEvent(
    new CustomEvent<ClaudeCliLaunchIntent>(CLAUDE_CLI_LAUNCH_INTENT_EVENT, {
      detail: intent,
    })
  );
}

export function consumeClaudeCliLaunchIntent(): ClaudeCliLaunchIntent | null {
  if (typeof window === "undefined") {
    return null;
  }

  const serialized = window.localStorage.getItem(CLAUDE_CLI_LAUNCH_INTENT_STORAGE_KEY);
  if (!serialized) {
    return null;
  }

  window.localStorage.removeItem(CLAUDE_CLI_LAUNCH_INTENT_STORAGE_KEY);

  try {
    return JSON.parse(serialized) as ClaudeCliLaunchIntent;
  } catch {
    return null;
  }
}
