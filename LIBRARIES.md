# Edubot — Required Libraries

Install all of these through Arduino IDE → Tools → Manage Libraries,
or via PlatformIO before uploading.

---

## Board Package (install first)

| Package | Source |
|---|---|
| esp32 by Espressif Systems ≥ 3.0.0 | Arduino Boards Manager |

URL to add in Preferences → Additional Board URLs:
`https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`

---

## Libraries (Arduino Library Manager)

| Library | Author | Purpose |
|---|---|---|
| Adafruit SSD1306 | Adafruit | OLED driver |
| Adafruit GFX Library | Adafruit | Graphics primitives (SSD1306 dependency) |
| DHT sensor library | Adafruit | DHT11 temperature & humidity |
| Adafruit Unified Sensor | Adafruit | DHT dependency |
| ESP32Servo | Kevin Harrington | Servo PWM on ESP32 |
| MAX30100lib | OXullo Intersecans | Heart rate / SpO2 (PulseOximeter API) |

> Search exact names in the Library Manager.

---

## Board Settings (Arduino IDE)

| Setting | Value |
|---|---|
| Board | ESP32 Dev Module |
| Upload Speed | 921600 |
| CPU Frequency | 240 MHz (WiFi/BT) |
| Flash Mode | QIO |
| Flash Size | 4MB (32Mb) |
| Partition Scheme | Default 4MB with spiffs |
| Port | (your COM port) |

---

## Quick Compile Test

After installing all libraries, open `Edubot.ino`, set your
SSID/password in the two `const char*` lines near the top, and hit
**Verify** (✓). Zero errors = ready to upload.

---

## HTTP API Reference

| Endpoint | Method | Params | Response |
|---|---|---|---|
| `/status` | GET | — | JSON with temp, humidity, HR, SpO2, IP |
| `/servo` | GET | `angle=0..180` | moves Servo 1 |
| `/grip` | GET | `state=open\|close` | moves Servo 2 |
| `/beep` | GET | — | triggers buzzer |
