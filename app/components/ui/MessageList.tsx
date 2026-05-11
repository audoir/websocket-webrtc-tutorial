"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/types/message";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  /** Shown when the list is empty. */
  emptyText?: string;
  /** Forwarded to MessageBubble – Tailwind classes for the sent bubble. */
  sentBubbleClass?: string;
  /** Forwarded to MessageBubble – Tailwind class for the sent timestamp. */
  sentTimestampClass?: string;
}

/**
 * Scrollable message list with auto-scroll-to-bottom behaviour.
 * Renders a placeholder when there are no messages yet.
 */
export default function MessageList({
  messages,
  emptyText = "No messages yet.",
  sentBubbleClass,
  sentTimestampClass,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-3 min-h-0">
      {messages.length === 0 && (
        <p className="text-center text-zinc-400 dark:text-zinc-600 text-sm mt-8">
          {emptyText}
        </p>
      )}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          sentBubbleClass={sentBubbleClass}
          sentTimestampClass={sentTimestampClass}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
