"use client";

import { useRef, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useTranscription } from "@/hooks/useTranscription";
import { float32ToPcm16Base64 } from "@/lib/audio";
import TranscriptionView from "./ui/TranscriptionView";

// ── Component ──────────────────────────────────────────────────────────────────

export default function ServerTranscription() {
  const {
    status,
    setStatus,
    errorMsg,
    setErrorMsg,
    transcript,
    bottomRef,
    handleEvent,
    clearTranscript,
  } = useTranscription("Server Transcription");

  // Socket.IO + audio refs
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // ── Stop session ──────────────────────────────────────────────────────────
  const stopSession = useCallback(() => {
    // Stop audio pipeline
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Tell server to close the OpenAI WebSocket
    if (socketRef.current?.connected) {
      socketRef.current.emit("server-transcription:stop");
    }

    setStatus((prev) => (prev === "error" ? "error" : "disconnected"));
  }, [setStatus]);

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setStatus("connecting");
    setErrorMsg(null);
    clearTranscript();

    try {
      // 1. Connect to our Socket.IO server (reuse existing connection if any)
      let socket = socketRef.current;
      if (!socket || !socket.connected) {
        socket = io({ path: "/socket.io" });
        socketRef.current = socket;
      }

      // 2. Listen for events from the server
      socket.off("server-transcription:connected");
      socket.off("server-transcription:disconnected");
      socket.off("server-transcription:error");
      socket.off("server-transcription:event");

      socket.on("server-transcription:connected", async () => {
        console.log("[Server Transcription] Server connected to OpenAI");

        // 3. Capture microphone audio
        try {
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
          // Create audio context with 24kHz sample rate for optimal transcription quality
          const audioContext = new AudioContext({ sampleRate: 24000 });
          audioContextRef.current = audioContext;

          // Create audio source from the microphone stream
          const source = audioContext.createMediaStreamSource(stream);

          // Create script processor to handle audio data in chunks
          // 4096 = buffer size, 1 = input channels, 1 = output channels
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          // Process each audio chunk and send to server for transcription
          processor.onaudioprocess = (e) => {
            if (!socketRef.current?.connected) return;

            // Extract audio data from the first (mono) channel
            const inputData = e.inputBuffer.getChannelData(0);

            // Convert float32 audio data to base64-encoded PCM16 format
            const base64Audio = float32ToPcm16Base64(inputData);

            // Send audio data to server via WebSocket
            socketRef.current.emit("server-transcription:audio", base64Audio);
          };

          // Connect the audio processing chain: microphone -> processor -> audio context
          source.connect(processor);
          processor.connect(audioContext.destination);

          setStatus("connected");
        } catch (micErr) {
          console.error("[Server Transcription] Microphone error:", micErr);
          setErrorMsg(
            micErr instanceof Error ? micErr.message : String(micErr),
          );
          setStatus("error");
          stopSession();
        }
      });

      socket.on("server-transcription:disconnected", () => {
        console.log("[Server Transcription] Server disconnected from OpenAI");
        setStatus((prev) => (prev === "error" ? "error" : "disconnected"));
      });

      socket.on("server-transcription:error", (msg: string) => {
        console.error("[Server Transcription] Error:", msg);
        setErrorMsg(msg);
        setStatus("error");
        stopSession();
      });

      socket.on("server-transcription:event", (raw: string) => {
        handleEvent(raw);
      });

      // 5. Tell the server to open the OpenAI WebSocket
      socket.emit("server-transcription:start");
    } catch (err) {
      console.error("[Server Transcription] Error:", err);
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
      if (socketRef.current?.connected) {
        socketRef.current.emit("server-transcription:stop");
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
