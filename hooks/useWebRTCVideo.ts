"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { ConnectionStatus, ICE_SERVERS } from "@/lib/webrtc";

export function useWebRTCVideo(
  room: string,
  localVideoRef: React.RefObject<HTMLVideoElement | null>,
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("idle");

  // ── helpers ────────────────────────────────────────────────────────────────

  const createPC = useCallback(
    (socket: Socket, localStream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local tracks to the peer connection so they are sent to the remote peer
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Send ICE candidates to the other peer via signaling server
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc-video:ice-candidate", e.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC Video] Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setStatus("connected");
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          setStatus("disconnected");
        }
      };

      // Receive remote video/audio tracks and attach to the remote video element
      pc.ontrack = (e) => {
        console.log("[WebRTC Video] Received remote track");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      return pc;
    },
    [remoteVideoRef]
  );

  // ── main effect ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!room) return;

    let cancelled = false;

    const init = async () => {
      // Request camera + microphone access
      let localStream: MediaStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (err) {
        console.error("[WebRTC Video] Could not get user media:", err);
        setStatus("error");
        return;
      }

      if (cancelled) {
        localStream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = localStream;

      // Show local video preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      const socket = io();
      socketRef.current = socket;

      // ── signaling events ──────────────────────────────────────────────────
      socket.on("connect", () => {
        console.log("[WebRTC Video] Socket connected, joining room:", room);
        socket.emit("webrtc-video:join", room);
      });

      socket.on("webrtc-video:waiting", () => {
        console.log("[WebRTC Video] Waiting for peer…");
        setStatus("waiting");
      });

      socket.on(
        "webrtc-video:ready",
        async ({ initiator }: { initiator: boolean }) => {
          console.log("[WebRTC Video] Ready, initiator:", initiator);
          setStatus("connecting");

          const pc = createPC(socket, localStream);

          if (initiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("webrtc-video:offer", pc.localDescription);
          }
        }
      );

      socket.on(
        "webrtc-video:offer",
        async (offer: RTCSessionDescriptionInit) => {
          console.log("[WebRTC Video] Received offer");
          const pc = pcRef.current!;
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc-video:answer", pc.localDescription);
        }
      );

      socket.on(
        "webrtc-video:answer",
        async (answer: RTCSessionDescriptionInit) => {
          console.log("[WebRTC Video] Received answer");
          const pc = pcRef.current!;
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      );

      // Receive ICE candidates from the other peer
      socket.on(
        "webrtc-video:ice-candidate",
        async (candidate: RTCIceCandidateInit) => {
          try {
            const pc = pcRef.current;
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          } catch (err) {
            console.error("[WebRTC Video] Error adding ICE candidate:", err);
          }
        }
      );

      socket.on("webrtc-video:room-full", () => {
        console.warn("[WebRTC Video] Room is full");
        setStatus("room-full");
      });

      socket.on("webrtc-video:peer-disconnected", () => {
        console.log("[WebRTC Video] Peer disconnected");
        setStatus("disconnected");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        pcRef.current?.close();
        pcRef.current = null;
      });
    };

    init();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      socketRef.current?.disconnect();
    };
  }, [room, createPC, localVideoRef, remoteVideoRef]);

  return { status };
}
