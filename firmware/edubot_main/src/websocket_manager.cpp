#include "websocket_manager.h"
#include "config.h"
#include <ArduinoJson.h>

static AsyncWebSocket ws("/ws");

static uint32_t       clientId    = 0;
static bool           phoneConn   = false;
static bool           phoneReady  = false;
static unsigned long  lastPing    = 0;

// Incoming binary audio accumulation
static uint8_t*       rxBuf      = nullptr;
static size_t         rxExpected = 0;
static size_t         rxPos      = 0;
static bool           rxPending  = false;

static WsAudioCb audioCb = nullptr;
static WsTextCb  textCb  = nullptr;

// ─── Send helpers ──────────────────────────────────────────────────────────
void wsSendJson(const char* json) {
    if (!phoneConn) return;
    ws.text(clientId, json);
}

void wsSendAudio(const uint8_t* data, size_t len) {
    if (!phoneConn || !phoneReady) return;

    // 1. Header JSON
    char hdr[128];
    snprintf(hdr, sizeof(hdr),
             "{\"type\":\"AUDIO_REQUEST_START\",\"format\":\"wav\",\"size\":%u}",
             (unsigned)len);
    ws.text(clientId, hdr);

    // 2. Binary data (ESPAsyncWebServer splits into frames automatically)
    ws.binary(clientId, data, len);

    Serial.printf("[WS] Sent %u bytes audio to phone\n", (unsigned)len);
}

// ─── Event handler ─────────────────────────────────────────────────────────
static void onWsEvent(AsyncWebSocket* server,
                      AsyncWebSocketClient* client,
                      AwsEventType type,
                      void* arg,
                      uint8_t* data,
                      size_t len)
{
    switch (type) {
        case WS_EVT_CONNECT:
            clientId   = client->id();
            phoneConn  = true;
            phoneReady = false;
            Serial.printf("[WS] Phone connected — client #%u\n", clientId);
            wsSendJson("{\"type\":\"READY\"}");
            break;

        case WS_EVT_DISCONNECT:
            phoneConn  = false;
            phoneReady = false;
            rxPending  = false;
            if (rxBuf) { free(rxBuf); rxBuf = nullptr; }
            Serial.println("[WS] Phone disconnected");
            break;

        case WS_EVT_ERROR:
            Serial.printf("[WS] Error: client #%u\n", client->id());
            break;

        case WS_EVT_DATA: {
            AwsFrameInfo* info = (AwsFrameInfo*)arg;

            // ── Text frame ──
            if (info->opcode == WS_TEXT) {
                char buf[512];
                size_t copyLen = min(len, sizeof(buf) - 1);
                memcpy(buf, data, copyLen);
                buf[copyLen] = '\0';

                JsonDocument doc;
                if (deserializeJson(doc, buf) != DeserializationError::Ok) break;
                const char* msgType = doc["type"] | "";

                if (strcmp(msgType, "HELLO") == 0) {
                    phoneReady = true;
                    Serial.println("[WS] Phone HELLO — paired mode active");
                    wsSendJson("{\"type\":\"READY\"}");

                } else if (strcmp(msgType, "RESPONSE_AUDIO_START") == 0) {
                    rxExpected = doc["size"] | 0;
                    if (rxExpected > 0 && rxExpected < 1024 * 512) {  // max 512 KB
                        if (rxBuf) free(rxBuf);
                        rxBuf = (uint8_t*)ps_malloc(rxExpected);
                        if (!rxBuf) rxBuf = (uint8_t*)malloc(rxExpected);
                        rxPos     = 0;
                        rxPending = (rxBuf != nullptr);
                    }

                } else if (strcmp(msgType, "RESPONSE_AUDIO_END") == 0) {
                    if (rxPending && rxBuf && audioCb) {
                        audioCb(rxBuf, rxPos);
                    }
                    rxPending = false;

                } else if (strcmp(msgType, "PONG") == 0) {
                    // heartbeat acknowledged

                } else if (strcmp(msgType, "ERROR") == 0) {
                    Serial.printf("[WS] Remote error: %s\n", doc["reason"] | "unknown");
                    if (textCb) textCb(buf);

                } else {
                    if (textCb) textCb(buf);
                }
            }
            // ── Binary frame (incoming audio chunks) ──
            else if (info->opcode == WS_BINARY && rxPending && rxBuf) {
                size_t canWrite = rxExpected - rxPos;
                size_t toCopy   = min(len, canWrite);
                memcpy(rxBuf + rxPos, data, toCopy);
                rxPos += toCopy;
            }
            break;
        }
        default: break;
    }
}

// ─── Public API ────────────────────────────────────────────────────────────
void wsSetup(AsyncWebServer* server) {
    ws.onEvent(onWsEvent);
    server->addHandler(&ws);
    Serial.printf("[WS] WebSocket ready at ws://<ip>:%d/ws\n", WS_PORT);
}

void wsLoop() {
    ws.cleanupClients();

    // Periodic ping
    if (phoneConn && (millis() - lastPing) >= WS_HEARTBEAT_MS) {
        lastPing = millis();
        wsSendJson("{\"type\":\"PING\"}");
    }
}

bool wsPhoneConnected() { return phoneConn; }
bool wsPhoneReady()     { return phoneReady; }

void wsSetAudioCallback(WsAudioCb cb) { audioCb = cb; }
void wsSetTextCallback(WsTextCb cb)   { textCb  = cb; }
