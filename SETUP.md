# Edubot — Setup Instructions

## 1. Node.js Backend

### Prerequisites
- Node.js 18 LTS or later
- API keys for AssemblyAI, Google Gemini, and ElevenLabs

### Steps

```bash
cd backend
cp .env.example .env
# Edit .env and paste in your API keys
npm install
npm start
```

The server listens on **port 3000** by default.  
Test it is running: `curl http://localhost:3000/health`

### API Keys
| Service | Sign up | Free tier |
|---------|---------|-----------|
| AssemblyAI | https://www.assemblyai.com/ | 100 hours/month |
| Google Gemini | https://aistudio.google.com/app/apikey | 15 RPM free |
| ElevenLabs | https://elevenlabs.io/ | 10 000 chars/month |

### Google TTS fallback (optional)
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Cloud Text-to-Speech API**.
3. Create a service account → download the JSON key.
4. Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json` in `.env`.

---

## 2. ESP32-S3 Firmware

### Prerequisites
- Arduino IDE 2.x (or PlatformIO)
- ESP32 board package: **Espressif Systems ESP32** (v2.0.14 or later)

### Required Arduino Libraries
Install via **Sketch → Include Library → Manage Libraries**:

| Library | Version |
|---------|---------|
| ESP32Servo | ≥ 0.13.0 |
| Adafruit SSD1306 | ≥ 2.5.7 |
| Adafruit GFX Library | ≥ 1.11.9 |
| DHT sensor library (Adafruit) | ≥ 1.4.6 |
| ArduinoJson | ≥ 7.x |
| MAX30100lib | ≥ 1.2.1 |

The I2S driver (`driver/i2s.h`) is part of the ESP32 Arduino core — no separate install needed.

### Board Settings (Arduino IDE)
- Board: **ESP32S3 Dev Module**
- Upload Speed: **921600**
- CPU Frequency: **240 MHz**
- Flash Size: **8MB** (or match your module)
- Partition Scheme: **Huge APP (3MB No OTA/1MB SPIFFS)**  
  *(needed for the large audio buffer)*
- PSRAM: **OPI PSRAM** (enable if your S3 module has PSRAM for larger audio buffers)

### Configuration (Edubot.ino)
Edit the top of `Edubot.ino`:
```cpp
const char* WIFI_SSID     = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* BACKEND_URL   = "http://192.168.1.100:3000";  // your server's LAN IP
```

Find your server's IP with `ipconfig` (Windows) or `ifconfig` (Linux/Mac).

### Flash
1. Connect ESP32-S3 via USB.
2. Open `Edubot.ino` in Arduino IDE.
3. Select the correct **Port**.
4. Click **Upload**.
5. Open **Serial Monitor** at **115200 baud** to watch boot logs.

---

## 3. Voice Interaction

1. Robot boots, connects to WiFi, OLED shows IP address.
2. **Single tap** the touch sensor → OLED shows thinking face.
3. Speak clearly for up to 3 seconds.
4. Recording stops automatically → audio is sent to backend.
5. Backend pipeline runs (~5–15 s depending on network/API):
   - AssemblyAI → transcript
   - Gemini → child-friendly reply
   - ElevenLabs → WAV audio
6. Robot plays the response through the MAX98357A speaker.
7. OLED shows a happy face → ready for next interaction.

**Serial monitor shortcut:** Type `v` + Enter to trigger a voice capture without touching.

---

## 4. HTTP API (companion app)

The robot also acts as an HTTP server on port 80.

```
POST http://<robot-ip>/command
Content-Type: application/json

{"action": "expression", "data": "happy"}
{"action": "move", "data": "dance"}
{"action": "stop"}
```

Other GET routes: `/status`, `/forward`, `/backward`, `/left`, `/right`, `/stand`, `/wave`, `/dance`, `/face?id=happy`, `/heartrate`.
