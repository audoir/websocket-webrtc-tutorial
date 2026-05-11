import type { Server, Socket } from "socket.io";

export function registerWebRTCVideoHandlers(io: Server, socket: Socket) {
  // ── WebRTC Video Signaling ─────────────────────────────────────────────────
  // Clients join a named "room" so only the two peers in that room exchange
  // signaling messages. The first joiner waits; the second triggers the
  // offer/answer dance. Media tracks (video/audio) are sent directly P2P.

  socket.on("webrtc-video:join", (room: string) => {
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const numClients = roomSockets ? roomSockets.size : 0;

    if (numClients >= 2) {
      socket.emit("webrtc-video:room-full", room);
      console.log(`[WebRTC Video] Room ${room} is full`);
      return;
    }

    socket.join(room);
    console.log(
      `[WebRTC Video] ${socket.id} joined room ${room} (${numClients + 1}/2)`
    );

    if (numClients === 1) {
      // Second peer joined – tell both sides to start negotiation
      // The joining peer becomes the "initiator" (will create the offer)
      socket.emit("webrtc-video:ready", { initiator: true });
      socket.to(room).emit("webrtc-video:ready", { initiator: false });
    } else {
      // First peer – just wait
      socket.emit("webrtc-video:waiting");
    }

    // Relay signaling messages to the other peer in the room
    socket.on("webrtc-video:offer", (offer: RTCSessionDescriptionInit) => {
      console.log(`[WebRTC Video] Offer from ${socket.id} in room ${room}`);
      socket.to(room).emit("webrtc-video:offer", offer);
    });

    socket.on("webrtc-video:answer", (answer: RTCSessionDescriptionInit) => {
      console.log(`[WebRTC Video] Answer from ${socket.id} in room ${room}`);
      socket.to(room).emit("webrtc-video:answer", answer);
    });

    socket.on(
      "webrtc-video:ice-candidate",
      (candidate: RTCIceCandidateInit) => {
        socket.to(room).emit("webrtc-video:ice-candidate", candidate);
      }
    );

    socket.on("disconnect", () => {
      socket.to(room).emit("webrtc-video:peer-disconnected");
    });
  });
  // ─────────────────────────────────────────────────────────────────────────
}
