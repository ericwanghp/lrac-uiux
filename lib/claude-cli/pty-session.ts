import { execFileSync } from "child_process";
import pty from "node-pty";

export interface PtySpawnOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  cols?: number;
  rows?: number;
}

function resolveCommand(command: string): string {
  if (command.startsWith("/")) {
    return command;
  }

  try {
    return execFileSync("which", [command], { encoding: "utf-8" }).trim() || command;
  } catch {
    return command;
  }
}

export class PtySession {
  private process: pty.IPty;
  private interrupted = false;
  private exitCode: number | null = null;

  private constructor(process: pty.IPty) {
    this.process = process;
  }

  static spawn(options: PtySpawnOptions): PtySession {
    const proc = pty.spawn(resolveCommand(options.command), options.args, {
      name: "xterm-256color",
      cols: options.cols ?? 80,
      rows: options.rows ?? 24,
      cwd: options.cwd ?? process.cwd(),
      env: {
        ...process.env,
        ...options.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      } as Record<string, string>,
    });

    return new PtySession(proc);
  }

  get pid(): number {
    return this.process.pid;
  }

  get wasInterrupted(): boolean {
    return this.interrupted;
  }

  get latestExitCode(): number | null {
    return this.exitCode;
  }

  onData(callback: (data: Buffer) => void): void {
    this.process.onData((data: string) => {
      callback(Buffer.from(data, "utf-8"));
    });
  }

  onExit(callback: (code: number) => void): void {
    this.process.onExit(({ exitCode }) => {
      this.exitCode = exitCode;
      callback(exitCode);
    });
  }

  write(data: string | Buffer): void {
    try {
      this.process.write(typeof data === "string" ? data : data.toString("utf-8"));
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== "EIO" && code !== "EBADF") {
        throw error;
      }
    }
  }

  resize(cols: number, rows: number): void {
    try {
      this.process.resize(cols, rows);
    } catch {
      // Ignore resizes after process exit.
    }
  }

  kill(): void {
    this.interrupted = true;

    try {
      this.process.kill();
      if (process.platform !== "win32") {
        try {
          process.kill(-this.process.pid, "SIGTERM");
        } catch {
          // Ignore missing process groups.
        }
      }
    } catch {
      // Ignore duplicate kill attempts.
    }
  }
}
