#include "led_manager.h"
#include "../system/config.h"
#include "../system/states.h"
#include "esp32-hal-rgb-led.h"   // built-in neopixelWrite() — no Adafruit library needed

#define CMD_DURATION_MS  2000
#define BLINK_MS          500
#define NEO_UPDATE_MS      30
#define BRIGHTNESS         80   // 0-255 master brightness for NeoPixel

static bool          _bleConnected = false;
static bool          _cmdActive    = false;
static unsigned long _lastCmdMs   = 0;
static int           _cmdLedPhase = 0;
static unsigned long _cmdLedTimer = 0;
static bool          _blinkState  = false;
static unsigned long _blinkTimer  = 0;
static uint16_t      _rainbowHue  = 0;
static unsigned long _neoTimer    = 0;

// Scale a 0-255 color value by BRIGHTNESS
static inline uint8_t dim(uint8_t v) {
    return (uint8_t)((uint16_t)v * BRIGHTNESS / 255);
}

// Write a dimmed RGB color to the NeoPixel
static void neoWrite(uint8_t r, uint8_t g, uint8_t b) {
    neopixelWrite(NEOPIXEL_PIN, dim(r), dim(g), dim(b));
}

// Simple HSV→RGB for rainbow — hue 0-65535
static void neoRainbow(uint16_t hue) {
    uint8_t h = hue >> 8;
    uint8_t region    = h / 43;
    uint8_t remainder = (h - region * 43) * 6;
    uint8_t q = 255 - remainder;
    uint8_t t = remainder;
    uint8_t r, g, b;
    switch (region) {
        case 0: r=255; g=t;   b=0;   break;
        case 1: r=q;   g=255; b=0;   break;
        case 2: r=0;   g=255; b=t;   break;
        case 3: r=0;   g=q;   b=255; break;
        case 4: r=t;   g=0;   b=255; break;
        default:r=255; g=0;   b=q;   break;
    }
    neoWrite(r, g, b);
}

static void neoForState(RobotState s) {
    switch (s) {
        case WALKING:   neoWrite(  0,  80, 255); break;
        case SLEEPING:  neoWrite(  0,   0,  30); break;
        case LISTENING: neoWrite(  0, 200, 200); break;
        case THINKING:  neoWrite(150,   0, 200); break;
        case SPEAKING:  neoWrite(255, 200,   0); break;
        case DANCING:   break;  // handled by rainbow
        case IDLE:
        default:        neoWrite(  0, 120,   0); break;
    }
}

static unsigned long ledIntervalForState(RobotState s) {
    switch (s) {
        case DANCING:  return 100;
        case WALKING:  return 300;
        case SPEAKING: return 200;
        case THINKING: return 500;
        default:       return 200;
    }
}

void initLEDs() {
    pinMode(LED_STATUS1_PIN, OUTPUT);
    pinMode(LED_STATUS2_PIN, OUTPUT);
    digitalWrite(LED_STATUS1_PIN, LOW);
    digitalWrite(LED_STATUS2_PIN, LOW);
    neoWrite(255, 0, 0);    // red on startup
}

void notifyLEDConnected() {
    _bleConnected = true;
    _cmdActive    = false;
    digitalWrite(LED_STATUS1_PIN, LOW);
    digitalWrite(LED_STATUS2_PIN, LOW);
    neoWrite(0, 200, 0);    // green on connect
}

void notifyLEDDisconnected() {
    _bleConnected = false;
    _cmdActive    = false;
    digitalWrite(LED_STATUS1_PIN, LOW);
    digitalWrite(LED_STATUS2_PIN, LOW);
}

void notifyLEDCommand() {
    _cmdActive = true;
    _lastCmdMs = millis();
}

void updateLEDs() {
    unsigned long now = millis();

    if (!_bleConnected) {
        if (now - _blinkTimer >= BLINK_MS) {
            _blinkTimer = now;
            _blinkState = !_blinkState;
            digitalWrite(LED_STATUS1_PIN, _blinkState ? HIGH : LOW);
            digitalWrite(LED_STATUS2_PIN, _blinkState ? HIGH : LOW);
            if (_blinkState) neoWrite(255, 0, 0); else neoWrite(0, 0, 0);
        }
        return;
    }

    // ── Status LEDs ───────────────────────────────────────────────────────────
    RobotState    s           = getState();
    bool          activeState = (s == WALKING || s == DANCING || s == SPEAKING || s == THINKING);
    unsigned long ledMs       = ledIntervalForState(s);
    bool          shouldBlink = activeState || (_cmdActive && (now - _lastCmdMs) <= CMD_DURATION_MS);

    if (!shouldBlink && _cmdActive) _cmdActive = false;

    if (shouldBlink) {
        if (now - _cmdLedTimer >= ledMs) {
            _cmdLedTimer = now;
            _cmdLedPhase = !_cmdLedPhase;
            digitalWrite(LED_STATUS1_PIN, _cmdLedPhase ? HIGH : LOW);
            digitalWrite(LED_STATUS2_PIN, _cmdLedPhase ? LOW  : HIGH);
        }
    } else {
        digitalWrite(LED_STATUS1_PIN, LOW);
        digitalWrite(LED_STATUS2_PIN, LOW);
    }

    // ── NeoPixel (rate-limited) ───────────────────────────────────────────────
    if (now - _neoTimer < NEO_UPDATE_MS) return;
    _neoTimer = now;

    if (s == DANCING) {
        _rainbowHue += 512;
        neoRainbow(_rainbowHue);
    } else {
        neoForState(s);
    }
}
