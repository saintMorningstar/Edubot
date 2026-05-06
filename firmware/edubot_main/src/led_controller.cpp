#include "led_controller.h"
#include "config.h"
#include <Adafruit_NeoPixel.h>

static Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

// Base state
static uint8_t  baseR = 0, baseG = 0, baseB = 0;
static LedMode  baseMode = LED_OFF;

// Animation tick
static unsigned long lastTick  = 0;
static uint8_t  brightness     = 0;
static int8_t   breatheDir     = 1;
static bool     blinkOn        = true;

// Temporary override
static bool          overrideActive = false;
static unsigned long overrideStart  = 0;
static uint32_t      overrideDur    = 0;
static uint8_t       ovR = 0, ovG = 0, ovB = 0;

static inline void writePixel(uint8_t r, uint8_t g, uint8_t b) {
    strip.setPixelColor(0, strip.Color(r, g, b));
    strip.show();
}

void ledSetup() {
    strip.begin();
    strip.setBrightness(200);
    strip.clear();
    strip.show();
}

void ledSetState(uint8_t r, uint8_t g, uint8_t b, LedMode mode) {
    baseR = r; baseG = g; baseB = b;
    baseMode   = mode;
    brightness = (mode == LED_BREATHE) ? 0 : 255;
    blinkOn    = true;
    lastTick   = 0;
}

void ledOverride(uint8_t r, uint8_t g, uint8_t b, uint32_t durationMs) {
    ovR = r; ovG = g; ovB = b;
    overrideStart  = millis();
    overrideDur    = durationMs;
    overrideActive = true;
}

void ledForceOff() {
    overrideActive = false;
    baseMode = LED_OFF;
    strip.clear();
    strip.show();
}

void ledLoop() {
    unsigned long now = millis();

    if (overrideActive) {
        if ((now - overrideStart) >= overrideDur) {
            overrideActive = false;
        } else {
            writePixel(ovR, ovG, ovB);
            return;
        }
    }

    switch (baseMode) {
        case LED_OFF:
            strip.clear();
            strip.show();
            return;

        case LED_SOLID:
            writePixel(baseR, baseG, baseB);
            return;

        case LED_BLINK:
            if (now - lastTick >= 350) {
                lastTick = now;
                blinkOn  = !blinkOn;
                if (blinkOn) writePixel(baseR, baseG, baseB);
                else         { strip.clear(); strip.show(); }
            }
            return;

        case LED_BREATHE: {
            if (now - lastTick >= 10) {
                lastTick   = now;
                brightness = (uint8_t)((int)brightness + breatheDir * 3);
                if (brightness >= 252) { brightness = 252; breatheDir = -1; }
                if (brightness <= 3)   { brightness = 3;   breatheDir =  1; }
                float f = brightness / 255.0f;
                writePixel((uint8_t)(baseR * f),
                           (uint8_t)(baseG * f),
                           (uint8_t)(baseB * f));
            }
            return;
        }
    }
}
