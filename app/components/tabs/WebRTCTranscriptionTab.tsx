import dynamic from "next/dynamic";
import InfoCard from "./InfoCard";

const WebRTCTranscription = dynamic(
  () => import("@/app/components/WebRTCTranscription"),
  { ssr: false }
);

export default function WebRTCTranscriptionTab() {
  return (
    <div className="flex flex-col flex-1 gap-6">
      <InfoCard
        title="🎙️ WebRTC Realtime Transcription"
        description={
          <>
            This tab demonstrates <strong>live speech-to-text</strong> using
            the <strong>OpenAI Realtime API</strong> with the{" "}
            <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              gpt-realtime-whisper
            </code>{" "}
            model over a <strong>WebRTC</strong> peer connection. Your
            microphone audio is streamed directly to OpenAI, and transcript
            deltas appear in real time as you speak — before each utterance is
            even complete.
          </>
        }
        items={[
          { label: "Model", value: "gpt-realtime-whisper" },
          { label: "Transport", value: "WebRTC + ephemeral token" },
          { label: "VAD", value: "Server-side (auto turn detection)" },
        ]}
      />
      <div className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col min-h-[500px]">
        <WebRTCTranscription />
      </div>
    </div>
  );
}
