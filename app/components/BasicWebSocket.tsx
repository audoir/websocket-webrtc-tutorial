"use client";

import { useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import StatusIndicator from "./ui/StatusIndicator";
import MessageList from "./ui/MessageList";
import ChatInput from "./ui/ChatInput";

export default function BasicWebSocket() {
  const { isConnected, messages, sendMessage } = useSocket();
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <StatusIndicator
        colorClass={isConnected ? "bg-green-500" : "bg-red-500"}
        label={isConnected ? "Connected" : "Disconnected"}
      />

      {/* Messages */}
      <MessageList
        messages={messages}
        emptyText="No messages yet. Open another tab and start chatting!"
      />

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={!isConnected}
        placeholder="Type a message..."
      />
    </div>
  );
}
