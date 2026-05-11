import dynamic from "next/dynamic";
import InfoCard from "./InfoCard";

const BasicWebSocket = dynamic(() => import("@/app/components/BasicWebSocket"), {
  ssr: false,
});

export default function BasicWebSocketTab() {
  return (
    <div className="flex flex-col flex-1 gap-6">
      <InfoCard
        title="🔌 Basic WebSocket — Real-Time Chat"
        description={
          <>
            This tab demonstrates a real-time chat application using{" "}
            <strong>Socket.IO</strong> over WebSockets. Open this page in
            multiple browser tabs and send messages — they will appear instantly
            in all connected windows.
          </>
        }
        items={[
          { label: "Server", value: "Node.js + Socket.IO" },
          { label: "Client", value: "React + socket.io-client" },
          { label: "Pattern", value: "Broadcast to all clients" },
        ]}
      />
      <div className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col min-h-[500px]">
        <BasicWebSocket />
      </div>
    </div>
  );
}
