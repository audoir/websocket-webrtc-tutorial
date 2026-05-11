"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/app/components/layout/Header";
import TabBar, { type TabId } from "@/app/components/layout/TabBar";

const BasicWebSocketTab = dynamic(
  () => import("@/app/components/tabs/BasicWebSocketTab"),
  { ssr: false }
);
const BasicWebRTCTab = dynamic(
  () => import("@/app/components/tabs/BasicWebRTCTab"),
  { ssr: false }
);
const WebRTCVideoTab = dynamic(
  () => import("@/app/components/tabs/WebRTCVideoTab"),
  { ssr: false }
);
const WebRTCTranscriptionTab = dynamic(
  () => import("@/app/components/tabs/WebRTCTranscriptionTab"),
  { ssr: false }
);
const WebSocketTranscriptionTab = dynamic(
  () => import("@/app/components/tabs/WebSocketTranscriptionTab"),
  { ssr: false }
);
const ServerTranscriptionTab = dynamic(
  () => import("@/app/components/tabs/ServerTranscriptionTab"),
  { ssr: false }
);

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("basic-websocket");

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 flex flex-col p-6 max-w-4xl w-full mx-auto">
        {activeTab === "basic-websocket" && <BasicWebSocketTab />}
        {activeTab === "basic-webrtc" && <BasicWebRTCTab />}
        {activeTab === "webrtc-video" && <WebRTCVideoTab />}
        {activeTab === "webrtc-transcription" && <WebRTCTranscriptionTab />}
        {activeTab === "websocket-transcription" && <WebSocketTranscriptionTab />}
        {activeTab === "server-transcription" && <ServerTranscriptionTab />}
      </main>
    </div>
  );
}
