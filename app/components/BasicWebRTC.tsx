"use client";

import { useState } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { WEBRTC_STATUS_LABELS, WEBRTC_STATUS_COLORS } from "@/lib/webrtc";
import StatusIndicator from "./ui/StatusIndicator";
import MessageList from "./ui/MessageList";
import ChatInput from "./ui/ChatInput";
import RoomPicker from "./ui/RoomPicker";

export default function BasicWebRTC() {
  const [roomInput, setRoomInput] = useState("");
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  const { status, messages, sendMessage } = useWebRTC(activeRoom ?? "");

  const [input, setInput] = useState("");

  const handleJoin = () => {
    const r = roomInput.trim();
    if (r) setActiveRoom(r);
  };

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  // ── Room picker ────────────────────────────────────────────────────────────
  if (!activeRoom) {
    return (
      <RoomPicker
        roomInput={roomInput}
        onRoomInputChange={setRoomInput}
        onJoin={handleJoin}
        description="Enter a room name to join. Share the same room name with another browser tab to connect peer-to-peer."
        placeholder="e.g. my-room-123"
        buttonColorClass="bg-violet-600 hover:bg-violet-700"
        focusRingClass="focus:ring-violet-500"
      />
    );
  }

  // ── Chat UI ────────────────────────────────────────────────────────────────
  const emptyText =
    status === "waiting"
      ? "Open this page in another tab, enter the same room name, and start chatting!"
      : status === "connected"
      ? "No messages yet. Say hello!"
      : WEBRTC_STATUS_LABELS[status];

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <StatusIndicator
        colorClass={WEBRTC_STATUS_COLORS[status] ?? "bg-zinc-400"}
        label={WEBRTC_STATUS_LABELS[status] ?? status}
        trailing={`room: ${activeRoom}`}
      />

      {/* Messages */}
      <MessageList
        messages={messages}
        emptyText={emptyText}
        sentBubbleClass="bg-violet-600 text-white rounded-br-sm"
        sentTimestampClass="text-violet-200"
      />

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={status !== "connected"}
        placeholder={
          status === "connected" ? "Type a message…" : "Waiting for peer…"
        }
        buttonColorClass="bg-violet-600 hover:bg-violet-700"
        focusRingClass="focus:ring-violet-500 dark:focus:ring-violet-400"
      />
    </div>
  );
}
