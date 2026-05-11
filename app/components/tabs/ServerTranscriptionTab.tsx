import dynamic from "next/dynamic";
import InfoCard from "./InfoCard";

const ServerTranscription = dynamic(
  () => import("@/app/components/ServerTranscription"),
  { ssr: false }
);

export default function ServerTranscriptionTab() {
  return (
    <div className="flex flex-col flex-1 gap-6">
      <InfoCard
        title="🖥️ Server Transcription"
        description={
          <>
            This tab demonstrates <strong>live speech-to-text</strong> using a{" "}
            <strong>server-side WebSocket</strong> connection to the{" "}
            <strong>OpenAI Realtime API</strong>. The browser sends microphone
            audio to our Node.js server via{" "}
            <strong>Socket.IO</strong>, and the server forwards it to OpenAI
            using a direct WebSocket authenticated with the{" "}
            <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
              OPENAI_API_KEY
            </code>
            . Transcription events are relayed back to the browser in real time
            — the API key never leaves the server.
          </>
        }
        items={[
          { label: "Model", value: "gpt-realtime-whisper" },
          { label: "Transport", value: "Browser → Socket.IO → Server → OpenAI WS" },
          { label: "Auth", value: "Server-side API key (secure)" },
        ]}
      />
      <div className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col min-h-[500px]">
        <ServerTranscription />
      </div>
    </div>
  );
}
