#pragma once
#include <Arduino.h>

enum LedMode { LED_OFF, LED_SOLID, LED_BLINK, LED_BREATHE };

void ledSetup();
void ledSetState(uint8_t r, uint8_t g, uint8_t b, LedMode mode);

// Temporarily override with a solid colour for durationMs, then revert
void ledOverride(uint8_t r, uint8_t g, uint8_t b, uint32_t durationMs);

void ledLoop();
void ledForceOff();   // immediate off, clears override (used before sleep)
