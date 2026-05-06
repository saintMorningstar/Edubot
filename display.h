#pragma once
#include <Arduino.h>

#define SCREEN_W   128
#define SCREEN_H    64
#define OLED_ADDR  0x3C

extern bool oledOk;

void displaySetup();
void oledMsg(const char* line1, const char* line2 = "");
void oledDrawFace(const String& faceId, bool blinkFrame = false);
void oledDrawHeart(const String& mode);
void oledDrawSensors(float temp, float hum, float bpm, float spo2);
void oledDrawWifiStatus(bool connected, const String& ip = "");
void oledDrawStartup();
