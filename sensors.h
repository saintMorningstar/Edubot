#pragma once
#include <Arduino.h>

#define PIN_DHT11   13
#define PIN_TOUCH   15

// MAX30100 is on shared I2C (SDA=21, SCL=22)
// If you have a simple analog pulse sensor instead, wire it to GPIO 34 (input-only)
// and set USE_ANALOG_HR true below.
#define USE_ANALOG_HR  false
#define PIN_HR_ANALOG  34   // used only when USE_ANALOG_HR == true

extern float temperature;
extern float humidity;
extern float heartRate;
extern float spO2;
extern bool  poxOk;

// Touch tap state (read by main loop / communication)
extern volatile uint8_t tapCount;
extern volatile bool    tapReady;   // true when a tap sequence is complete

void sensorsSetup();
void updateDHT();       // call from loop, non-blocking (millis gated)
void updateHeartRate(); // call from loop, non-blocking (pox.update or analog read)
void updateTouch();     // call from loop, debounce + tap counting
