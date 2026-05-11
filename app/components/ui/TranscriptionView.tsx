"use client";

import { RefObject } from "react";
import {
  TranscriptionStatus,
  TRANSCRIPTION_STATUS_LABELS,
  TRANSCRIPTION_STATUS_COLORS,
} from "@/lib/webrtc";
import StatusIndicator from "./StatusIndicator";

interface TranscriptionViewProps {
  status: TranscriptionStatus;
  errorMsg: string | null;
  transcript: string;
  bottomRef: RefObject<HTMLDivElement | null>;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
}

/**
 * Shared presentational component for both WebSocketTranscription and
 * WebRTCTranscription. Renders the status bar, error banner, transcript
 * area, and control buttons. All behaviour is driven by props.
 */
export default function TranscriptionView({
  status,
  errorMsg,
  transcript,
  bottomRef,
  onStart,
  onStop,
  onClear,
}: TranscriptionViewProps) {
  const isActive = status === "connected" || status === "connecting";

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Status bar */}
      <StatusIndicator
        colorClass={TRANSCRIPTION_STATUS_COLORS[status]}
        label={TRANSCRIPTION_STATUS_LABELS[status]}
        trailing={
          status === "connected" ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording
            </span>
          ) : undefined
        }
      />

      {/* Error message */}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Transcript area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 min-h-[300px]">
        {transcript === "" ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-600 text-center max-w-xs">
              {status === "idle"
                ? "Press Start to begin transcribing your microphone audio in real time."
                : status === "connecting"
                ? "Connecting to OpenAI Realtime API…"
                : "Start speaking — your words will appear here."}
            </p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
            {transcript}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isActive ? (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A8.001 8.001 0 0 0 20 12a1 1 0 1 0-2 0 6 6 0 0 1-12 0 1 1 0 1 0-2 0 8.001 8.001 0 0 0 7 7.93z" />
            </svg>
            Start Transcription
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-800 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
            Stop
          </button>
        )}

        {transcript.trim() !== "" && (
          <button
            onClick={onClear}
            className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm transition-colors"
          >
            Clear
          </button>
        )}

        {transcript.trim() !== "" && (
          <button
            onClick={() => navigator.clipboard.writeText(transcript.trim())}
            className="ml-auto px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm transition-colors"
          >
            Copy transcript
          </button>
        )}
      </div>
    </div>
  );
}
