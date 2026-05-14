# Edubot — Migration Guide  (v1 → v2)

## What Changed

| Area          | v1 (old)                             | v2 (new)                              |
|---------------|--------------------------------------|---------------------------------------|
| Architecture  | Phone → Node.js → ESP32              | Phone → ESP32 direct                 |
| Firmware IDE  | PlatformIO                           | Arduino IDE                          |
| Firmware path | `firmware/edubot_main/src/`          | `Arduino_IDE/`                       |
| Voice         | App records → backend STT/TTS        | Robot records → Groq STT/TTS              |
| App AI        | App calls Groq + ElevenLabs          | ESP32 calls Groq + ElevenLabs TTS         |
| Connection    | HTTP to robot + WebSocket to backend | WebSocket directly to robot (port 81) |

---

## Step-by-Step Migration

### 1. Install Arduino IDE + Board Support

See [docs/LIBRARIES.md](LIBRARIES.md) for board URL, settings, and library list.

### 2. Create secrets.h

```bash
cp Arduino_IDE/secrets.h.example Arduino_IDE/secrets.h
# then edit with your WiFi and API keys
```

Or create `Arduino_IDE/secrets.h` with:
```cpp
#pragma once
#define WIFI_SSID             "YourNetworkName"
#define WIFI_PASSWORD         "YourPassword"
#define GROQ_API_KEY          "gsk_..."
#define ELEVENLABS_API_KEY    "your_elevenlabs_key"
#define ELEVENLABS_VOICE_ID   "your_voice_id"
```

### 3. Open Firmware in Arduino IDE

File → Open → navigate to `Arduino_IDE/Edubot_Firmware.ino`

Arduino IDE will automatically load all `.h` and `.cpp` files in the same folder.

### 4. Adjust Pin Definitions (if needed)

Open `Arduino_IDE/config.h` and verify pin numbers match your wiring.  
Compare with `WIRING_NOTES.md` in the project root.

### 5. Set Board & Partition Scheme

```
Tools → Board → ESP32S3 Dev Module
Tools → Flash Size → 16MB (128Mb)
Tools → Partition Scheme → 16M Flash (3MB APP / 9.9MB FATFS)
Tools → PSRAM → OPI PSRAM
```

### 6. Upload Firmware

Connect ESP32-S3 via USB. Select the correct COM port.  
Click Upload (Ctrl+U / Cmd+U).

Watch Serial Monitor at 115200 baud for boot log.  
The OLED will show the IP address after WiFi connects.

### 7. Update the Mobile App

```bash
cd Edubot
npm install
npx expo start
```

The app now connects directly to the robot's IP.  
Remove any `.env` backend URL references in the app if present.

### 8. Delete Old Files (optional cleanup)

These can be removed once the new firmware is verified working:

```
backend/                     ← entire Node.js backend
firmware/                    ← entire PlatformIO project
Edubot.ino                   ← old root-level sketch
audio.cpp / audio.h          ← replaced by Arduino_IDE/audio_manager
communication.cpp / .h       ← replaced by websocket_manager
config.cpp / config.h        ← replaced by Arduino_IDE/config.h
display.cpp / display.h      ← replaced by oled_manager
sensors.cpp / sensors.h      ← DHT11/MAX30100 removed from v2
servo_control.cpp / .h       ← replaced by servo_manager
```

App files that are now unused:
```
Edubot/src/services/aiPipelineService.ts
Edubot/src/services/groqService.ts
Edubot/src/services/elevenLabsService.ts
Edubot/src/services/voiceCommandParser.ts
Edubot/src/services/webSocketService.ts   ← replaced by robotWebSocket.ts
Edubot/app/voice-command.tsx
```

---

## API Keys Required

| Service             | Used By    | Cost                          | Get At                       |
|---------------------|------------|-------------------------------|------------------------------|
| Groq (Whisper)      | ESP32 STT  | Free tier                     | console.groq.com             |
| Groq (LLaMA 3)      | ESP32 AI   | Free tier (same key as above) | console.groq.com             |
| ElevenLabs TTS      | ESP32 TTS  | Free — 10,000 chars/month     | elevenlabs.io                |

The backend no longer needs AssemblyAI or Gemini keys — those can be removed.  
Your existing **ElevenLabs key and voice ID** from `backend/.env` carry over directly to `secrets.h`.

---

## Troubleshooting

### Robot doesn't connect to WiFi
- Check `WIFI_SSID` / `WIFI_PASSWORD` in `secrets.h`
- Ensure 2.4 GHz network (ESP32 doesn't support 5 GHz)

### App can't connect to robot
- Confirm phone and robot are on the same WiFi network
- Try pinging the IP from your phone's browser: `http://<ip>/` (no server — just check connectivity)
- Increase `WIFI_TIMEOUT_MS` in `config.h` if the robot shows WiFi Failed

### No speech detected
- Lower `VAD_THRESHOLD` in `config.h` (try 400–600)
- Check INMP441 wiring: SCK=GPIO12, WS=GPIO11, SD=GPIO10

### MP3 doesn't play
- Check MAX98357A wiring: BCK=GPIO6, LRC=GPIO7, DIN=GPIO8
- Verify `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` are correct in `secrets.h`
- Open Serial Monitor — `[TTS] HTTP error: 401` means bad API key; `[TTS] HTTP error: 422` means bad voice ID

### Servo jitter
- Power servos from a separate 5V supply (not the USB 3.3V rail)
- Add 100µF capacitor across servo power rail

### Build error: "ps_malloc not found"
- Set PSRAM to **OPI PSRAM** in Arduino IDE Board settings
