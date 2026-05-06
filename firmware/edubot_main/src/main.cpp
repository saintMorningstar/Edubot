#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

#include "config.h"
#include "button_manager.h"
#include "led_controller.h"
#include "display_manager.h"
#include "audio_manager.h"
#include "wifi_manager.h"
#include "websocket_manager.h"
#include "ai_manager.h"
#include "power_manager.h"

// ─── Global state ─────────────────────────────────────────────────────────────
static SystemState    sysState = STATE_BOOTING;
static AsyncWebServer httpServer(WS_PORT);

// ─── State helpers ────────────────────────────────────────────────────────────
static const char* modeName() {
    return (wsPhoneConnected() && wsPhoneReady()) ? "Paired" : "Standalone";
}

static void goListening() {
    if (wsPhoneConnected() && wsPhoneReady()) {
        sysState = STATE_PAIRED_IDLE;
        ledSetState(0, 255, 255, LED_SOLID);           // cyan
        displayShowState("Paired", "Idle");
    } else {
        sysState = STATE_STANDALONE_LISTENING;
        ledSetState(0, 80, 255, LED_SOLID);            // soft blue
        displayShowState("Standalone", "Listening");
    }
}

static void goError(const char* msg) {
    sysState = STATE_ERROR;
    ledSetState(255, 0, 0, LED_BLINK);                 // red fast blink
    displayShowError(msg);
    Serial.printf("[ERR] %s\n", msg);
}

// ─── AI callbacks (called from aiLoop / wsManager — main core) ───────────────
static void onAiResult(const uint8_t* data, size_t len, uint8_t r, uint8_t g, uint8_t b) {
    if (r != 255 || g != 255 || b != 255) {
        ledOverride(r, g, b, 8000);
    }
    audioPlay(data, len);
    sysState = STATE_SPEAKING;
    ledSetState(0, 220, 0, LED_SOLID);                 // green
    displayShowState(modeName(), "Speaking");
}

static void onAiError(const char* reason) {
    goError(reason);
}

// Paired mode: phone sends audio response back via WebSocket
static void onWsAudio(const uint8_t* data, size_t len) {
    if (sysState != STATE_PAIRED_PROCESSING) return;
    onAiResult(data, len, 255, 255, 255);
}

// Paired mode: phone sends RESPONSE_TEXT with colour
static void onWsText(const char* json) {
    // Parse optional color from RESPONSE_TEXT
    // {"type":"RESPONSE_TEXT","text":"...","color":[R,G,B]}
    // Colour is applied to LED; the audio will follow in onWsAudio
    JsonDocument doc;
    if (deserializeJson(doc, json) == DeserializationError::Ok) {
        if (doc["color"].is<JsonArray>()) {
            uint8_t r = doc["color"][0] | 255;
            uint8_t g = doc["color"][1] | 255;
            uint8_t b = doc["color"][2] | 255;
            ledOverride(r, g, b, 8000);
        }
    }
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println("\n========== EDUBOT BOOT ==========");

    powerSetup();

    if (powerWokeFromSleep()) {
        Serial.println("[PWR] Woke from deep sleep");
    }

    ledSetup();
    ledSetState(0, 80, 255, LED_BREATHE);              // boot: soft blue breathing

    displaySetup();
    displayShowBoot("Initialising...");

    buttonSetup();
    audioSetup();
    aiSetup();

    aiSetResultCallback(onAiResult);
    aiSetErrorCallback(onAiError);

    // WiFi
    sysState = STATE_WIFI_CONNECTING;
    ledSetState(255, 200, 0, LED_BLINK);               // yellow blink
    displayShowBoot("Connecting WiFi...");
    wifiSetup();

    // WebSocket server starts now; connections arrive after WiFi is up
    wsSetup(&httpServer);
    wsSetAudioCallback(onWsAudio);
    wsSetTextCallback(onWsText);
    httpServer.begin();
    Serial.printf("[HTTP] Server on port %d\n", WS_PORT);

    Serial.println("[BOOT] Ready");
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
    // ── Poll all managers ────────────────────────────────────────────────────
    ButtonEvent btn = buttonLoop();
    ledLoop();
    audioLoop();
    wsLoop();
    aiLoop();

    // ── Long press → sleep (always, regardless of state) ────────────────────
    if (btn == BTN_LONG_PRESS) {
        powerEnterSleep();
        return;                   // never reached
    }

    // ── WiFi connect phase ───────────────────────────────────────────────────
    if (sysState == STATE_WIFI_CONNECTING) {
        bool conn    = wifiLoop();
        bool timeout = wifiTimedOut();

        if (conn) {
            displayShowIP(wifiGetIP(), false);
            goListening();
        } else if (timeout) {
            Serial.println("[WiFi] No connection — standalone without AI");
            displayShowBoot("No WiFi — limited");
            delay(1200);
            goListening();
        }
        return;
    }

    // ── Detect phone connection/disconnection while listening ────────────────
    if (sysState == STATE_STANDALONE_LISTENING && wsPhoneConnected() && wsPhoneReady()) {
        sysState = STATE_PAIRED_IDLE;
        ledSetState(0, 255, 255, LED_SOLID);
        displayShowState("Paired", "Idle");
    }
    if (sysState == STATE_PAIRED_IDLE && !(wsPhoneConnected() && wsPhoneReady())) {
        sysState = STATE_STANDALONE_LISTENING;
        ledSetState(0, 80, 255, LED_SOLID);
        displayShowState("Standalone", "Listening");
    }

    // ── State machine ────────────────────────────────────────────────────────
    switch (sysState) {

        // ── LISTENING (short press → start recording) ────────────────────────
        case STATE_STANDALONE_LISTENING:
        case STATE_PAIRED_IDLE:
            if (btn == BTN_SHORT_PRESS) {
                if (audioStartRecord()) {
                    sysState = STATE_RECORDING;
                    ledSetState(220, 0, 0, LED_SOLID);      // red
                    displayShowState(modeName(), "Recording");
                } else {
                    goError("MIC_INIT_FAIL");
                }
            }
            break;

        // ── RECORDING (short press again → stop early, or auto-stops) ────────
        case STATE_RECORDING:
            if (btn == BTN_SHORT_PRESS) {
                audioStopRecord();
            }
            if (audioRecordingReady()) {
                const uint8_t* buf;
                size_t len;
                audioConsumeRecording(&buf, &len);

                if (wsPhoneConnected() && wsPhoneReady()) {
                    sysState = STATE_PAIRED_PROCESSING;
                    ledSetState(255, 100, 0, LED_BREATHE);  // orange
                    displayShowState("Paired", "Thinking...");
                    wsSendAudio(buf, len);
                } else {
                    if (!wifiConnected()) {
                        goError("NO_WIFI");
                        break;
                    }
                    sysState = STATE_STANDALONE_PROCESSING;
                    ledSetState(255, 100, 0, LED_BREATHE);  // orange
                    displayShowState("Standalone", "Thinking...");
                    aiProcess(buf, len);
                }
            }
            break;

        // ── PROCESSING (waiting for AI response) ─────────────────────────────
        // onAiResult() / onWsAudio() callbacks handle the transition to SPEAKING
        case STATE_STANDALONE_PROCESSING:
        case STATE_PAIRED_PROCESSING:
            break;

        // ── SPEAKING (wait for audio to finish) ──────────────────────────────
        case STATE_SPEAKING:
            if (audioPlaybackJustFinished()) {
                goListening();
            }
            break;

        // ── ERROR (short press to dismiss) ───────────────────────────────────
        case STATE_ERROR:
            if (btn == BTN_SHORT_PRESS) {
                goListening();
            }
            break;

        default: break;
    }
}
