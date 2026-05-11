"use client";

export type TabId =
  | "basic-websocket"
  | "basic-webrtc"
  | "webrtc-video"
  | "webrtc-transcription"
  | "websocket-transcription"
  | "server-transcription";

export const tabs: { id: TabId; label: string }[] = [
  { id: "basic-websocket", label: "🔌 Basic WebSocket" },
  { id: "basic-webrtc", label: "📡 Basic WebRTC" },
  { id: "webrtc-video", label: "🎥 WebRTC Video" },
  { id: "webrtc-transcription", label: "🎙️ WebRTC Transcription" },
  { id: "websocket-transcription", label: "🎙️ WebSocket Transcription" },
  { id: "server-transcription", label: "🖥️ Server Transcription" },
];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6">
      <nav className="flex gap-1 -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
