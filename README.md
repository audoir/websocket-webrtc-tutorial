# WebSocket & WebRTC Tutorial

A hands-on guide to real-time communication on the web, built with **Next.js**, **Socket.IO**, the browser's native **WebRTC** APIs, and the **OpenAI Realtime API**.

The app has **six tabs** you can explore one after the other. Each tab is a self-contained demo that teaches a different communication pattern — starting simple and building up to more advanced techniques.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set your OpenAI API key

Tabs 4, 5, and 6 (Realtime Transcription) call the OpenAI Realtime API. Create a `.env` file in the project root:

```bash
echo "OPENAI_API_KEY=sk-..." > .env
```

> The key is only used server-side and is never exposed to the browser.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The server is a custom Node.js HTTP server (`server.ts`) that mounts both Next.js and Socket.IO on the same port (3000). `npm run dev` starts that server — not the standard Next.js dev server.

---

## Project Structure

```
server.ts                              # Custom HTTP server: Next.js + Socket.IO
lib/
  webrtc.ts                            # Shared WebRTC constants & types (ICE servers, status labels)
  audio.ts                             # Shared audio utility: Float32 → PCM16 Base64 encoder
  socket/
    chatHandler.ts                     # Server-side: handles "chat message" events
    webrtcHandler.ts                   # Server-side: WebRTC data-channel signaling relay
    webrtcVideoHandler.ts              # Server-side: WebRTC video/audio signaling relay
    serverTranscriptionHandler.ts      # Server-side: proxies audio to OpenAI Realtime API via WebSocket
hooks/
  useSocket.ts                         # Client hook: WebSocket chat state & logic
  useWebRTC.ts                         # Client hook: WebRTC connection & data channel
  useWebRTCVideo.ts                    # Client hook: WebRTC video/audio peer connection
  useTranscription.ts                  # Client hook: shared transcription state & event handling
app/
  api/
    transcription-session/
      route.ts                         # API route: mints ephemeral OpenAI token (server-side)
  components/
    BasicWebSocket.tsx                 # Tab 1 UI component
    BasicWebRTC.tsx                    # Tab 2 UI component
    WebRTCVideo.tsx                    # Tab 3 UI component
    WebRTCTranscription.tsx            # Tab 4 UI component
    WebSocketTranscription.tsx         # Tab 5 UI component
    ServerTranscription.tsx            # Tab 6 UI component
    ui/                                # Shared UI: ChatInput, MessageList, RoomPicker, etc.
types/
  message.ts                           # Shared Message type
```

---

## Tab 1 — 🔌 Basic WebSocket (Real-Time Chat)

### What it demonstrates

A classic **broadcast chat** where every connected browser tab sees every message in real time. The server is the hub — all messages flow through it.

### How to try it

1. Open [http://localhost:3000](http://localhost:3000) in **two or more browser tabs**.
2. Type a message in any tab and press **Send**.
3. The message appears instantly in all other tabs.

### How it works — step by step

```
Browser Tab A                  Server (server.ts)              Browser Tab B
─────────────                  ──────────────────              ─────────────
socket.emit("chat message",    io.emit("chat message",         socket.on("chat message", …)
  "Hello!")          ───────▶    "Hello!", socketA.id) ──────▶  renders message
```

1. **Connection** (`hooks/useSocket.ts`)  
   When the component mounts, `useSocket` calls `io()` to open a Socket.IO connection to the server. Socket.IO uses a WebSocket under the hood (with HTTP long-polling as a fallback).

2. **Sending a message** (`hooks/useSocket.ts → sendMessage`)  
   When you type and hit Send, the hook calls `socket.emit("chat message", text)`. The message is also added to local state immediately (optimistic update) so the sender sees it right away without waiting for a round-trip.

3. **Server broadcasts** (`lib/socket/chatHandler.ts`)  
   The server receives the `"chat message"` event and calls `io.emit("chat message", msg, socket.id)` — broadcasting to **all** connected clients, including the sender, along with the sender's socket ID.

4. **Receiving a message** (`hooks/useSocket.ts`)  
   Every tab listens for `"chat message"`. If the incoming `senderId` matches the local socket's own ID, the message is ignored (it was already added optimistically). Otherwise it's appended to the message list.

5. **UI** (`app/components/BasicWebSocket.tsx`)  
   `BasicWebSocket` reads `{ isConnected, messages, sendMessage }` from `useSocket` and renders a status indicator, a scrollable message list, and a chat input.

### Key files

| File | Role |
|---|---|
| `hooks/useSocket.ts` | Opens the socket, listens for events, exposes `sendMessage` |
| `lib/socket/chatHandler.ts` | Server: receives and broadcasts `"chat message"` |
| `app/components/BasicWebSocket.tsx` | Chat UI for this tab |

---

## Tab 2 — 📡 Basic WebRTC (Peer-to-Peer Chat)

### What it demonstrates

A **peer-to-peer** chat where messages travel directly between two browser tabs — the server is only involved during the initial handshake (signaling). Once the connection is established, the server is completely out of the loop.

### How to try it

1. Open [http://localhost:3000](http://localhost:3000) in **two browser tabs** and click the **📡 Basic WebRTC** tab in both.
2. In **both** tabs, type the **same room name** (e.g. `my-room-123`) and click **Join**.
3. Wait for the status to change to **"Connected (P2P)"**.
4. Type a message — it goes directly from one browser to the other, with no server involvement.

### How it works — step by step

WebRTC requires a brief setup phase called **signaling** before the two peers can talk directly. The server acts as a relay only during this phase.

#### Phase 1 — Signaling (server-assisted)

```
Tab A (first joiner)           Server (webrtcHandler.ts)       Tab B (second joiner)
────────────────────           ─────────────────────────       ─────────────────────
emit("webrtc:join", "room") ─▶ joins Socket.IO room
                               only 1 peer → waiting
  ◀─ "webrtc:waiting"

                                                               emit("webrtc:join", "room") ─▶
                               2 peers → ready!
  ◀─ "webrtc:ready"                                            ◀─ "webrtc:ready"
     { initiator: false }         (relay)                         { initiator: true }

                               Tab B creates offer:
                               emit("webrtc:offer", …) ──────▶ relayed to Tab A
Tab A creates answer:
emit("webrtc:answer", …) ────▶ relayed to Tab B
ICE candidates exchanged via server relay in both directions
```

1. **Joining a room** (`hooks/useWebRTC.ts`)  
   When you click **Join**, `useWebRTC` opens a Socket.IO connection and emits `"webrtc:join"` with the room name.

2. **Server assigns roles** (`lib/socket/webrtcHandler.ts`)  
   - If the room has **0 peers**, the server emits `"webrtc:waiting"` back — the first tab waits.
   - When a **second peer** joins, the server emits `"webrtc:ready"` to both tabs. The second joiner gets `{ initiator: true }`, the first gets `{ initiator: false }`.
   - If a **third peer** tries to join, the server emits `"webrtc:room-full"` and rejects them.

3. **Offer/Answer exchange** (`hooks/useWebRTC.ts`)  
   - The **initiator** (Tab B) creates an `RTCPeerConnection`, opens a data channel (`pc.createDataChannel("chat")`), generates an **SDP offer**, and emits `"webrtc:offer"` to the server.
   - The server relays the offer to Tab A.
   - Tab A sets the remote description, generates an **SDP answer**, and emits `"webrtc:answer"`.
   - The server relays the answer back to Tab B, which sets it as its remote description.

4. **ICE candidate exchange** (`hooks/useWebRTC.ts` + `lib/socket/webrtcHandler.ts`)  
   As each peer discovers network paths (ICE candidates), it emits `"webrtc:ice-candidate"` to the server, which relays them to the other peer. Both sides call `pc.addIceCandidate(…)` to register the paths. Google's public STUN servers (`stun.l.google.com`) are used to discover public IP addresses so peers can connect across NATs and firewalls.

#### Phase 2 — Direct P2P (server no longer involved)

```
Tab A ◀──────────────────────────────────────────────────▶ Tab B
              RTCDataChannel ("chat") — direct P2P
```

5. **Data channel opens** (`hooks/useWebRTC.ts → setupDataChannel`)  
   Once ICE negotiation succeeds, the `RTCDataChannel` fires its `onopen` event. The status updates to **"Connected (P2P)"** and the chat input becomes active.
   - The **initiator** created the channel explicitly (`pc.createDataChannel`).
   - The **answerer** receives it via `pc.ondatachannel`.

6. **Sending & receiving messages** (`hooks/useWebRTC.ts → sendMessage`)  
   `channel.send(text)` pushes the message directly to the other peer's browser. The receiving side's `channel.onmessage` handler appends it to the message list. **The server never sees these messages.**

7. **Disconnection**  
   If either peer closes the tab, the server detects the socket disconnect and emits `"webrtc:peer-disconnected"` to the remaining peer, which closes the `RTCPeerConnection` and updates the status.

### Key files

| File | Role |
|---|---|
| `hooks/useWebRTC.ts` | All client-side WebRTC logic: signaling, peer connection, data channel |
| `lib/socket/webrtcHandler.ts` | Server: relays signaling messages between the two peers in a room |
| `app/components/BasicWebRTC.tsx` | Chat UI for this tab (room picker + chat view) |

---

## Tab 3 — 🎥 WebRTC Video (Peer-to-Peer Video Call)

### What it demonstrates

A **peer-to-peer video call** where live camera and microphone streams travel directly between two browser tabs. Like Tab 2, the server only assists during the initial signaling handshake — once the connection is established, all media flows directly between the two browsers.

The key difference from Tab 2 is the transport mechanism: instead of an `RTCDataChannel` carrying text, this tab uses **media tracks** (`RTCPeerConnection.addTrack`) to stream real-time video and audio.

### How to try it

1. Open [http://localhost:3000](http://localhost:3000) in **two browser tabs** and click the **🎥 WebRTC Video** tab in both.
2. In **both** tabs, type the **same room name** (e.g. `my-video-room`) and click **Join**.
3. **Allow camera and microphone access** when the browser prompts you.
4. Your local video preview appears immediately. Wait for the status to change to **"Connected (P2P Video)"**.
5. The remote peer's live video and audio will appear in the second panel.

> **Tip:** You can test this with two tabs in the same browser window — your local camera feed will appear in both tabs.

### How it works — step by step

The signaling flow is identical to Tab 2, but instead of a data channel, the peers exchange **media tracks**.

#### Phase 1 — Camera/Microphone Access

```
Browser
───────
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  → localStream (shown in the "You (local)" video element)
```

1. **Requesting media** (`hooks/useWebRTCVideo.ts`)  
   Before connecting to the server, `useWebRTCVideo` calls `navigator.mediaDevices.getUserMedia({ video: true, audio: true })` to request camera and microphone access. The resulting `MediaStream` is immediately attached to the local `<video>` element so you see your own preview right away.

#### Phase 2 — Signaling (server-assisted)

```
Tab A (first joiner)           Server (webrtcVideoHandler.ts)  Tab B (second joiner)
────────────────────           ──────────────────────────────  ─────────────────────
emit("webrtc-video:join") ───▶ joins Socket.IO room
                               only 1 peer → waiting
  ◀─ "webrtc-video:waiting"

                                                               emit("webrtc-video:join") ─▶
                               2 peers → ready!
  ◀─ "webrtc-video:ready"                                      ◀─ "webrtc-video:ready"
     { initiator: false }           (relay)                       { initiator: true }

                               Tab B creates offer:
                               emit("webrtc-video:offer", …) ─▶ relayed to Tab A
Tab A creates answer:
emit("webrtc-video:answer", …) ▶ relayed to Tab B
ICE candidates exchanged via server relay in both directions
```

2. **Joining a room** (`hooks/useWebRTCVideo.ts`)  
   After obtaining the local stream, the hook opens a Socket.IO connection and emits `"webrtc-video:join"` with the room name.

3. **Server assigns roles** (`lib/socket/webrtcVideoHandler.ts`)  
   The logic mirrors Tab 2:
   - **First peer** → server emits `"webrtc-video:waiting"`.
   - **Second peer** → server emits `"webrtc-video:ready"` to both. The second joiner gets `{ initiator: true }`, the first gets `{ initiator: false }`.
   - **Third peer** → server emits `"webrtc-video:room-full"` and rejects them.

4. **Creating the peer connection** (`hooks/useWebRTCVideo.ts → createPC`)  
   When `"webrtc-video:ready"` is received, both peers call `createPC()`:
   - A new `RTCPeerConnection` is created using the shared ICE server config from `lib/webrtc.ts`.
   - **All local media tracks** are added to the connection via `localStream.getTracks().forEach(track => pc.addTrack(track, localStream))`. This is what causes the remote peer to receive your video and audio.
   - `pc.onicecandidate` is wired up to relay ICE candidates through the server.
   - `pc.ontrack` is wired up to receive the remote peer's tracks and attach them to the remote `<video>` element.

5. **Offer/Answer exchange** (`hooks/useWebRTCVideo.ts`)  
   - The **initiator** (Tab B) calls `pc.createOffer()`, sets it as the local description, and emits `"webrtc-video:offer"`.
   - The server relays the offer to Tab A.
   - Tab A sets the remote description, calls `pc.createAnswer()`, sets it as the local description, and emits `"webrtc-video:answer"`.
   - The server relays the answer back to Tab B.

6. **ICE candidate exchange** (`hooks/useWebRTCVideo.ts` + `lib/socket/webrtcVideoHandler.ts`)  
   As each peer discovers network paths, it emits `"webrtc-video:ice-candidate"`. The server relays these to the other peer, which calls `pc.addIceCandidate(…)`. Google's public STUN servers are used to discover public IP addresses.

#### Phase 3 — Direct P2P Video (server no longer involved)

```
Tab A ◀──────────────────────────────────────────────────▶ Tab B
         RTCPeerConnection (video + audio tracks) — direct P2P
```

7. **Connection established** (`hooks/useWebRTCVideo.ts`)  
   Once ICE negotiation succeeds, `pc.onconnectionstatechange` fires with `"connected"`. The status updates to **"Connected (P2P Video)"**.

8. **Receiving remote video** (`hooks/useWebRTCVideo.ts → pc.ontrack`)  
   When the remote peer's tracks arrive, `pc.ontrack` fires and attaches `e.streams[0]` to the remote `<video>` element's `srcObject`. The remote video panel comes to life. **The server never sees any of this media.**

9. **Disconnection**  
   If either peer closes the tab, the server detects the socket disconnect and emits `"webrtc-video:peer-disconnected"` to the remaining peer. The hook closes the `RTCPeerConnection`, clears the remote video, and updates the status to **"Peer disconnected"**. Local camera/microphone tracks are stopped when the component unmounts.

### Key files

| File | Role |
|---|---|
| `hooks/useWebRTCVideo.ts` | All client-side logic: media capture, signaling, peer connection, track handling |
| `lib/socket/webrtcVideoHandler.ts` | Server: relays signaling messages between the two peers in a room |
| `lib/webrtc.ts` | Shared constants: ICE server config, connection status types & labels |
| `app/components/WebRTCVideo.tsx` | Video call UI: local/remote video panels, status bar, room picker |

---

## Tab 4 — 🎙️ WebRTC Realtime Transcription

### What it demonstrates

**Live speech-to-text** powered by the [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) and the `gpt-realtime-whisper` model. Your microphone audio is streamed directly to OpenAI over a **WebRTC** peer connection, and transcript text appears in real time — word by word — before each utterance is even complete.

Unlike the previous tabs, this one connects to an **external service** (OpenAI) rather than to another browser tab. The server's only role is to securely mint a short-lived **ephemeral token** so the browser never needs to hold your real API key.

### Prerequisites

Add your OpenAI API key to a `.env` file in the project root (see [Getting Started](#getting-started) above). The key is read server-side only.

### How to try it

1. Click the **🎙️ WebRTC Transcription** tab.
2. Click **Start Transcription**.
3. Allow microphone access when the browser prompts you.
4. Start speaking — your words appear in real time as you talk.
5. Click **Stop** to end the session, **Clear** to wipe the transcript, or **Copy transcript** to copy all text to the clipboard.

### How it works — step by step

```
Browser                        Your Server                     OpenAI Realtime API
───────                        ───────────                     ───────────────────
POST /api/transcription-session ──────────────────────────────▶ POST /v1/realtime/client_secrets
                               (uses OPENAI_API_KEY)
  ◀─ { value: "ek_..." } ◀────────────────────────────────────

RTCPeerConnection.createOffer()
POST https://api.openai.com/v1/realtime/calls  ──────────────▶ (SDP answer)
  Authorization: Bearer ek_...
  ◀─ SDP answer

RTCPeerConnection.setRemoteDescription(answer)

Microphone audio ────────────────────────────────────────────▶ gpt-realtime-whisper
  ◀─ transcript delta events (via RTCDataChannel "oai-events")
```

#### Step 1 — Mint an ephemeral token (server-side)

`app/api/transcription-session/route.ts` is a Next.js API route that runs on the server. When the browser calls `POST /api/transcription-session`, the route:

1. Reads `OPENAI_API_KEY` from the environment.
2. Calls `POST https://api.openai.com/v1/realtime/client_secrets` with a session config that specifies:
   - `type: "transcription"` — transcription-only session (no assistant response).
   - `audio.input.transcription.model: "gpt-realtime-whisper"` — the streaming transcription model.
   - `audio.input.format: { type: "audio/pcm", rate: 24000 }` — 24 kHz mono PCM.
3. Returns the ephemeral key (`value`) to the browser. The key expires after a short time and can only be used once.

> **Why a server round-trip?** Your real `OPENAI_API_KEY` must never leave the server. The ephemeral token is safe to use in the browser because it is short-lived and scoped to a single session.

#### Step 2 — Establish the WebRTC connection (browser-side)

`app/components/WebRTCTranscription.tsx` handles the rest:

1. **Create a peer connection** — `new RTCPeerConnection()`.
2. **Add the microphone track** — `navigator.mediaDevices.getUserMedia({ audio: true })` then `pc.addTrack(track, stream)`. This is what sends your voice to OpenAI.
3. **Create a data channel** — `pc.createDataChannel("oai-events")`. This is how OpenAI sends transcript events back to the browser.
4. **SDP offer** — `pc.createOffer()` → `pc.setLocalDescription(offer)`.
5. **POST the SDP to OpenAI** — `POST https://api.openai.com/v1/realtime/calls` with the ephemeral key in the `Authorization` header and the SDP as the body.
6. **Set the SDP answer** — `pc.setRemoteDescription({ type: "answer", sdp: ... })`. The WebRTC connection is now live.

#### Step 3 — Receive transcript events

OpenAI sends two types of events over the data channel:

| Event type | When it fires | What it contains |
|---|---|---|
| `conversation.item.input_audio_transcription.delta` | Continuously as you speak | `delta` — a small chunk of new text |
| `conversation.item.input_audio_transcription.completed` | When a speech turn ends | `transcript` — the complete, corrected text for that turn |

The component accumulates `delta` events into a single rolling text block, updating it in real time as you speak. When the `completed` event arrives, the in-progress segment is replaced with the corrected final text and a newline is added so the next utterance starts on a fresh line.

Each speech turn is identified by a unique `item_id`, which is used internally to know which portion of the text to replace when the final arrives.

### Key files

| File | Role |
|---|---|
| `app/api/transcription-session/route.ts` | Server: mints ephemeral OpenAI token using `OPENAI_API_KEY` |
| `app/components/WebRTCTranscription.tsx` | Client: WebRTC connection, microphone capture, transcript display |
| `hooks/useTranscription.ts` | Shared hook: transcript state, event parsing, auto-scroll |

---

## Tab 5 — 🎙️ WebSocket Realtime Transcription

### What it demonstrates

The same **live speech-to-text** as Tab 4, but using a **WebSocket** connection instead of WebRTC. This tab is a great way to see the difference between the two transport options side by side.

The key difference from Tab 4:
- **Tab 4 (WebRTC):** The browser establishes a WebRTC peer connection with OpenAI. Audio is sent as a media track; events come back over an `RTCDataChannel`.
- **Tab 5 (WebSocket):** The browser opens a WebSocket directly to `wss://api.openai.com/v1/realtime`. Audio is captured via the Web Audio API, encoded as Base64 PCM16, and sent as JSON messages over the socket.

Both tabs use the **same ephemeral token endpoint** and the **same `useTranscription` hook** for event handling and transcript display.

### Prerequisites

Same as Tab 4 — add your OpenAI API key to `.env` (see [Getting Started](#getting-started) above).

### How to try it

1. Click the **🎙️ WebSocket Transcription** tab.
2. Click **Start Transcription**.
3. Allow microphone access when the browser prompts you.
4. Start speaking — your words appear in real time as you talk.
5. Click **Stop** to end the session, **Clear** to wipe the transcript, or **Copy transcript** to copy all text to the clipboard.

### How it works — step by step

```
Browser                        Your Server                     OpenAI Realtime API
───────                        ───────────                     ───────────────────
POST /api/transcription-session ──────────────────────────────▶ POST /v1/realtime/client_secrets
                               (uses OPENAI_API_KEY)
  ◀─ { value: "ek_..." } ◀────────────────────────────────────

new WebSocket("wss://api.openai.com/v1/realtime",
  ["realtime", "openai-insecure-api-key.ek_..."])  ──────────▶ WebSocket handshake

navigator.mediaDevices.getUserMedia({ audio: true })
AudioContext + ScriptProcessorNode
  → Float32 samples → PCM16 → Base64

ws.send({ type: "input_audio_buffer.append", audio: "..." }) ▶ gpt-realtime-whisper
  ◀─ transcript delta events (JSON over WebSocket)
```

#### Step 1 — Mint an ephemeral token (server-side)

Identical to Tab 4. The browser calls `POST /api/transcription-session` and receives a short-lived ephemeral key.

> **Why pass the key as a WebSocket subprotocol?** The browser's `WebSocket` API does not allow setting custom HTTP headers (like `Authorization`). The OpenAI Realtime API accepts the ephemeral key as a subprotocol string in the format `openai-insecure-api-key.<key>`.

#### Step 2 — Open the WebSocket connection (browser-side)

`app/components/WebSocketTranscription.tsx` handles the connection:

```js
const ws = new WebSocket("wss://api.openai.com/v1/realtime", [
  "realtime",
  `openai-insecure-api-key.${ephemeralKey}`,
]);
```

> **Important:** Do not append a `?model=...` query parameter. For transcription sessions, the model is baked into the ephemeral token — adding a model param will cause OpenAI to reject the connection.

#### Step 3 — Capture and stream microphone audio

Once the WebSocket is open, the component:

1. Calls `navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 24000, channelCount: 1, ... } })` to capture the microphone.
2. Creates an `AudioContext` at 24 kHz and a `ScriptProcessorNode` with a 4096-sample buffer.
3. On every `onaudioprocess` event, converts the raw `Float32Array` samples to **PCM16 little-endian**, Base64-encodes the result, and sends it to OpenAI:

```json
{ "type": "input_audio_buffer.append", "audio": "<base64-pcm16>" }
```

#### Step 4 — Receive transcript events

Identical to Tab 4. OpenAI sends `delta` and `completed` events over the WebSocket as JSON strings. The shared `useTranscription` hook (`hooks/useTranscription.ts`) parses these events and updates the transcript display in real time.

### Key files

| File | Role |
|---|---|
| `app/api/transcription-session/route.ts` | Server: mints ephemeral OpenAI token (shared with Tab 4) |
| `app/components/WebSocketTranscription.tsx` | Client: WebSocket connection, PCM16 audio encoding, transcript display |
| `hooks/useTranscription.ts` | Shared hook: transcript state, event parsing, auto-scroll |

---

## Tab 6 — 🖥️ Server Transcription

### What it demonstrates

**Live speech-to-text** where the browser never touches the OpenAI API directly. Instead, the browser sends microphone audio to **your own Node.js server** via **Socket.IO**, and the server opens a WebSocket to the OpenAI Realtime API using the `OPENAI_API_KEY` stored securely on the server. Transcription events are relayed back to the browser in real time.

This is the most secure of the three transcription approaches: the API key never leaves the server, and no ephemeral token is needed.

### Prerequisites

Same as Tabs 4 and 5 — add your OpenAI API key to `.env` (see [Getting Started](#getting-started) above).

### How to try it

1. Click the **🖥️ Server Transcription** tab.
2. Click **Start Transcription**.
3. Allow microphone access when the browser prompts you.
4. Start speaking — your words appear in real time as you talk.
5. Click **Stop** to end the session, **Clear** to wipe the transcript, or **Copy transcript** to copy all text to the clipboard.

### How it works — step by step

```
Browser                        Your Server (Node.js)           OpenAI Realtime API
───────                        ─────────────────────           ───────────────────
socket.emit("server-transcription:start")
                               opens WebSocket to OpenAI
                               using OPENAI_API_KEY ─────────▶ wss://api.openai.com/v1/realtime
                                                                 ?intent=transcription
                               ◀─ session ready

  ◀─ "server-transcription:connected"

navigator.mediaDevices.getUserMedia({ audio: true })
AudioContext + ScriptProcessorNode
  → Float32 samples → PCM16 → Base64

socket.emit("server-transcription:audio", base64) ──────────▶ input_audio_buffer.append ──▶ OpenAI
                               ◀─ transcript delta events ◀──────────────────────────────────
  ◀─ "server-transcription:event" (relayed JSON)
```

#### Step 1 — Start the session (browser → server)

`app/components/ServerTranscription.tsx` connects to the Socket.IO server and emits `"server-transcription:start"`.

#### Step 2 — Server opens the OpenAI WebSocket (`lib/socket/serverTranscriptionHandler.ts`)

When the server receives `"server-transcription:start"`, it:

1. Reads `OPENAI_API_KEY` from the environment.
2. Opens a WebSocket to `wss://api.openai.com/v1/realtime?intent=transcription` with the API key in the `Authorization` header — something the browser cannot do directly.
3. Sends a `session.update` message to configure the session:
   - `type: "transcription"` — transcription-only session.
   - `audio.input.transcription.model: "gpt-realtime-whisper"` — the streaming transcription model.
   - `audio.input.format: { type: "audio/pcm", rate: 24000 }` — 24 kHz mono PCM.
4. Emits `"server-transcription:connected"` back to the browser once the OpenAI WebSocket is open.

#### Step 3 — Capture and stream microphone audio (browser-side)

Once the browser receives `"server-transcription:connected"`, it:

1. Calls `navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 24000, channelCount: 1, ... } })`.
2. Creates an `AudioContext` at 24 kHz and a `ScriptProcessorNode` with a 4096-sample buffer.
3. On every `onaudioprocess` event, converts the raw `Float32Array` samples to **PCM16 little-endian** using `float32ToPcm16Base64` from `lib/audio.ts`, and emits the Base64-encoded chunk to the server:

```
socket.emit("server-transcription:audio", base64Audio)
```

#### Step 4 — Server forwards audio to OpenAI

The server's `"server-transcription:audio"` handler receives each chunk and forwards it to the OpenAI WebSocket:

```json
{ "type": "input_audio_buffer.append", "audio": "<base64-pcm16>" }
```

#### Step 5 — Receive and relay transcript events

OpenAI sends `delta` and `completed` events back over the server's WebSocket. The server filters for relevant event types and relays them to the browser via `socket.emit("server-transcription:event", raw)`. The shared `useTranscription` hook parses these events and updates the transcript display in real time — identical to Tabs 4 and 5.

#### Step 6 — Stop the session

When the browser emits `"server-transcription:stop"` (or disconnects), the server closes the OpenAI WebSocket cleanly.

### Key files

| File | Role |
|---|---|
| `lib/socket/serverTranscriptionHandler.ts` | Server: opens/manages the OpenAI WebSocket, forwards audio, relays events |
| `app/components/ServerTranscription.tsx` | Client: Socket.IO connection, microphone capture, transcript display |
| `hooks/useTranscription.ts` | Shared hook: transcript state, event parsing, auto-scroll (shared with Tabs 4 & 5) |
| `lib/audio.ts` | Shared utility: `float32ToPcm16Base64` encoder (shared with Tab 5) |

---

## Comparison: All Six Tabs

| | Tab 1 — WebSocket Chat | Tab 2 — WebRTC Chat | Tab 3 — WebRTC Video | Tab 4 — WebRTC Transcription | Tab 5 — WebSocket Transcription | Tab 6 — Server Transcription |
|---|---|---|---|---|---|---|
| **Message/media path** | Browser → Server → All browsers | Browser ↔ Browser (direct) | Browser ↔ Browser (direct) | Browser → OpenAI (direct) | Browser → OpenAI (direct) | Browser → Server → OpenAI |
| **Server role** | Always in the loop | Only during setup (signaling) | Only during setup (signaling) | Only mints ephemeral token | Only mints ephemeral token | Full proxy (opens & manages OpenAI WS) |
| **Transport** | Socket.IO / WebSocket | RTCDataChannel | RTCPeerConnection media tracks | RTCPeerConnection audio track + data channel | WebSocket + Base64 PCM16 audio | Socket.IO + Base64 PCM16 audio → server WS |
| **Scales to N clients** | Yes — server broadcasts to all | No — designed for 2 peers | No — designed for 2 peers | Yes — each user has their own session | Yes — each user has their own session | Yes — each user has their own server-side WS |
| **Setup complexity** | Simple | More complex (offer/answer/ICE) | More complex (offer/answer/ICE + media permissions) | Moderate (ephemeral token + SDP exchange with OpenAI) | Moderate (ephemeral token + Web Audio API encoding) | Simple (no ephemeral token; server holds the key) |
| **API key exposure** | N/A | N/A | N/A | Ephemeral key in browser | Ephemeral key in browser | Key stays on server only |
| **Good for** | Group chat, live feeds, notifications | Low-latency P2P text, file transfer | Video/audio calls | Live captions, voice notes, accessibility | Live captions when WebRTC is unavailable or blocked | Secure transcription; environments where browser can't reach OpenAI directly |

### WebRTC vs WebSocket vs Server-side for transcription (Tabs 4, 5 & 6)

All three tabs produce the same result — live transcription via the OpenAI Realtime API — but they differ in how audio gets there and where the API key lives:

| | Tab 4 — WebRTC | Tab 5 — WebSocket | Tab 6 — Server |
|---|---|---|---|
| **Audio transport** | Native media track (browser handles encoding) | Web Audio API → PCM16 → Base64 → JSON | Web Audio API → PCM16 → Base64 → Socket.IO → server WS |
| **Connection setup** | SDP offer/answer exchange | Simple WebSocket handshake | Socket.IO emit; server opens WS to OpenAI |
| **Auth mechanism** | Ephemeral key in HTTP `Authorization` header | Ephemeral key as WebSocket subprotocol | Server uses `OPENAI_API_KEY` directly (never sent to browser) |
| **Ephemeral token needed** | Yes | Yes | No |
| **Browser support** | Requires WebRTC support | Requires WebSocket support (universal) | Requires WebSocket support (universal) |
| **Complexity** | Lower (browser handles audio encoding) | Higher (manual PCM16 encoding in JS) | Moderate (server proxy adds a hop but simplifies auth) |
| **Security** | Ephemeral key visible in browser | Ephemeral key visible in browser | API key never leaves the server |
