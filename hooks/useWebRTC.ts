"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/types/message";
import { ConnectionStatus, ICE_SERVERS } from "@/lib/webrtc";

export function useWebRTC(room: string) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);

  // ── helpers ────────────────────────────────────────────────────────────────

  const addMessage = useCallback((text: string, isSent: boolean) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, timestamp: new Date(), isSent },
    ]);
  }, []);

  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dataChannelRef.current = channel;

      channel.onopen = () => {
        console.log("[WebRTC] Data channel open");
        setStatus("connected");
      };

      channel.onclose = () => {
        console.log("[WebRTC] Data channel closed");
        setStatus("disconnected");
      };

      channel.onmessage = (e: MessageEvent<string>) => {
        addMessage(e.data, false);
      };
    },
    [addMessage]
  );

  // ── main effect ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!room) return;

    const socket = io();
    socketRef.current = socket;

    // ── create peer connection ──────────────────────────────────────────────
    const createPC = () => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Send ICE candidates to the other peer via signaling server
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("webrtc:ice-candidate", e.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state:", pc.connectionState);
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          setStatus("disconnected");
        }
      };

      // Answerer receives the data channel via this event
      pc.ondatachannel = (e) => {
        setupDataChannel(e.channel);
      };

      return pc;
    };

    // ── signaling events ────────────────────────────────────────────────────
    socket.on("connect", () => {
      console.log("[WebRTC] Socket connected, joining room:", room);
      socket.emit("webrtc:join", room);
    });

    socket.on("webrtc:waiting", () => {
      console.log("[WebRTC] Waiting for peer…");
      setStatus("waiting");
    });

    socket.on("webrtc:ready", async ({ initiator }: { initiator: boolean }) => {
      console.log("[WebRTC] Ready, initiator:", initiator);
      setStatus("connecting");

      const pc = createPC();

      if (initiator) {
        // Create data channel before offer so it's included in the SDP
        const channel = pc.createDataChannel("chat");
        setupDataChannel(channel);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", pc.localDescription);
      }
    });

    socket.on("webrtc:offer", async (offer: RTCSessionDescriptionInit) => {
      console.log("[WebRTC] Received offer");
      const pc = pcRef.current!;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", pc.localDescription);
    });

    socket.on("webrtc:answer", async (answer: RTCSessionDescriptionInit) => {
      console.log("[WebRTC] Received answer");
      const pc = pcRef.current!;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Receive ICE candidates from the other peer and add them to establish connectivity
    socket.on("webrtc:ice-candidate", async (candidate: RTCIceCandidateInit) => {
      try {
        const pc = pcRef.current;
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("[WebRTC] Error adding ICE candidate:", err);
      }
    });

    socket.on("webrtc:room-full", () => {
      console.warn("[WebRTC] Room is full");
      setStatus("room-full");
    });

    socket.on("webrtc:peer-disconnected", () => {
      console.log("[WebRTC] Peer disconnected");
      setStatus("disconnected");
      dataChannelRef.current?.close();
      pcRef.current?.close();
      pcRef.current = null;
      dataChannelRef.current = null;
    });

    return () => {
      dataChannelRef.current?.close();
      pcRef.current?.close();
      socket.disconnect();
    };
  }, [room, setupDataChannel]);

  // ── send message ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    (text: string) => {
      const channel = dataChannelRef.current;
      if (channel && channel.readyState === "open" && text.trim()) {
        channel.send(text);
        addMessage(text, true);
      }
    },
    [addMessage]
  );

  return { status, messages, sendMessage };
}
