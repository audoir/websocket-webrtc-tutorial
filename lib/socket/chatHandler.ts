import type { Server, Socket } from "socket.io";

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on("chat message", (msg: string) => {
    console.log(`[WebSocket] Message received: ${msg}`);
    // Broadcast to all clients, passing the sender's socket id so clients can filter their own messages
    io.emit("chat message", msg, socket.id);
  });
}
