import type { Server, Socket } from "socket.io";
import WebSocket from "ws";

/**
 * Registers server-side transcription handlers.
 *
 * Flow:
 *  1. Browser connects via Socket.IO and emits "server-transcription:start".
 *  2. The server opens a WebSocket to the OpenAI Realtime API using the
 *     OPENAI_API_KEY directly (no ephemeral token needed).
 *  3. The server forwards audio chunks from the browser to OpenAI and relays
 *     transcription events back to the browser.
 *  4. When the browser emits "server-transcription:stop" the server closes
 *     the OpenAI WebSocket.
 */
export function registerServerTranscriptionHandlers(
  _io: Server,
  socket: Socket,
) {
  let openaiWs: WebSocket | null = null;
  let isConnecting = false;

  // ── Helper: close OpenAI WebSocket cleanly ──────────────────────────────
  function closeOpenAIWs() {
    if (openaiWs) {
      try {
        if (
          openaiWs.readyState === WebSocket.OPEN ||
          openaiWs.readyState === WebSocket.CONNECTING
        ) {
          openaiWs.close();
        }
      } catch {
        // ignore
      }
      openaiWs = null;
    }
    isConnecting = false;
  }

  // ── Start: open connection to OpenAI ────────────────────────────────────
  socket.on("server-transcription:start", () => {
    if (openaiWs || isConnecting) {
      console.log(
        `[ServerTranscription] Already connected/connecting for ${socket.id}`,
      );
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      socket.emit(
        "server-transcription:error",
        "OPENAI_API_KEY not set on server.",
      );
      return;
    }

    isConnecting = true;
    console.log(
      `[ServerTranscription] Opening OpenAI WebSocket for ${socket.id}`,
    );

    // Use intent=transcription so OpenAI opens a transcription session
    // (not a realtime conversation session).
    const url = "wss://api.openai.com/v1/realtime?intent=transcription";

    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    openaiWs = ws;

    ws.on("open", () => {
      isConnecting = false;
      console.log(
        `[ServerTranscription] OpenAI WebSocket open for ${socket.id}`,
      );

      const sessionUpdate = {
        type: "session.update",
        session: {
          type: "transcription",
          audio: {
            input: {
              format: {
                type: "audio/pcm",
                rate: 24000,
              },
              transcription: {
                model: "gpt-realtime-whisper",
                language: "en",
              },
            },
          },
        },
      };
      ws.send(JSON.stringify(sessionUpdate));

      socket.emit("server-transcription:connected");
    });

    ws.on("message", (data: WebSocket.RawData) => {
      try {
        const raw = data.toString();
        const event = JSON.parse(raw) as Record<string, unknown>;
        const type = event.type as string;

        // Forward relevant transcription events to the browser
        if (
          type === "conversation.item.input_audio_transcription.delta" ||
          type === "conversation.item.input_audio_transcription.completed" ||
          type === "error" ||
          type === "transcription_session.created" ||
          type === "transcription_session.updated"
        ) {
          socket.emit("server-transcription:event", raw);
        }

        if (type === "error") {
          console.error(
            `[ServerTranscription] OpenAI error for ${socket.id}:`,
            event,
          );
        }
      } catch (err) {
        console.error(
          `[ServerTranscription] Failed to parse OpenAI message:`,
          err,
        );
      }
    });

    ws.on("error", (err) => {
      console.error(
        `[ServerTranscription] OpenAI WebSocket error for ${socket.id}:`,
        err,
      );
      socket.emit(
        "server-transcription:error",
        `OpenAI WebSocket error: ${err.message}`,
      );
      closeOpenAIWs();
      socket.emit("server-transcription:disconnected");
    });

    ws.on("close", (code, reason) => {
      console.log(
        `[ServerTranscription] OpenAI WebSocket closed for ${socket.id}: ${code} ${reason}`,
      );
      openaiWs = null;
      isConnecting = false;
      socket.emit("server-transcription:disconnected");
    });
  });

  // ── Audio chunk: forward PCM16 Base64 audio to OpenAI ───────────────────
  socket.on("server-transcription:audio", (base64Audio: string) => {
    if (!openaiWs || openaiWs.readyState !== WebSocket.OPEN) return;
    openaiWs.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Audio,
      }),
    );
  });

  // ── Stop: close OpenAI WebSocket ─────────────────────────────────────────
  socket.on("server-transcription:stop", () => {
    console.log(`[ServerTranscription] Stop requested by ${socket.id}`);
    closeOpenAIWs();
  });

  // ── Cleanup on browser disconnect ────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(
      `[ServerTranscription] Browser disconnected ${socket.id}, closing OpenAI WS`,
    );
    closeOpenAIWs();
  });
}
