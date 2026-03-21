const path = require("path");
const chokidar = require("chokidar");
const { WebSocketServer, WebSocket } = require("ws");

const port = Number(process.env.WS_PORT || process.env.NEXT_PUBLIC_WS_PORT || 3003);
const projectRoot = process.cwd();
const watchPaths = [path.join(projectRoot, ".auto-coding"), path.join(projectRoot, "docs")];

const wss = new WebSocketServer({ port });
const clients = new Set();

wss.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    verifyExistingServer(port)
      .then(() => {
        console.log(`[ws-server] verified existing WebSocket server on port ${port}`);
        process.exit(0);
      })
      .catch((verificationError) => {
        console.error(
          `[ws-server] port ${port} is occupied by a non-compatible service: ${verificationError.message}`
        );
        process.exit(1);
      });
    return;
  }
  console.error("[ws-server] startup error:", error);
  process.exit(1);
});

function verifyExistingServer(targetPort) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${targetPort}`);
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error("timed out while probing existing server"));
    }, 2000);

    function cleanup() {
      clearTimeout(timer);
    }

    socket.on("open", () => {
      cleanup();
      socket.close();
      resolve();
    });

    socket.on("unexpected-response", (_request, response) => {
      cleanup();
      reject(new Error(`unexpected HTTP ${response.statusCode || "response"}`));
    });

    socket.on("error", (probeError) => {
      cleanup();
      reject(probeError);
    });
  });
}

function send(socket, type, payload) {
  if (socket.readyState !== socket.OPEN) {
    return;
  }
  socket.send(
    JSON.stringify({
      type,
      payload,
      timestamp: new Date().toISOString(),
    })
  );
}

function broadcast(type, payload) {
  for (const client of clients) {
    send(client, type, payload);
  }
}

wss.on("connection", (socket) => {
  clients.add(socket);
  send(socket, "connected", {
    clientId: `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    serverVersion: "1.0.0",
  });

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(String(raw));
      if (message?.type === "ping") {
        send(socket, "pong", { timestamp: Date.now() });
      }
    } catch {}
  });

  socket.on("close", () => {
    clients.delete(socket);
  });

  socket.on("error", () => {
    clients.delete(socket);
  });
});

const watcher = chokidar.watch(watchPaths, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50,
  },
});

function toRelativePath(filePath) {
  const normalizedRoot = `${projectRoot}${path.sep}`;
  return filePath.startsWith(normalizedRoot) ? filePath.slice(normalizedRoot.length) : filePath;
}

function handleFile(event, filePath) {
  const relativePath = toRelativePath(filePath);
  const payload = { path: relativePath, event };
  broadcast("file_changed", payload);
  if (relativePath.includes("tasks.json")) {
    broadcast("task_updated", payload);
  }
  if (relativePath.includes("phase-manifest.json")) {
    broadcast("phase_changed", payload);
  }
}

watcher.on("add", (filePath) => handleFile("add", filePath));
watcher.on("change", (filePath) => handleFile("change", filePath));
watcher.on("unlink", (filePath) => handleFile("unlink", filePath));

watcher.on("error", (error) => {
  console.error("[ws-server] watcher error:", error);
});

wss.on("listening", () => {
  console.log(`[ws-server] listening on ws://localhost:${port}`);
  console.log(`[ws-server] watching: ${watchPaths.join(", ")}`);
});

function shutdown() {
  watcher.close().finally(() => {
    wss.close(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
