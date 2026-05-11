import dynamic from "next/dynamic";
import InfoCard from "./InfoCard";

const WebSocketTranscription = dynamic(
  () => import("@/app/components/WebSocketTranscription"),
  { ssr: false }
);

export default function WebSocketTranscriptionTab() {
  return (
    <div className="flex flex-col flex-1 gap-6">
      <InfoCard
        title="🎙️ WebSocket Realtime Transcription"
        description={
          <>
            This tab demonstrates <strong>live speech-to-text</strong> using
            the <strong>OpenAI Realtime API</strong> over a{" "}
            <strong>WebSocket</strong> connection. The browser obtains a
            short-lived ephemeral token from our server, then opens a WebSocket
            directly to OpenAI. Microphone audio is captured, encoded as Base64
            PCM16, and streamed via{" "}
            <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              input_audio_buffer.append
            </code>{" "}
            events — no WebRTC peer connection required.
          </>
        }
        items={[
          { label: "Model", value: "gpt-realtime-whisper" },
          { label: "Transport", value: "WebSocket + ephemeral token" },
          { label: "VAD", value: "Server-side (auto turn detection)" },
        ]}
      />
      <div className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col min-h-[500px]">
        <WebSocketTranscription />
      </div>
    </div>
  );
}
