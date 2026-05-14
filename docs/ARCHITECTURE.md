# Edubot — System Architecture

## Overview

Edubot v2.0 uses a **direct phone-to-robot** architecture.  
The phone app connects directly to the ESP32 via WebSocket.  
**No backend server, no Node.js, no cloud relay.**

```
┌─────────────────────────────────────────────────────────┐
│  React Native App (phone)                               │
│                                                         │
│  • Servo sliders          • OLED face selector          │
│  • Movement controls      • LED state control           │
│  • Conversation history   • Connection status           │
│  • WebSocket client                                     │
└────────────────────────┬────────────────────────────────┘
                         │  ws://<esp32_ip>:81/
                         │  (same WiFi network)
┌────────────────────────▼────────────────────────────────┐
│  ESP32-S3 N16R8  (robot brain)                          │
│                                                         │
│  WebSocket server  ──►  command handler                 │
│                                                         │
│  Voice pipeline (button or VOICE cmd):                  │
│    INMP441 mic  →  VAD recording                        │
│    WAV buffer   →  Groq Whisper (STT)                   │
│    transcript   →  Groq LLaMA (AI)                      │
│    response     →  ElevenLabs TTS (MP3)                 │
│    MP3 bytes    →  MAX98357A speaker                    │
│                                                         │
│  Hardware outputs:                                      │
│    6× SG90 servos          WS2812 RGB LED (GPIO48)      │
│    SSD1306 OLED 128×64     Deep sleep (GPIO16)          │
└─────────────────────────────────────────────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         Groq API   Groq API   ElevenLabs
        (Whisper)  (LLaMA 3)   (TTS API)
```

---

## Firmware Module Map

```
Arduino_IDE/
├── Edubot_Firmware.ino     Main sketch — setup(), loop(), state machine
├── config.h                All pin definitions and constants
├── secrets.h               WiFi credentials and API keys (git-ignored)
│
├── wifi_manager            WiFi connection + auto-reconnect
├── websocket_manager       WebSocket server (port 81) + command queue
│
├── audio_manager           I2S mic recording (VAD), I2S MP3 playback
├── stt_manager             Groq Whisper API (multipart WAV upload)
├── ai_manager              Groq LLaMA API (chat with rolling history)
├── tts_manager             ElevenLabs TTS API (raw binary MP3, free tier)
│
├── led_manager             WS2812 RGB LED with 9 animated states
├── oled_manager            SSD1306 OLED faces + animations
├── servo_manager           6× SG90 with presets and smooth motion
│
├── button_manager          GPIO16 debounced short/long press
├── sleep_manager           esp_deep_sleep with EXT0 wakeup
└── AudioFileSourceRAM.h    In-memory AudioFileSource for ESP8266Audio
```

---

## App Module Map

```
Edubot/
├── app/
│   ├── index.tsx            Connection screen — enter ESP32 IP
│   ├── dashboard.tsx        Main hub — actions and status
│   ├── control.tsx          Movement controls (forward/back/left/right)
│   ├── servo-control.tsx    Individual servo sliders + presets  [NEW]
│   ├── conversation.tsx     Live conversation history + speak button  [NEW]
│   ├── faces.tsx            OLED face picker
│   └── _layout.tsx          Root layout with RobotProvider
│
└── src/
    ├── services/
    │   └── robotWebSocket.ts    Direct ESP32 WebSocket client  [NEW]
    └── context/
        └── RobotContext.tsx     Global state — connection, conversation, commands  [UPDATED]
```

---

## Voice Pipeline Detail

```
Physical button short-press  OR  {"cmd":"VOICE"} from app
                │
                ▼
    STATE_LISTENING
    ┌─────────────────────────────────────────────────────┐
    │ I2S_NUM_0 reads 256-sample chunks from INMP441      │
    │ RMS energy → VAD_THRESHOLD check                    │
    │ Accumulate PCM in PSRAM buffer                      │
    │ Stop after VAD_SILENCE_MS of quiet                  │
    └─────────────────────────────────────────────────────┘
                │
                ▼
    STATE_THINKING
    ┌─────────────────────────────────────────────────────┐
    │ Build 44-byte WAV header over PCM buffer            │
    │ POST multipart/form-data to Groq Whisper API        │
    │ Parse {"text": "..."}                               │
    └─────────────────────────────────────────────────────┘
                │  transcript
                ▼
    ┌─────────────────────────────────────────────────────┐
    │ POST JSON to Groq LLaMA (llama-3.1-8b-instant)      │
    │ System: kid-friendly persona                        │
    │ Rolling 4-message history for context               │
    │ max_tokens: 120                                     │
    └─────────────────────────────────────────────────────┘
                │  reply text  ──► wsSend RESPONSE event
                ▼
    STATE_SPEAKING
    ┌─────────────────────────────────────────────────────┐
    │ POST JSON to ElevenLabs TTS API                     │
    │ Read raw binary MP3 stream into PSRAM buffer        │
    │ AudioFileSourceRAM → AudioGeneratorMP3 → I2S_NUM_1  │
    │ MAX98357A amplifier plays audio                     │
    └─────────────────────────────────────────────────────┘
                │
                ▼
    STATE_IDLE
```

---

## Power Management

| Event                    | Action                                              |
|--------------------------|-----------------------------------------------------|
| Normal operation         | All peripherals active                              |
| Long press (3s) while ON | Enter deep sleep — OLED shows zzz, servos detached |
| Long press (3s) while OFF| Wake from deep sleep — full reboot sequence         |
| Deep sleep power         | ~40 µA typical on ESP32-S3 (ext0 wakeup active)     |

---

## Memory Budget (ESP32-S3 N16R8)

| Resource           | Allocation                          |
|--------------------|-------------------------------------|
| Audio record buffer| ~192 KB  (ps_malloc — PSRAM)        |
| TTS MP3 buffer     | ~20–80 KB (ps_malloc — PSRAM)       |
| ArduinoJson docs   | ~12–16 KB (heap, stack-allocated)   |
| WebSocket buffers  | ~8 KB (heap)                        |
| Firmware (.text)   | ~800 KB (Flash, 3 MB partition)     |
| PSRAM remaining    | ~7.7 MB free for future expansion   |

---

## Removed Components (v1 → v2)

| Removed                          | Reason                                   |
|----------------------------------|------------------------------------------|
| `backend/` Node.js server        | Not needed — ESP32 calls APIs directly   |
| `firmware/edubot_main/` PlatformIO| Replaced by `Arduino_IDE/`              |
| `src/services/aiPipelineService` | App no longer does AI                    |
| `src/services/groqService`       | App no longer does STT/LLM               |
| `src/services/elevenLabsService` | App no longer does TTS                   |
| `src/services/voiceCommandParser`| App no longer records audio              |
| `app/voice-command.tsx`          | Voice is handled entirely on the robot   |
| Paired/standalone state machine  | Replaced by single direct-connection mode|
| Backend heartbeat / relay WS     | No backend exists                        |
