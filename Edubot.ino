/*
 * ================================================================
 * EDUBOT — ESP32-S3  |  Ottobot-style Biped + Voice AI Robot
 * ================================================================
 * Pin map (existing hardware):
 *   I2C SDA     → GPIO 21   (OLED SSD1306 + MAX30100)
 *   I2C SCL     → GPIO 22
 *   DHT11       → GPIO 13
 *   Touch       → GPIO 15   (TTP223 module, HIGH = touched)
 *   LED 1       → GPIO 18
 *   LED 2       → GPIO 19
 *   L Hip       → GPIO 32
 *   L Foot      → GPIO 33
 *   L Hand      → GPIO 25
 *   R Hip       → GPIO 27   (reversed)
 *   R Foot      → GPIO 26   (reversed)
 *   R Hand      → GPIO 14   (reversed)
 *
 * I2S Microphone (INMP441):
 *   WS          → GPIO 4
 *   SCK         → GPIO 5
 *   SD          → GPIO 6
 *   L/R         → GND
 *
 * I2S Amplifier (MAX98357A):
 *   LRC         → GPIO 7
 *   BCLK        → GPIO 8
 *   DIN         → GPIO 9
 *   GAIN        → GND  (9 dB)
 *
 * Voice interaction (1-tap):
 *   Tap once → record 3 s → POST to Node.js backend
 *   Backend: AssemblyAI STT → Gemini AI → ElevenLabs TTS
 *   Response WAV plays via MAX98357A
 *
 * HTTP endpoints (port 80):
 *   GET /status
 *   GET /forward?speed=20   GET /backward?speed=20
 *   GET /left               GET /right
 *   GET /stand              GET /wave?side=right
 *   GET /dance
 *   GET /servo?id=0&offset=20
 *   GET /heartrate          GET /heartMode?mode=beating_heart
 *   GET /face?id=happy      POST /face  {"id":"happy_1"}
 *   POST /command           {"action":"expression","data":"happy"}
 *   GET /calibrate
 *
 * Serial calibration commands (115200 baud):
 *   s=stand  t=sweep  f=fwd  b=bwd  l=left  r=right  w=wave  d=dance
 *   n <idx> <val>  — set servo neutral (e.g. "n 2 93")
 *   <0-5> <offset> — move one servo   (e.g. "3 +15")
 * ================================================================
 */

// ── User config ───────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
// Server URL is now stored in NVS. Set it from the app (POST /config)
// or via serial ("u http://192.168.x.x:3000"). Falls back to DEFAULT_BACKEND_URL.

// ── Includes ──────────────────────────────────────────────────
#include <Wire.h>
#include <WiFi.h>
#include "config.h"
#include "servo_control.h"
#include "sensors.h"
#include "display.h"
#include "communication.h"
#include "audio.h"

// Forward declarations
static void handleTapActions();
static void handleVoiceState();
static void updateDisplay();
static void handleSerial();
static void printSerialHelp();

// ── OLED face blink animation ─────────────────────────────────
static unsigned long faceAnimMs      = 0;
static bool          faceBlinkActive = false;
#define FACE_BLINK_INTERVAL_MS  3500
#define FACE_BLINK_HOLD_MS       160

// ── Sensor page rotation ──────────────────────────────────────
static unsigned long lastPageMs = 0;
static uint8_t       pageIndex  = 0;
#define PAGE_INTERVAL_MS  4000

// ── Voice pipeline state machine ──────────────────────────────
enum VoiceState { VOICE_IDLE, VOICE_RECORDING, VOICE_PROCESSING, VOICE_SPEAKING };
static VoiceState voiceState = VOICE_IDLE;

// ── Setup ─────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    Serial.println("\n[EDUBOT] Boot");

    Wire.begin(21, 22);

    displaySetup();
    sensorsSetup();
    servoSetup();
    audioSetup();
    initConfig();                          // load NVS config before WiFi/HTTP
    commSetup(WIFI_SSID, WIFI_PASSWORD);

    Serial.println("[EDUBOT] Ready");
    printSerialHelp();
}

// ── Main loop ─────────────────────────────────────────────────
void loop() {
    commLoop();          // HTTP server + WiFi watchdog
    updateDHT();         // non-blocking, millis-gated
    updateHeartRate();   // non-blocking (pox.update or analog)
    updateTouch();       // debounce + tap sequence detection
    audioLoop();         // I2S record / playback state machine

    handleTapActions();
    handleVoiceState();
    updateDisplay();
    handleSerial();
}

// ── Touch → action dispatch ───────────────────────────────────
static void handleTapActions() {
    if (!tapReady) return;
    tapReady = false;

    Serial.printf("[Tap] %d tap(s)\n", tapCount);

    switch (tapCount) {
        case 1:
            // Start a voice interaction if not already busy
            if (voiceState == VOICE_IDLE && audioGetState() == AUDIO_IDLE) {
                if (audioStartRecord()) {
                    voiceState    = VOICE_RECORDING;
                    currentFaceId = "thinking";
                    currentHeartMode = "";
                    oledDrawFace(currentFaceId, false);
                    Serial.println("[Voice] Recording started");
                }
            } else {
                // Already busy — wave as acknowledgement
                waveRight();
            }
            break;

        case 2:
            tap2Routine();
            break;

        case 3:
            tap3Routine();
            break;

        default:
            dance();
            break;
    }
}

// ── Voice pipeline state machine ──────────────────────────────
static void handleVoiceState() {
    switch (voiceState) {

        case VOICE_IDLE:
            break;

        case VOICE_RECORDING:
            // audioLoop() fills the buffer; when done it sets recReady
            if (audioRecordingReady()) {
                voiceState = VOICE_PROCESSING;
                currentFaceId = "thinking";
                oledDrawFace(currentFaceId, false);

                const uint8_t* buf = nullptr;
                size_t         len = 0;
                audioConsumeRecording(&buf, &len);

                Serial.printf("[Voice] Sending %u bytes to backend\n", (unsigned)len);
                bool ok = sendAudioToBackend(buf, len);  // blocking ~5-15 s

                if (ok) {
                    voiceState    = VOICE_SPEAKING;
                    currentFaceId = "excited";
                    oledDrawFace(currentFaceId, false);
                    waveRight();   // happy reaction while audio begins
                } else {
                    voiceState    = VOICE_IDLE;
                    currentFaceId = "sad";
                    oledDrawFace(currentFaceId, false);
                    Serial.println("[Voice] Backend request failed");
                }
            }
            break;

        case VOICE_SPEAKING:
            // Wait until audioLoop() finishes playback
            if (audioGetState() == AUDIO_IDLE) {
                voiceState    = VOICE_IDLE;
                currentFaceId = "happy";
                oledDrawFace(currentFaceId, false);
                Serial.println("[Voice] Done speaking");
            }
            break;

        default:
            voiceState = VOICE_IDLE;
            break;
    }
}

// ── Display update ────────────────────────────────────────────
static void updateDisplay() {
    if (!oledOk) return;
    unsigned long now = millis();

    // Face blink animation takes priority
    if (currentFaceId.length() > 0) {
        if (!faceBlinkActive && now - faceAnimMs >= FACE_BLINK_INTERVAL_MS) {
            faceBlinkActive = true;
            faceAnimMs      = now;
            oledDrawFace(currentFaceId, true);   // eyes closed
        } else if (faceBlinkActive && now - faceAnimMs >= FACE_BLINK_HOLD_MS) {
            faceBlinkActive = false;
            faceAnimMs      = now;
            oledDrawFace(currentFaceId, false);  // eyes open
        }
        return;
    }

    // Heart visualisation mode
    if (currentHeartMode.length() > 0) {
        if (now - lastPageMs >= 500) {
            lastPageMs = now;
            oledDrawHeart(currentHeartMode);
        }
        return;
    }

    // Rotating info pages
    if (now - lastPageMs >= PAGE_INTERVAL_MS) {
        lastPageMs = now;
        switch (pageIndex) {
            case 0:
                oledDrawWifiStatus(WiFi.status() == WL_CONNECTED,
                                   WiFi.localIP().toString());
                break;
            case 1:
                oledDrawSensors(temperature, humidity, heartRate, spO2);
                break;
        }
        pageIndex = (pageIndex + 1) % 2;
    }
}

// ── Serial calibration interface ──────────────────────────────
static void handleSerial() {
    if (!Serial.available()) return;
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) return;

    char cmd = line[0];
    if      (cmd == 's') { standPose(); Serial.println("[S] Stand"); }
    else if (cmd == 't') { calibrationSweep(); }
    else if (cmd == 'f') { for (int i = 0; i < 3; i++) walkForward(20); standPose(); }
    else if (cmd == 'b') { for (int i = 0; i < 3; i++) walkBackward(20); standPose(); }
    else if (cmd == 'l') { turnLeft(); }
    else if (cmd == 'r') { turnRight(); }
    else if (cmd == 'w') { waveRight(); }
    else if (cmd == 'd') { dance(); }
    else if (cmd == 'v') {
        // Manual voice trigger for testing
        if (voiceState == VOICE_IDLE && audioGetState() == AUDIO_IDLE) {
            audioStartRecord();
            voiceState    = VOICE_RECORDING;
            currentFaceId = "thinking";
        } else {
            Serial.println("[V] Voice busy");
        }
    }
    else if (cmd == 'u') {
        // u           → print current server URL
        // u <url>     → set and persist a new server URL
        if (line.length() > 2) {
            String newUrl = line.substring(2);
            newUrl.trim();
            saveServerUrl(newUrl);
            Serial.printf("[CFG] server_url → %s\n", newUrl.c_str());
        } else {
            Serial.printf("[CFG] server_url = %s%s\n",
                          getServerUrl().c_str(),
                          hasServerUrl() ? "" : " (default)");
        }
    }
    else if (cmd == 'n') {
        int idx = 0, val = 90;
        sscanf(line.c_str() + 1, " %d %d", &idx, &val);
        if (idx >= 0 && idx < SERVO_COUNT && val >= 50 && val <= 130) {
            SCFG[idx].neutral = (int16_t)val;
            Serial.printf("[CFG] Servo %d neutral → %d\n", idx, val);
            standPose();
        }
    }
    else if (cmd >= '0' && cmd <= '5') {
        int idx = cmd - '0';
        int off = 0;
        sscanf(line.c_str() + 1, " %d", &off);
        servoWriteOffset(idx, off);
        Serial.printf("[MOVE] Servo %d offset=%+d\n", idx, off);
    }
    else {
        printSerialHelp();
    }
}

static void printSerialHelp() {
    Serial.println("──────────────────────────────────────────────");
    Serial.println(" s=stand  t=sweep  f=fwd  b=bwd  l=left");
    Serial.println(" r=right  w=wave   d=dance  v=voice");
    Serial.println(" u           — show server URL");
    Serial.println(" u <url>     — set server URL (saved to NVS)");
    Serial.println(" n <idx> <val>   — set servo neutral");
    Serial.println(" <0-5> <offset>  — move single servo");
    Serial.println("──────────────────────────────────────────────");
}
