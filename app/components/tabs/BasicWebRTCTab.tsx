import dynamic from "next/dynamic";
import InfoCard from "./InfoCard";

const BasicWebRTC = dynamic(() => import("@/app/components/BasicWebRTC"), {
  ssr: false,
});

export default function BasicWebRTCTab() {
  return (
    <div className="flex flex-col flex-1 gap-6">
      <InfoCard
        title="📡 Basic WebRTC — Peer-to-Peer Chat"
        description={
          <>
            This tab demonstrates a <strong>peer-to-peer</strong> chat using{" "}
            <strong>WebRTC</strong> data channels. Two browser tabs join the
            same room name; the server acts only as a{" "}
            <strong>signaling relay</strong> to exchange connection metadata
            (offer/answer/ICE candidates). Once the P2P connection is
            established, messages travel <em>directly</em> between the two
            browsers — the server is no longer involved.
          </>
        }
        items={[
          { label: "Signaling", value: "Socket.IO (server relay)" },
          { label: "Data transport", value: "RTCDataChannel (P2P)" },
          { label: "Pattern", value: "Direct peer-to-peer" },
        ]}
      />
      <div className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col min-h-[500px]">
        <BasicWebRTC />
      </div>
    </div>
  );
}
