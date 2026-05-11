"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@/types/message";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("chat message", (msg: string, senderId: string) => {
      // Ignore messages that were sent by this client (already added optimistically)
      if (senderId === socket.id) return;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: msg,
          timestamp: new Date(),
          isSent: false,
        },
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = (text: string) => {
    if (socketRef.current && text.trim()) {
      socketRef.current.emit("chat message", text);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text,
          timestamp: new Date(),
          isSent: true,
        },
      ]);
    }
  };

  return { isConnected, messages, sendMessage };
}
