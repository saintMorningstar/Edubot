#pragma once
#include <Arduino.h>
#include <WebServer.h>

#define PIN_LED1  18
#define PIN_LED2  19

extern WebServer   server;
extern String      currentFaceId;
extern String      currentHeartMode;

void commSetup(const char* ssid, const char* pass);
void commLoop();                // call every loop iteration
void checkWiFiConnection();     // call periodically (millis gated)

// Send WAV buffer to backend AI pipeline; plays response via audioPlay().
// Blocks until the full round-trip completes (typically 5–15 s).
// Returns true if audio was received and queued for playback.
bool sendAudioToBackend(const uint8_t* wavBuf, size_t wavLen);

// LED helpers
void ledsOff();
void ledsOn();
void ledsBlink(uint8_t count = 1, uint16_t onMs = 80, uint16_t offMs = 80);
void ledsStartBlinkTask();      // async blink during WiFi connect
void ledsStopBlinkTask();

// Called by HTTP handlers to flash LEDs on command receipt
void ledAck();
