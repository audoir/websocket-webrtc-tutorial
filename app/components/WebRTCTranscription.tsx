"use client";

import { useRef, useCallback, useEffect } from "react";
import { useTranscription, fetchEphemeralKey } from "@/hooks/useTranscription";
import TranscriptionView from "./ui/TranscriptionView";

// ── Component ──────────────────────────────────────────────────────────────────

export default function WebRTCTranscription() {
  const {
    status,
    setStatus,
    errorMsg,
    setErrorMsg,
    transcript,
    bottomRef,
    handleEvent,
    clearTranscript,
  } = useTranscription("WebRTC Transcription");

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Stop session ──────────────────────────────────────────────────────────
  const stopSession = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
    setStatus((prev) => (prev === "error" ? "error" : "disconnected"));
  }, [setStatus]);

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setStatus("connecting");
    setErrorMsg(null);
    clearTranscript();

    try {
      // 1. Get ephemeral token from our server
      const ephemeralKey = await fetchEphemeralKey();

      // 2. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Set up audio element (transcription sessions don't produce audio
      //    output, but we still wire up ontrack in case the API sends anything)
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // 4. Add microphone track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // 5. Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("message", (e) => handleEvent(e.data as string));
      dc.addEventListener("open", () => {
        console.log("[WebRTC Transcription] Data channel open");
        setStatus("connected");
      });
      dc.addEventListener("close", () => {
        console.log("[WebRTC Transcription] Data channel closed");
        setStatus("disconnected");
      });

      pc.onconnectionstatechange = () => {
        console.log(
          "[WebRTC Transcription] Connection state:",
          pc.connectionState
        );
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          setStatus("disconnected");
        }
      };

      // 6. SDP offer → OpenAI Realtime API
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(`OpenAI SDP error ${sdpRes.status}: ${errText}`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      console.error("[WebRTC Transcription] Error:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
      stopSession();
    }
  }, [handleEvent, stopSession, setStatus, setErrorMsg, clearTranscript]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      dcRef.current?.close();
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TranscriptionView
      status={status}
      errorMsg={errorMsg}
      transcript={transcript}
      bottomRef={bottomRef}
      onStart={startSession}
      onStop={stopSession}
      onClear={clearTranscript}
    />
  );
}
