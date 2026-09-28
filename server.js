const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer } = require("ws");

const isDev = process.argv.includes("--dev") || process.env.NODE_ENV === "development";
process.env.NODE_ENV = isDev ? "development" : (process.env.NODE_ENV || "production");

const dev = isDev;
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "5000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  globalThis.__vibes_wss = wss;

  // Handle client connections
  wss.on("connection", (ws, req) => {
    // Add to global client set
    if (!globalThis.__vibes_ws_clients) {
      globalThis.__vibes_ws_clients = new Set();
    }
    const clients = globalThis.__vibes_ws_clients;
    clients.add(ws);

    // Send active downloads state if available
    if (globalThis.__vibes_downloads) {
      const active = Array.from(globalThis.__vibes_downloads.values()).filter(
        (d) => d.status === "pending" || d.status === "downloading" || d.status === "transcoding"
      );
      try {
        ws.send(JSON.stringify({ type: "sync", data: { downloads: active } }));
      } catch {}
    }

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", () => {
      clients.delete(ws);
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch {}
    });
  });

  // Handle upgrade events for both custom WebSockets and Next.js HMR
  const nextUpgrade = typeof app.getUpgradeHandler === "function" ? app.getUpgradeHandler() : null;

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url || "");

    if (pathname === "/api/ws" || pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else if (nextUpgrade) {
      nextUpgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  // Heartbeat interval to keep connections alive
  setInterval(() => {
    if (!globalThis.__vibes_ws_clients) return;
    for (const ws of globalThis.__vibes_ws_clients) {
      if (ws.readyState === 1 /* OPEN */) {
        try {
          ws.ping();
        } catch {
          globalThis.__vibes_ws_clients.delete(ws);
        }
      }
    }
  }, 30000);

  server.listen(port, hostname, () => {
    console.log(`\n========================================`);
    console.log(`  🎵 Vibes Music Player Server Running!`);
    console.log(`  HTTP:      http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
    console.log(`  WebSocket: ws://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}/api/ws`);
    console.log(`========================================\n`);
  });
});
