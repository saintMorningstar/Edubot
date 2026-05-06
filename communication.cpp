#include "communication.h"
#include "config.h"
#include "servo_control.h"
#include "sensors.h"
#include "display.h"
#include "audio.h"
#include <WiFi.h>
#include <HTTPClient.h>

WebServer server(80);
String    currentFaceId    = "";
String    currentHeartMode = "";

static const char* _ssid = nullptr;
static const char* _pass = nullptr;

static unsigned long lastWiFiCheckMs = 0;
#define WIFI_CHECK_INTERVAL  5000
#define WIFI_TIMEOUT_MS     12000

// ── LED helpers ───────────────────────────────────────────────
void ledsOff()  { digitalWrite(PIN_LED1, LOW);  digitalWrite(PIN_LED2, LOW);  }
void ledsOn()   { digitalWrite(PIN_LED1, HIGH); digitalWrite(PIN_LED2, HIGH); }

void ledsBlink(uint8_t count, uint16_t onMs, uint16_t offMs) {
    for (uint8_t i = 0; i < count; i++) {
        ledsOn();  delay(onMs);
        ledsOff(); if (i < count - 1) delay(offMs);
    }
}

void ledAck() { ledsBlink(2, 60, 60); }

// Called during WiFi connect loop
void ledsStartBlinkTask() { /* handled inline in setupWiFi */ }
void ledsStopBlinkTask()  { /* handled inline in setupWiFi */ }

// ── CORS header ───────────────────────────────────────────────
static void addCors() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
}

static inline int clampInt(int v, int lo, int hi) {
    return v < lo ? lo : v > hi ? hi : v;
}

// ── Status JSON ───────────────────────────────────────────────
static String buildStatusJson() {
    String j = "{";
    j += "\"ip\":\""        + WiFi.localIP().toString() + "\",";
    j += "\"rssi\":"        + String(WiFi.RSSI())       + ",";
    j += "\"temperature\":" + String(temperature, 1)    + ",";
    j += "\"humidity\":"    + String(humidity, 1)       + ",";
    j += "\"heart_rate\":"  + String(heartRate, 1)      + ",";
    j += "\"spo2\":"        + String(spO2, 1)           + ",";
    j += "\"face\":\""      + currentFaceId             + "\",";
    j += "\"heartMode\":\"" + currentHeartMode          + "\",";
    j += "\"sensors\":{\"dht11\":";
    j += (!isnan(temperature) ? "true" : "false");
    j += ",\"hr\":";
    j += (poxOk ? "true" : "false");
    j += "}}";
    return j;
}

// ── HTTP handlers ─────────────────────────────────────────────
static void handleStatus() {
    ledAck();
    addCors();
    server.send(200, "application/json", buildStatusJson());
}

static void handleForward() {
    int amp = server.hasArg("speed") ?
              clampInt(server.arg("speed").toInt(), 5, 45) : 20;
    ledAck();
    walkForward(amp);
    standPose();
    addCors();
    server.send(200, "application/json",
                "{\"cmd\":\"forward\",\"amp\":" + String(amp) + "}");
}

static void handleBackward() {
    int amp = server.hasArg("speed") ?
              clampInt(server.arg("speed").toInt(), 5, 45) : 20;
    ledAck();
    walkBackward(amp);
    standPose();
    addCors();
    server.send(200, "application/json",
                "{\"cmd\":\"backward\",\"amp\":" + String(amp) + "}");
}

static void handleLeft() {
    ledAck();
    turnLeft();
    addCors();
    server.send(200, "application/json", "{\"cmd\":\"left\"}");
}

static void handleRight() {
    ledAck();
    turnRight();
    addCors();
    server.send(200, "application/json", "{\"cmd\":\"right\"}");
}

static void handleStand() {
    standPose();
    addCors();
    server.send(200, "application/json", "{\"cmd\":\"stand\"}");
}

static void handleWave() {
    String side = server.hasArg("side") ? server.arg("side") : "right";
    ledAck();
    if (side == "left") waveLeft(); else waveRight();
    addCors();
    server.send(200, "application/json", "{\"cmd\":\"wave\",\"side\":\"" + side + "\"}");
}

static void handleDance() {
    ledAck();
    dance();
    addCors();
    server.send(200, "application/json", "{\"cmd\":\"dance\"}");
}

static void handleServo() {
    if (!server.hasArg("id") || !server.hasArg("offset")) {
        server.send(400, "application/json",
            "{\"error\":\"required: id (0-5), offset\"}");
        return;
    }
    int idx = clampInt(server.arg("id").toInt(), 0, SERVO_COUNT - 1);
    int off = clampInt(server.arg("offset").toInt(),
                       SCFG[idx].minOff, SCFG[idx].maxOff);
    servoWriteOffset(idx, off);
    ledAck();
    addCors();
    server.send(200, "application/json",
                "{\"servo\":" + String(idx) +
                ",\"offset\":" + String(off) +
                ",\"neutral\":" + String(SCFG[idx].neutral) + "}");
}

static void handleHeartrate() {
    addCors();
    String json = "{\"bpm\":"  + String(heartRate, 0) +
                  ",\"spo2\":" + String(spO2, 0) +
                  ",\"ready\":" + (heartRate > 20 ? "true" : "false") + "}";
    server.send(200, "application/json", json);
}

static void handleHeartMode() {
    if (!server.hasArg("mode")) {
        server.send(400, "application/json", "{\"error\":\"missing 'mode'\"}");
        return;
    }
    currentHeartMode = server.arg("mode");
    currentFaceId    = "";   // heart mode takes display ownership
    ledAck();
    oledDrawHeart(currentHeartMode);
    addCors();
    server.send(200, "application/json",
                "{\"heartMode\":\"" + currentHeartMode + "\"}");
}

// POST /face  body: {"id":"happy_1"}   OR   GET /face?id=happy_1
// ESP32 renders immediately, discards previous — no storage
static void handleFace() {
    String faceId;
    if (server.method() == HTTP_POST) {
        StaticJsonDocument<128> doc;
        if (deserializeJson(doc, server.arg("plain")) == DeserializationError::Ok)
            faceId = doc["id"].as<String>();
    } else {
        faceId = server.hasArg("id") ? server.arg("id") : "";
    }
    if (faceId.isEmpty()) {
        server.send(400, "application/json", "{\"error\":\"missing 'id'\"}");
        return;
    }
    currentFaceId    = faceId;
    currentHeartMode = "";   // face takes display ownership
    ledAck();
    oledDrawFace(currentFaceId, false);
    addCors();
    server.send(200, "application/json", "{\"face\":\"" + currentFaceId + "\"}");
    Serial.printf("[HTTP] Face → %s\n", currentFaceId.c_str());
}

static void handleCalibrate() {
    calibrationSweep();
    addCors();
    server.send(200, "application/json", "{\"cmd\":\"calibrate\"}");
}

// POST /command  {"action":"expression","data":"happy"}
// Accepts JSON commands from the companion app.
// Only one animation runs at a time — new commands overwrite previous state.
static void handleCommand() {
    if (server.method() != HTTP_POST) {
        server.send(405, "application/json", "{\"error\":\"POST required\"}");
        return;
    }
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, server.arg("plain")) != DeserializationError::Ok) {
        server.send(400, "application/json", "{\"error\":\"invalid JSON\"}");
        return;
    }
    const char* action = doc["action"] | "";
    if (!action || strlen(action) == 0) {
        server.send(400, "application/json", "{\"error\":\"missing 'action'\"}");
        return;
    }
    ledAck();
    addCors();

    if (strcmp(action, "expression") == 0 || strcmp(action, "face") == 0) {
        String faceId = doc["data"].as<String>();
        if (faceId.length() > 0) {
            currentFaceId    = faceId;
            currentHeartMode = "";
            oledDrawFace(currentFaceId, false);
        }
        server.send(200, "application/json", "{\"ok\":true}");

    } else if (strcmp(action, "move") == 0) {
        const char* cmd = doc["data"] | "";
        if      (strcmp(cmd, "forward")  == 0) { walkForward(20);  standPose(); }
        else if (strcmp(cmd, "backward") == 0) { walkBackward(20); standPose(); }
        else if (strcmp(cmd, "left")     == 0) { turnLeft(); }
        else if (strcmp(cmd, "right")    == 0) { turnRight(); }
        else if (strcmp(cmd, "wave")     == 0) { waveRight(); }
        else if (strcmp(cmd, "dance")    == 0) { dance(); }
        else if (strcmp(cmd, "stand")    == 0) { standPose(); }
        server.send(200, "application/json", "{\"ok\":true}");

    } else if (strcmp(action, "stop") == 0) {
        audioStop();
        standPose();
        server.send(200, "application/json", "{\"ok\":true}");

    } else {
        server.send(400, "application/json", "{\"error\":\"unknown action\"}");
    }
}

// GET /config  — return active server URL
static void handleConfigGet() {
    addCors();
    String json = "{\"server_url\":\"" + getServerUrl() + "\","
                  "\"has_custom\":"    + (hasServerUrl() ? "true" : "false") + "}";
    server.send(200, "application/json", json);
}

// POST /config  body: {"server_url":"http://192.168.x.x:3000"}
static void handleConfigSet() {
    if (server.method() != HTTP_POST) {
        server.send(405, "application/json", "{\"error\":\"POST required\"}");
        return;
    }
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, server.arg("plain")) != DeserializationError::Ok) {
        server.send(400, "application/json", "{\"error\":\"invalid JSON\"}");
        return;
    }
    const char* newUrl = doc["server_url"] | "";
    if (!newUrl || strlen(newUrl) < 7) {   // at minimum "http://x"
        server.send(400, "application/json", "{\"error\":\"server_url required\"}");
        return;
    }
    saveServerUrl(String(newUrl));
    ledAck();
    addCors();
    server.send(200, "application/json",
                "{\"ok\":true,\"server_url\":\"" + getServerUrl() + "\"}");
    Serial.printf("[Config] server_url updated via HTTP: %s\n", newUrl);
}

static void handleNotFound() {
    addCors();
    server.send(404, "application/json",
        "{\"error\":\"route not found\","
        "\"routes\":[\"/status\",\"/forward?speed=20\",\"/backward?speed=20\","
        "\"/left\",\"/right\",\"/stand\",\"/wave?side=right\",\"/dance\","
        "\"/servo?id=0&offset=20\",\"/heartrate\","
        "\"/heartMode?mode=beating_heart\",\"/face?id=happy\","
        "\"/calibrate\",\"/config\"]}");
}

// ── WiFi setup ────────────────────────────────────────────────
static void setupWiFi() {
    oledMsg("WiFi", "Connecting...");
    Serial.printf("[WiFi] SSID: %s\n", _ssid);
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(_ssid, _pass);

    unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t0 < WIFI_TIMEOUT_MS) {
        // Blink LEDs while connecting
        digitalWrite(PIN_LED1, HIGH); digitalWrite(PIN_LED2, LOW);
        delay(250);
        digitalWrite(PIN_LED1, LOW);  digitalWrite(PIN_LED2, HIGH);
        delay(250);
        Serial.print('.');
    }
    ledsOff();
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        ledsOn();   // solid ON = connected
        String ip = WiFi.localIP().toString();
        Serial.printf("[WiFi] Connected  IP: %s\n", ip.c_str());
        oledDrawWifiStatus(true, ip);
    } else {
        ledsOff();
        Serial.println("[WiFi] Timeout — offline mode");
        oledDrawWifiStatus(false, "");
    }
}

// ── Public API ────────────────────────────────────────────────
void commSetup(const char* ssid, const char* pass) {
    _ssid = ssid;
    _pass = pass;

    pinMode(PIN_LED1, OUTPUT);
    pinMode(PIN_LED2, OUTPUT);
    ledsOff();

    setupWiFi();

    server.on("/status",    HTTP_GET,  handleStatus);
    server.on("/forward",   HTTP_GET,  handleForward);
    server.on("/backward",  HTTP_GET,  handleBackward);
    server.on("/left",      HTTP_GET,  handleLeft);
    server.on("/right",     HTTP_GET,  handleRight);
    server.on("/stand",     HTTP_GET,  handleStand);
    server.on("/stop",      HTTP_GET,  handleStand);
    server.on("/wave",      HTTP_GET,  handleWave);
    server.on("/dance",     HTTP_GET,  handleDance);
    server.on("/servo",     HTTP_GET,  handleServo);
    server.on("/heartrate", HTTP_GET,  handleHeartrate);
    server.on("/heartMode", HTTP_GET,  handleHeartMode);
    server.on("/face",      HTTP_GET,  handleFace);
    server.on("/face",      HTTP_POST, handleFace);
    server.on("/calibrate", HTTP_GET,  handleCalibrate);
    server.on("/command",   HTTP_POST, handleCommand);
    server.on("/config",    HTTP_GET,  handleConfigGet);
    server.on("/config",    HTTP_POST, handleConfigSet);
    server.onNotFound(handleNotFound);
    server.begin();
    Serial.println("[HTTP] Server started on port 80");
}

// ── Voice AI: send WAV → backend, receive WAV → play ─────────
bool sendAudioToBackend(const uint8_t* wavBuf, size_t wavLen) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[VoiceAI] WiFi not connected");
        return false;
    }
    if (!wavBuf || wavLen < 44) {
        Serial.println("[VoiceAI] Buffer too small");
        return false;
    }

    String url = getServerUrl() + "/process-audio";
    Serial.printf("[VoiceAI] POST %u bytes → %s\n", (unsigned)wavLen, url.c_str());

    HTTPClient http;
    http.begin(url);
    http.addHeader("Content-Type", "audio/wav");
    http.setTimeout(30000);   // 30 s: allow for AI pipeline latency

    int code = http.POST(const_cast<uint8_t*>(wavBuf), wavLen);
    if (code != 200) {
        Serial.printf("[VoiceAI] HTTP %d\n", code);
        http.end();
        return false;
    }

    int respLen = http.getSize();
    Serial.printf("[VoiceAI] Response: %d bytes\n", respLen);

    if (respLen <= 44 || respLen > 350000) {
        Serial.printf("[VoiceAI] Unexpected response size: %d\n", respLen);
        http.end();
        return false;
    }

    // Allocate receive buffer (prefer PSRAM on ESP32-S3)
#if defined(BOARD_HAS_PSRAM) || defined(CONFIG_SPIRAM)
    uint8_t* respBuf = (uint8_t*)ps_malloc(respLen);
#else
    uint8_t* respBuf = (uint8_t*)malloc(respLen);
#endif
    if (!respBuf) {
        Serial.printf("[VoiceAI] OOM for response (%d bytes)\n", respLen);
        http.end();
        return false;
    }

    // Stream response into buffer
    WiFiClient* stream = http.getStreamPtr();
    size_t pos = 0;
    unsigned long deadline = millis() + 15000;
    while (pos < (size_t)respLen && millis() < deadline) {
        int avail = stream->available();
        if (avail > 0) {
            size_t n = stream->readBytes(respBuf + pos,
                                         min((size_t)avail, (size_t)(respLen - pos)));
            pos += n;
        }
        yield();   // feed watchdog / allow background tasks
    }
    http.end();

    Serial.printf("[VoiceAI] Received %u bytes\n", (unsigned)pos);
    if (pos < 44) {
        free(respBuf);
        return false;
    }

    audioPlay(respBuf, pos);   // audioPlay copies the buffer internally
    free(respBuf);
    return true;
}

void commLoop() {
    server.handleClient();

    unsigned long now = millis();
    if (now - lastWiFiCheckMs >= WIFI_CHECK_INTERVAL) {
        lastWiFiCheckMs = now;
        checkWiFiConnection();
    }
}

void checkWiFiConnection() {
    if (WiFi.status() == WL_CONNECTED) {
        ledsOn();
        return;
    }
    Serial.println("[WiFi] Lost — reconnecting...");
    ledsOff();
    WiFi.disconnect(false);
    WiFi.begin(_ssid, _pass);
    oledDrawWifiStatus(false, "");
}
