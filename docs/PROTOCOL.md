# Edubot — WebSocket Communication Protocol

## Connection

The ESP32 hosts a WebSocket server on **port 81**.

```
ws://<esp32_ip>:81/
```

The IP address is displayed on the OLED screen when the robot boots.

---

## Phone → ESP32  (Commands)

All commands are JSON objects with a `cmd` field.

### Servo control
```json
{ "cmd": "SERVO", "id": 1, "angle": 90 }
```
- `id`: servo number 1–6
  - 1 = Left Hip
  - 2 = Right Hip
  - 3 = Left Foot
  - 4 = Right Foot
  - 5 = Left Arm
  - 6 = Right Arm
- `angle`: 0–180 degrees

### LED state
```json
{ "cmd": "LED", "state": "THINKING" }
```
States: `IDLE` | `LISTENING` | `THINKING` | `TALKING` | `ERROR` | `SLEEPING` | `BOOTING` | `WIFI_CONNECTING`

### OLED face
```json
{ "cmd": "OLED", "face": "happy" }
```
Faces: `idle` | `happy` | `sad` | `thinking` | `excited` | `sleeping` | `listening` | `speaking`

### Movement
```json
{ "cmd": "MOVE", "direction": "forward" }
```
Directions: `forward` | `backward` | `left` | `right` | `stop`

### Preset animations
```json
{ "cmd": "WAVE" }
{ "cmd": "DANCE" }
```

### Trigger voice interaction
```json
{ "cmd": "VOICE" }
```
The robot will start listening, transcribe, generate AI response, and speak — exactly as if the physical button was pressed.

### Sleep / power
```json
{ "cmd": "SLEEP" }
```
Puts the robot into deep sleep. Long-press the physical button to wake.

### Status request
```json
{ "cmd": "STATUS" }
```
Robot replies immediately with a STATUS event.

### Clear conversation history
```json
{ "cmd": "CLEAR_HISTORY" }
```

### Play nursery rhyme
```json
{ "cmd": "RHYME", "id": "twinkle" }
```
The robot speaks the full rhyme via ElevenLabs TTS, then sends `RHYME_START` when playback begins and `RHYME_DONE` when it finishes.

Available rhyme IDs: `twinkle` · `humpty` · `baa_baa` · `jack_jill` · `old_mcdonald` · `itsy_bitsy` · `row_your_boat` · `wheels_bus` · `mary_lamb` · `heads_shoulders`

Only accepted when robot is `IDLE`. Ignored while already playing or listening.

---

## ESP32 → Phone  (Events)

All events are JSON objects with a `type` field.

### Status
```json
{
  "type": "STATUS",
  "state": "IDLE",
  "ip": "192.168.1.105",
  "uptime": 345,
  "wifi": true,
  "client": true
}
```
Sent automatically when a client connects, and on request.

- `state`: current robot state (see LED states above)
- `uptime`: seconds since boot
- `wifi`: WiFi connected
- `client`: at least one WebSocket client is connected

### Transcript
```json
{ "type": "TRANSCRIPT", "text": "What is two plus two?" }
```
Sent after Groq Whisper transcribes the user's speech.

### AI Response
```json
{ "type": "RESPONSE", "text": "Two plus two is four!" }
```
Sent after Groq LLaMA generates the reply (before TTS plays it).

### Error
```json
{ "type": "ERROR", "msg": "No transcript" }
```

### OK acknowledgement
```json
{ "type": "OK", "msg": "History cleared" }
```

### Nursery rhyme started
```json
{ "type": "RHYME_START", "id": "twinkle", "title": "Twinkle Little Star" }
```
Sent immediately before TTS audio begins playing.

### Nursery rhyme finished
```json
{ "type": "RHYME_DONE", "id": "twinkle" }
```
Sent after the full rhyme has played back and the robot has returned to `IDLE`.

---

## State Machine

```
BOOTING
  └─► WIFI_CONNECTING
        ├─► IDLE ◄──────────────────────────────────────────┐
        │     ├── button short press / VOICE cmd             │
        │     │                                              │
        │     ▼                                              │
        │   LISTENING (recording audio with VAD)             │
        │     │ speech detected                              │
        │     ▼                                              │
        │   THINKING (STT → Groq Whisper → Groq LLaMA)       │
        │     │ response ready                               │
        │     ▼                                              │
        │   SPEAKING (ElevenLabs TTS → MP3 → I2S speaker) ──┘
        │
        └─► ERROR (WiFi failed — offline mode)
        
  SLEEPING (deep sleep — long press to wake / reset)
```

---

## Example Session

```
[App connects to ws://192.168.1.105:81/]

ESP32 → App:  {"type":"STATUS","state":"IDLE","ip":"192.168.1.105","uptime":12,"wifi":true,"client":true}

App → ESP32:  {"cmd":"VOICE"}

ESP32 → App:  (no message — robot is listening)
ESP32 → App:  {"type":"TRANSCRIPT","text":"What animals live in the ocean?"}
ESP32 → App:  {"type":"RESPONSE","text":"Lots of cool animals! Fish, dolphins, whales, and octopuses all live in the ocean!"}
(robot speaks the response aloud)

App → ESP32:  {"cmd":"OLED","face":"excited"}
App → ESP32:  {"cmd":"SERVO","id":6,"angle":45}
App → ESP32:  {"cmd":"SERVO","id":6,"angle":135}
App → ESP32:  {"cmd":"SERVO","id":6,"angle":90}
```
