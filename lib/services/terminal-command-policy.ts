import path from "path";

const SAFE_EXECUTABLES = new Set([
  "claude",
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "git",
  "node",
  "python",
  "python3",
  "uv",
  "next",
  "vitest",
  "playwright",
  "ls",
  "pwd",
  "cat",
  "echo",
  "rg",
  "find",
  "grep",
  "sed",
  "awk",
  "curl",
  "touch",
  "mkdir",
  "cp",
]);

const BLOCKED_EXECUTABLES = new Set([
  "sudo",
  "su",
  "bash",
  "sh",
  "zsh",
  "fish",
  "rm",
  "rmdir",
  "dd",
  "mkfs",
  "shutdown",
  "reboot",
  "halt",
  "poweroff",
  "kill",
  "killall",
  "pkill",
  "chmod",
  "chown",
]);

const BLOCKED_FLAGS_BY_EXECUTABLE = new Map<string, Set<string>>([
  ["node", new Set(["-e", "--eval"])],
  ["python", new Set(["-c"])],
  ["python3", new Set(["-c"])],
]);

function allowUnsafeTerminalCommands(): boolean {
  const value = process.env.LRAC_ALLOW_UNSAFE_TERMINAL_COMMANDS?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function terminalCommandsEnabled(): boolean {
  const configured = process.env.LRAC_ENABLE_TERMINAL_COMMANDS?.trim().toLowerCase();
  if (!configured) {
    return process.env.NODE_ENV !== "production";
  }
  return !["0", "false", "no", "off"].includes(configured);
}

export function tokenizeTerminalCommand(input: string): string[] {
  const source = input.trim();
  if (!source) {
    throw new Error("Command is required");
  }

  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaping = false;

  for (const char of source) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escaping) {
    current += "\\";
  }

  if (quote) {
    throw new Error("Command contains an unterminated quote");
  }

  if (current) {
    tokens.push(current);
  }

  if (tokens.length === 0) {
    throw new Error("Command is required");
  }

  return tokens;
}

export type ValidatedTerminalCommand = {
  executable: string;
  executableName: string;
  args: string[];
  displayCommand: string;
};

function validateGitArguments(args: string[]) {
  const joined = args.join(" ");
  if (/\bclean\b/.test(joined)) {
    throw new Error("`git clean` is blocked in terminal sessions");
  }
  if (/\breset\b/.test(joined) && /\s--hard(\s|$)/.test(` ${joined} `)) {
    throw new Error("`git reset --hard` is blocked in terminal sessions");
  }
}

export function validateTerminalCommand(input: string): ValidatedTerminalCommand {
  const tokens = tokenizeTerminalCommand(input);
  const [rawExecutable, ...args] = tokens;

  if (!rawExecutable) {
    throw new Error("Command is required");
  }

  const executableName = path.basename(rawExecutable).toLowerCase();
  if (BLOCKED_EXECUTABLES.has(executableName)) {
    throw new Error(`Executable \`${executableName}\` is blocked in terminal sessions`);
  }

  if (!allowUnsafeTerminalCommands() && !SAFE_EXECUTABLES.has(executableName)) {
    throw new Error(
      `Executable \`${executableName}\` is not allowlisted. Set LRAC_ALLOW_UNSAFE_TERMINAL_COMMANDS=true to override locally.`
    );
  }

  const blockedFlags = BLOCKED_FLAGS_BY_EXECUTABLE.get(executableName);
  if (blockedFlags) {
    const offending = args.find((arg) => blockedFlags.has(arg));
    if (offending) {
      throw new Error(`Flag \`${offending}\` is blocked for \`${executableName}\``);
    }
  }

  if (executableName === "git") {
    validateGitArguments(args);
  }

  return {
    executable: rawExecutable,
    executableName,
    args,
    displayCommand: [rawExecutable, ...args].join(" "),
  };
}
