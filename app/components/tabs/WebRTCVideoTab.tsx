import dynamic from "next/dynamic";
import InfoCard from "./InfoCard";

const WebRTCVideo = dynamic(() => import("@/app/components/WebRTCVideo"), {
  ssr: false,
});

export default function WebRTCVideoTab() {
  return (
    <div className="flex flex-col flex-1 gap-6">
      <InfoCard
        title="🎥 WebRTC Video — Peer-to-Peer Video Call"
        description={
          <>
            This tab demonstrates a <strong>peer-to-peer video call</strong>{" "}
            using <strong>WebRTC</strong> media tracks. Two browser tabs join
            the same room name; the server acts only as a{" "}
            <strong>signaling relay</strong> to exchange connection metadata
            (offer/answer/ICE candidates). Once the P2P connection is
            established, live video and audio stream <em>directly</em>{" "}
            between the two browsers — the server is no longer involved.
          </>
        }
        items={[
          { label: "Signaling", value: "Socket.IO (server relay)" },
          { label: "Media transport", value: "RTCPeerConnection (P2P)" },
          { label: "Pattern", value: "Direct peer-to-peer video" },
        ]}
      />
      <div className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col min-h-[500px]">
        <WebRTCVideo />
      </div>
    </div>
  );
}
