import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { registerChatHandlers } from "./lib/socket/chatHandler";
import { registerWebRTCHandlers } from "./lib/socket/webrtcHandler";
import { registerWebRTCVideoHandlers } from "./lib/socket/webrtcVideoHandler";
import { registerServerTranscriptionHandlers } from "./lib/socket/serverTranscriptionHandler";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    registerChatHandlers(io, socket);
    registerWebRTCHandlers(io, socket);
    registerWebRTCVideoHandlers(io, socket);
    registerServerTranscriptionHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
