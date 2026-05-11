"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TranscriptionStatus } from "@/lib/webrtc";

/**
 * Shared transcription state and event-handling logic used by both
 * WebSocketTranscription and WebRTCTranscription.
 *
 * Returns:
 *  - transcript / setTranscript  – the live transcript string
 *  - status / setStatus          – connection status
 *  - errorMsg / setErrorMsg      – last error message (or null)
 *  - committedLengthRef          – length of transcript before the current turn
 *  - currentItemIdRef            – item_id of the in-progress speech turn
 *  - bottomRef                   – ref to attach to a sentinel div for auto-scroll
 *  - handleEvent                 – parses a raw JSON event string and updates state
 *  - clearTranscript             – resets transcript + tracking refs
 */
export function useTranscription(logPrefix: string) {
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  // Length of the transcript *before* the current in-progress segment started
  const committedLengthRef = useRef(0);
  const currentItemIdRef = useRef<string | null>(null);

  // Scroll-to-bottom sentinel
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ── Auto-scroll whenever transcript changes ───────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // ── Parse and apply incoming realtime events ──────────────────────────────
  const handleEvent = useCallback(
    (raw: string) => {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(raw);
      } catch {
        return;
      }

      const type = event.type as string;

      if (type === "conversation.item.input_audio_transcription.delta") {
        const itemId = event.item_id as string;
        const delta = (event.delta as string) ?? "";
        console.log(`[${logPrefix}] Delta: ${itemId}: ${delta}`);

        // New speech turn → snapshot the committed length
        if (currentItemIdRef.current !== itemId) {
          currentItemIdRef.current = itemId;
          setTranscript((prev) => {
            committedLengthRef.current = prev.length;
            return prev;
          });
        }

        setTranscript((prev) => prev + delta);
      }

      if (type === "conversation.item.input_audio_transcription.completed") {
        const itemId = event.item_id as string;
        const finalText = (event.transcript as string) ?? "";
        console.log(`[${logPrefix}] Completed: ${itemId}: ${finalText}`);

        // Replace the in-progress segment with the corrected final text,
        // then add a newline so the next turn starts on a fresh line.
        if (currentItemIdRef.current === itemId) {
          setTranscript(
            (prev) =>
              prev.slice(0, committedLengthRef.current) +
              finalText.trimEnd() +
              "\n"
          );
          committedLengthRef.current = 0;
          currentItemIdRef.current = null;
        }
      }

      if (type === "error") {
        console.error(`[${logPrefix}] Server error event:`, event);
      }
    },
    [logPrefix]
  );

  // ── Reset transcript and tracking refs ───────────────────────────────────
  const clearTranscript = useCallback(() => {
    setTranscript("");
    committedLengthRef.current = 0;
    currentItemIdRef.current = null;
  }, []);

  return {
    status,
    setStatus,
    errorMsg,
    setErrorMsg,
    transcript,
    setTranscript,
    committedLengthRef,
    currentItemIdRef,
    bottomRef,
    handleEvent,
    clearTranscript,
  };
}

/**
 * Fetches an ephemeral key from our server's transcription-session endpoint.
 * Throws on failure.
 */
export async function fetchEphemeralKey(): Promise<string> {
  const tokenRes = await fetch("/api/transcription-session", {
    method: "POST",
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ??
        `Server returned ${tokenRes.status}`
    );
  }
  const tokenData = await tokenRes.json();
  const ephemeralKey: string =
    tokenData?.client_secret?.value ?? tokenData?.value;
  if (!ephemeralKey) {
    throw new Error("No ephemeral key returned from server.");
  }
  return ephemeralKey;
}
