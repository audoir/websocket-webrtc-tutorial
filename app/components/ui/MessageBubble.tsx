"use client";

import { Message } from "@/types/message";

interface MessageBubbleProps {
  msg: Message;
  /**
   * Tailwind colour classes applied to the sent-message bubble.
   * Defaults to blue (WebSocket style).
   * Pass e.g. "bg-violet-600 text-white rounded-br-sm" for WebRTC style.
   */
  sentBubbleClass?: string;
  /** Tailwind colour class for the sent-message timestamp text. */
  sentTimestampClass?: string;
}

/**
 * Renders a single chat message bubble, aligned right for sent messages
 * and left for received ones.
 */
export default function MessageBubble({
  msg,
  sentBubbleClass = "bg-blue-600 text-white rounded-br-sm",
  sentTimestampClass = "text-blue-200",
}: MessageBubbleProps) {
  return (
    <div className={`flex ${msg.isSent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
          msg.isSent
            ? sentBubbleClass
            : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-sm"
        }`}
      >
        <p>{msg.text}</p>
        <p
          className={`text-xs mt-1 ${
            msg.isSent
              ? sentTimestampClass
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
