#pragma once
#include <Arduino.h>
#include <ESPAsyncWebServer.h>

// Callbacks set by main.cpp
typedef void (*WsAudioCb)(const uint8_t* data, size_t len);
typedef void (*WsTextCb)(const char* json);

void wsSetup(AsyncWebServer* server);
void wsLoop();

bool wsPhoneConnected();
bool wsPhoneReady();       // HELLO handshake completed

void wsSendJson(const char* json);
void wsSendAudio(const uint8_t* data, size_t len);  // sends AUDIO_REQUEST_START + binary

void wsSetAudioCallback(WsAudioCb cb);
void wsSetTextCallback(WsTextCb cb);
