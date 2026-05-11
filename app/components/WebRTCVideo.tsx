"use client";

import { useState, useRef } from "react";
import { useWebRTCVideo } from "@/hooks/useWebRTCVideo";
import { WEBRTC_STATUS_LABELS, WEBRTC_STATUS_COLORS } from "@/lib/webrtc";
import StatusIndicator from "./ui/StatusIndicator";
import RoomPicker from "./ui/RoomPicker";

export default function WebRTCVideo() {
  const [roomInput, setRoomInput] = useState("");
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const { status } = useWebRTCVideo(
    activeRoom ?? "",
    localVideoRef,
    remoteVideoRef
  );

  const handleJoin = () => {
    const r = roomInput.trim();
    if (r) setActiveRoom(r);
  };

  // ── Room picker ────────────────────────────────────────────────────────────
  if (!activeRoom) {
    return (
      <RoomPicker
        roomInput={roomInput}
        onRoomInputChange={setRoomInput}
        onJoin={handleJoin}
        description="Enter a room name to join. Share the same room name with another browser tab to start a peer-to-peer video call."
        placeholder="e.g. my-video-room"
        extraDescription={
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center max-w-xs">
            Your browser will ask for camera and microphone permission after you
            join.
          </p>
        }
        buttonColorClass="bg-emerald-600 hover:bg-emerald-700"
        focusRingClass="focus:ring-emerald-500"
      />
    );
  }

  // ── Video UI ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Status bar */}
      <StatusIndicator
        colorClass={WEBRTC_STATUS_COLORS[status] ?? "bg-zinc-400"}
        label={
          status === "connected"
            ? "Connected (P2P Video)"
            : WEBRTC_STATUS_LABELS[status] ?? status
        }
        trailing={`room: ${activeRoom}`}
      />

      {/* Video grid */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Local video */}
        <div className="relative rounded-xl overflow-hidden bg-zinc-900 aspect-video flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-2 left-3 text-xs text-white/70 bg-black/40 rounded px-2 py-0.5">
            You (local)
          </span>
        </div>

        {/* Remote video */}
        <div className="relative rounded-xl overflow-hidden bg-zinc-900 aspect-video flex items-center justify-center">
          {status !== "connected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 opacity-30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 9.75v9A2.25 2.25 0 004.5 18.75z"
                />
              </svg>
              <p className="text-xs opacity-50">
                {status === "waiting"
                  ? "Waiting for peer…"
                  : status === "connecting"
                  ? "Connecting…"
                  : status === "disconnected"
                  ? "Peer disconnected"
                  : "No remote video"}
              </p>
            </div>
          )}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-2 left-3 text-xs text-white/70 bg-black/40 rounded px-2 py-0.5">
            Peer (remote)
          </span>
        </div>
      </div>

      {/* Helper text */}
      {status === "waiting" && (
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
          Open this page in another tab, enter the same room name, and the video
          call will start automatically.
        </p>
      )}
    </div>
  );
}
