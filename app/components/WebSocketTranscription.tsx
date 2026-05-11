"use client";

import { useRef, useCallback, useEffect } from "react";
import { useTranscription, fetchEphemeralKey } from "@/hooks/useTranscription";
import { float32ToPcm16Base64 } from "@/lib/audio";
import TranscriptionView from "./ui/TranscriptionView";

// ── Component ──────────────────────────────────────────────────────────────────

export default function WebSocketTranscription() {
  const {
    status,
    setStatus,
    errorMsg,
    setErrorMsg,
    transcript,
    bottomRef,
    handleEvent,
    clearTranscript,
  } = useTranscription("WS Transcription");

  // WebSocket + audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // ── Stop session ──────────────────────────────────────────────────────────
  const stopSession = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    setStatus((prev) => (prev === "error" ? "error" : "disconnected"));
  }, [setStatus]);

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setStatus("connecting");
    setErrorMsg(null);
    clearTranscript();

    try {
      // 1. Get ephemeral token from our server (same endpoint as WebRTC)
      const ephemeralKey = await fetchEphemeralKey();

      // 2. Open WebSocket connection to OpenAI Realtime API using the ephemeral
      //    token passed as a subprotocol (browser WebSocket cannot set headers).
      //    For transcription sessions the model is baked into the ephemeral token
      //    — do NOT pass a model query param or OpenAI will reject the connection.
      //    See: https://developers.openai.com/api/docs/guides/realtime-websocket
      const wsUrl = "wss://api.openai.com/v1/realtime";
      const ws = new WebSocket(wsUrl, [
        "realtime",
        `openai-insecure-api-key.${ephemeralKey}`,
      ]);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("[WS Transcription] WebSocket connected");

        // 3. Capture microphone audio
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        streamRef.current = stream;

        // 4. Set up AudioContext + ScriptProcessor to capture PCM16 chunks
        const audioContext = new AudioContext({ sampleRate: 24000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        // ScriptProcessorNode with 4096-sample buffer
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const base64Audio = float32ToPcm16Base64(inputData);
          ws.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64Audio,
            })
          );
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        setStatus("connected");
      };

      ws.onmessage = (e) => {
        handleEvent(e.data as string);
      };

      ws.onerror = (e) => {
        console.error("[WS Transcription] WebSocket error:", e);
        setErrorMsg("WebSocket connection error.");
        setStatus("error");
        stopSession();
      };

      ws.onclose = (e) => {
        console.log("[WS Transcription] WebSocket closed:", e.code, e.reason);
        setStatus((prev) => (prev === "error" ? "error" : "disconnected"));
      };
    } catch (err) {
      console.error("[WS Transcription] Error:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
      stopSession();
    }
  }, [handleEvent, stopSession, setStatus, setErrorMsg, clearTranscript]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      processorRef.current?.disconnect();
      audioContextRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
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
