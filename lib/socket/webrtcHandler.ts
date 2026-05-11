import type { Server, Socket } from "socket.io";

export function registerWebRTCHandlers(io: Server, socket: Socket) {
  // ── WebRTC Signaling ──────────────────────────────────────────────────────
  // Clients join a named "room" so only the two peers in that room exchange
  // signaling messages.  We keep it simple: the first joiner waits, the
  // second triggers the offer/answer dance.

  socket.on("webrtc:join", (room: string) => {
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const numClients = roomSockets ? roomSockets.size : 0;

    if (numClients >= 2) {
      // Room is full – tell the requester
      socket.emit("webrtc:room-full", room);
      console.log(`[WebRTC] Room ${room} is full`);
      return;
    }

    socket.join(room);
    console.log(
      `[WebRTC] ${socket.id} joined room ${room} (${numClients + 1}/2)`
    );

    if (numClients === 1) {
      // Second peer joined – tell both sides to start negotiation
      // The joining peer becomes the "initiator" (will create the offer)
      socket.emit("webrtc:ready", { initiator: true });
      socket.to(room).emit("webrtc:ready", { initiator: false });
    } else {
      // First peer – just wait
      socket.emit("webrtc:waiting");
    }

    // Relay signaling messages to the other peer in the room
    socket.on("webrtc:offer", (offer: RTCSessionDescriptionInit) => {
      console.log(`[WebRTC] Offer from ${socket.id} in room ${room}`);
      socket.to(room).emit("webrtc:offer", offer);
    });

    socket.on("webrtc:answer", (answer: RTCSessionDescriptionInit) => {
      console.log(`[WebRTC] Answer from ${socket.id} in room ${room}`);
      socket.to(room).emit("webrtc:answer", answer);
    });

    socket.on("webrtc:ice-candidate", (candidate: RTCIceCandidateInit) => {
      socket.to(room).emit("webrtc:ice-candidate", candidate);
    });

    socket.on("disconnect", () => {
      socket.to(room).emit("webrtc:peer-disconnected");
    });
  });
  // ─────────────────────────────────────────────────────────────────────────
}
