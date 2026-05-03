import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "child_process";
import * as nodePty from "node-pty";

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
  private constructor(
    private process:
      | {
          pid: number;
          onData: (callback: (data: string) => void) => void;
          onExit: (callback: (event: { exitCode: number }) => void) => void;
          write: (data: string) => void;
          resize: (cols: number, rows: number) => void;
          kill: () => void;
        }
      | PythonWrappedSession
  ) {}
  private interrupted = false;
  private exitCode: number | null = null;

  static spawn(options: PtySpawnOptions): PtySession {
    const resolvedCommand = resolveCommand(options.command);
    const env = {
      ...process.env,
      ...options.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      COLUMNS: String(options.cols ?? 80),
      LINES: String(options.rows ?? 24),
    } as Record<string, string>;

    try {
      const proc = nodePty.spawn(resolvedCommand, options.args, {
        name: "xterm-256color",
        cols: options.cols ?? 80,
        rows: options.rows ?? 24,
        cwd: options.cwd ?? process.cwd(),
        env,
      });

      return new PtySession(proc);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("posix_spawnp failed")) {
        throw error;
      }

      return new PtySession(
        new PythonWrappedSession({
          command: resolvedCommand,
          args: options.args,
          cwd: options.cwd,
          env,
          cols: options.cols,
          rows: options.rows,
        })
      );
    }
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

const PYTHON_PTY_BRIDGE_CODE = String.raw`
import fcntl
import os
import pty
import select
import sys

command = sys.argv[1:]
if not command:
    print("Missing command", file=sys.stderr)
    sys.exit(1)

stdin_fd = sys.stdin.fileno()
stdout_fd = sys.stdout.fileno()

pid, fd = pty.fork()
if pid == 0:
    os.execvp(command[0], command)

flags = fcntl.fcntl(fd, fcntl.F_GETFL)
fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

stdin_open = True
exit_status = None

while True:
    read_fds = [fd]
    if stdin_open:
        read_fds.append(stdin_fd)

    ready, _, _ = select.select(read_fds, [], [], 0.05)

    if fd in ready:
        try:
            chunk = os.read(fd, 4096)
            if chunk:
                os.write(stdout_fd, chunk)
            else:
                break
        except OSError:
            break

    if stdin_open and stdin_fd in ready:
        try:
            incoming = os.read(stdin_fd, 4096)
        except OSError:
            incoming = b""

        if incoming:
            try:
                os.write(fd, incoming)
            except OSError:
                break
        else:
            stdin_open = False

    waited_pid, status = os.waitpid(pid, os.WNOHANG)
    if waited_pid == pid:
        exit_status = status
        break

if exit_status is None:
    _, exit_status = os.waitpid(pid, 0)

if os.WIFEXITED(exit_status):
    sys.exit(os.WEXITSTATUS(exit_status))

if os.WIFSIGNALED(exit_status):
    sys.exit(128 + os.WTERMSIG(exit_status))

sys.exit(1)
`;

class PythonWrappedSession {
  private child: ChildProcessWithoutNullStreams;
  private dataListeners = new Set<(data: string) => void>();
  private exitListeners = new Set<(event: { exitCode: number }) => void>();

  constructor(options: PtySpawnOptions) {
    this.child = spawn("python3", ["-u", "-c", PYTHON_PTY_BRIDGE_CODE, options.command, ...options.args], {
      cwd: options.cwd ?? process.cwd(),
      env: options.env as NodeJS.ProcessEnv,
      stdio: "pipe",
    });

    this.child.stdout.on("data", (chunk: Buffer) => {
      const data = chunk.toString("utf-8");
      for (const listener of this.dataListeners) {
        listener(data);
      }
    });

    this.child.stderr.on("data", (chunk: Buffer) => {
      const data = chunk.toString("utf-8");
      for (const listener of this.dataListeners) {
        listener(data);
      }
    });

    this.child.on("close", (exitCode) => {
      for (const listener of this.exitListeners) {
        listener({ exitCode: exitCode ?? 0 });
      }
    });
  }

  get pid(): number {
    return this.child.pid ?? -1;
  }

  onData(callback: (data: string) => void): void {
    this.dataListeners.add(callback);
  }

  onExit(callback: (event: { exitCode: number }) => void): void {
    this.exitListeners.add(callback);
  }

  write(data: string): void {
    this.child.stdin.write(data);
  }

  resize(_cols: number, _rows: number): void {
    // `script` allocates its own PTY. Resizing is best-effort only, so ignore for fallback mode.
  }

  kill(): void {
    this.child.kill("SIGTERM");
  }
}
