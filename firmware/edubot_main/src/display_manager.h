#pragma once
#include <Arduino.h>

void displaySetup();
void displayClear();
void displayShowBoot(const char* msg);
void displayShowIP(const char* ip, bool pairedAvailable);
void displayShowState(const char* mode, const char* stateLine);
void displayShowError(const char* msg);
void displaySleepAnimation();   // ~3 s blocking animation, then blanks screen
