/**
 * Shared WebRTC constants and types used by both the data-channel (chat)
 * and media-track (video) hooks and components.
 */

export type ConnectionStatus =
  | "idle"
  | "waiting"
  | "connecting"
  | "connected"
  | "disconnected"
  | "room-full"
  | "error";

// ── Transcription-specific status ─────────────────────────────────────────────

/**
 * Subset of ConnectionStatus used by the transcription component.
 * "waiting" and "room-full" are not applicable to transcription sessions.
 */
export type TranscriptionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export const TRANSCRIPTION_STATUS_LABELS: Record<TranscriptionStatus, string> =
  {
    idle: "Not started",
    connecting: "Connecting…",
    connected: "Listening — speak into your microphone",
    disconnected: "Disconnected",
    error: "Error",
  };

export const TRANSCRIPTION_STATUS_COLORS: Record<TranscriptionStatus, string> =
  {
    idle: "bg-zinc-400",
    connecting: "bg-yellow-400",
    connected: "bg-green-500",
    disconnected: "bg-zinc-400",
    error: "bg-red-500",
  };

/** STUN servers help peers discover their public IP and connect across NATs/firewalls */
export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const WEBRTC_STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: "Initialising…",
  waiting: "Waiting for peer to join…",
  connecting: "Connecting…",
  connected: "Connected (P2P)",
  disconnected: "Peer disconnected",
  "room-full": "Room is full — try a different room name",
  error: "Error",
};

export const WEBRTC_STATUS_COLORS: Record<ConnectionStatus, string> = {
  idle: "bg-zinc-400",
  waiting: "bg-yellow-400",
  connecting: "bg-yellow-400",
  connected: "bg-green-500",
  disconnected: "bg-red-500",
  "room-full": "bg-red-500",
  error: "bg-red-500",
};
