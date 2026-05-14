# Edubot — Required Arduino Libraries

## Board Setup

1. Open Arduino IDE → Preferences → Additional Board URLs, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Tools → Board Manager → search **esp32** → install **esp32 by Espressif Systems** (v2.0.x)

## Board Settings

| Setting            | Value                                |
|--------------------|--------------------------------------|
| Board              | ESP32S3 Dev Module                   |
| Flash Size         | 16MB (128Mb)                         |
| Partition Scheme   | 16M Flash (3MB APP / 9.9MB FATFS)    |
| PSRAM              | OPI PSRAM                            |
| Upload Speed       | 921600                               |
| CPU Frequency      | 240MHz (WiFi)                        |
| Arduino Runs On    | Core 1                               |
| Events Run On      | Core 1                               |

> **PSRAM is required.** The audio buffer and AI response buffer use `ps_malloc()` — disabling PSRAM will cause crashes.

---

## Required Libraries

Install all via **Sketch → Include Library → Manage Libraries**

### Core

| Library                   | Author              | Minimum Version | Notes                                  |
|---------------------------|---------------------|-----------------|----------------------------------------|
| **ArduinoJson**           | Benoit Blanchon     | 6.21.0          | Use v6, NOT v7                         |
| **WebSockets**            | Markus Sattler      | 2.4.0           | Search "WebSockets" by Links2004       |
| **Adafruit NeoPixel**     | Adafruit            | 1.12.0          | RGB LED driver                         |
| **Adafruit SSD1306**      | Adafruit            | 2.5.9           | OLED driver                            |
| **Adafruit GFX Library**  | Adafruit            | 1.11.9          | Required by SSD1306                    |
| **ESP32Servo**            | Kevin Harrington    | 3.0.0           | Servo control on ESP32                 |
| **ESP8266Audio**          | Earle Philhower     | 1.9.7           | MP3 decode + I2S playback              |

### Already in ESP32 Arduino Core (no install needed)

- `WiFi.h`
- `HTTPClient.h`
- `WiFiClientSecure.h`
- `driver/i2s.h`
- `esp_sleep.h`

---

## Library Install Commands (alternative via Arduino CLI)

```bash
arduino-cli lib install "ArduinoJson"
arduino-cli lib install "WebSockets"
arduino-cli lib install "Adafruit NeoPixel"
arduino-cli lib install "Adafruit SSD1306"
arduino-cli lib install "Adafruit GFX Library"
arduino-cli lib install "ESP32Servo"
arduino-cli lib install "ESP8266Audio"
```

---

## secrets.h Setup

Copy `secrets.h` template and fill in:

```cpp
#define WIFI_SSID             "YourNetworkName"
#define WIFI_PASSWORD         "YourPassword"
#define GROQ_API_KEY          "gsk_..."           // https://console.groq.com
#define ELEVENLABS_API_KEY    "your_key_here"     // https://elevenlabs.io → Profile → API Key
#define ELEVENLABS_VOICE_ID   "your_voice_id"     // ElevenLabs Voice Library → any voice → ID
```

**ElevenLabs free tier:** 10,000 characters/month. Sign up at [elevenlabs.io](https://elevenlabs.io) — no credit card required for the free plan.

---

## Memory Notes

- The firmware uses `ps_malloc()` for the audio recording buffer (~192 KB).
- PSRAM must be enabled or you will get a boot panic.
- Recommended: leave PSRAM set to **OPI PSRAM** for ESP32-S3 N16R8.
- The AI conversation history is kept in heap (`DynamicJsonDocument`) — keep responses short.
