#pragma once
#include <Arduino.h>

// Callbacks
typedef void (*AiResultCb)(const uint8_t* audioData, size_t len, uint8_t r, uint8_t g, uint8_t b);
typedef void (*AiErrorCb)(const char* reason);

void aiSetup();
void aiLoop();

// Kick off standalone HTTP pipeline (non-blocking — runs in FreeRTOS task)
void aiProcess(const uint8_t* wavData, size_t wavLen);

bool aiBusy();

void aiSetResultCallback(AiResultCb cb);
void aiSetErrorCallback(AiErrorCb  cb);
