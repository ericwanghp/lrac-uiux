import http from "http";
import { ClaudeCliSessionManager } from "@/lib/claude-cli/session-manager";
import { ClaudeCliWsBridge } from "@/lib/claude-cli/ws-bridge";

type ClaudeCliServerInstance = {
  port: number;
  httpServer: http.Server;
  manager: ClaudeCliSessionManager;
  bridge: ClaudeCliWsBridge;
  wsBaseUrl: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __lracClaudeCliServerPromise: Promise<ClaudeCliServerInstance> | undefined;
  // eslint-disable-next-line no-var
  var __lracClaudeCliServerInstance: ClaudeCliServerInstance | undefined;
}

function getPreferredPort(): number {
  const rawPort = process.env.LRAC_CLAUDE_CLI_PORT || process.env.NEXT_PUBLIC_CLAUDE_CLI_PORT;
  const parsed = Number(rawPort);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4031;
}

function buildCandidatePorts(): number[] {
  const preferred = getPreferredPort();
  return Array.from({ length: 10 }, (_, index) => preferred + index);
}

async function listen(server: http.Server, port: number, host: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const handleError = (error: NodeJS.ErrnoException) => {
      server.off("listening", handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off("error", handleError);
      resolve();
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port, host);
  });
}

async function createServerInstance(): Promise<ClaudeCliServerInstance> {
  const manager = new ClaudeCliSessionManager();
  const bridge = new ClaudeCliWsBridge(manager);

  for (const port of buildCandidatePorts()) {
    const httpServer = http.createServer((request, response) => {
      const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      response.statusCode = pathname === "/health" ? 200 : 404;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ ok: pathname === "/health", port }));
    });

    httpServer.on("upgrade", (request, socket, head) => {
      const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      bridge.handleUpgrade(pathname, request, socket, head);
    });

    try {
      await listen(httpServer, port, "127.0.0.1");
      return {
        port,
        httpServer,
        manager,
        bridge,
        wsBaseUrl: `ws://127.0.0.1:${port}`,
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      httpServer.close();
      if (code === "EADDRINUSE") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("No available port found for Claude Code terminal server");
}

export async function ensureClaudeCliServer(): Promise<ClaudeCliServerInstance> {
  if (global.__lracClaudeCliServerInstance) {
    return global.__lracClaudeCliServerInstance;
  }

  if (!global.__lracClaudeCliServerPromise) {
    global.__lracClaudeCliServerPromise = createServerInstance()
      .then((instance) => {
        global.__lracClaudeCliServerInstance = instance;
        return instance;
      })
      .catch((error) => {
        global.__lracClaudeCliServerPromise = undefined;
        throw error;
      });
  }

  return global.__lracClaudeCliServerPromise;
}

export async function getClaudeCliSessionManager(): Promise<ClaudeCliSessionManager> {
  const server = await ensureClaudeCliServer();
  return server.manager;
}
