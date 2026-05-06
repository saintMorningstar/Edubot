#include "wifi_manager.h"
#include "config.h"
#include "secrets.h"
#include <WiFi.h>

static bool          connected  = false;
static bool          timedOut   = false;
static bool          justConn   = false;
static unsigned long startMs    = 0;
static char          ipStr[20]  = "0.0.0.0";

void wifiSetup() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    startMs = millis();
    Serial.printf("[WiFi] Connecting to %s ...\n", WIFI_SSID);
}

bool wifiLoop() {
    if (connected || timedOut) return false;

    if (WiFi.status() == WL_CONNECTED) {
        connected = true;
        justConn  = true;
        strncpy(ipStr, WiFi.localIP().toString().c_str(), sizeof(ipStr) - 1);
        Serial.printf("[WiFi] Connected — IP %s\n", ipStr);
        return true;
    }

    if ((millis() - startMs) >= WIFI_TIMEOUT_MS) {
        timedOut = true;
        Serial.println("[WiFi] Timeout — running without WiFi");
    }
    return false;
}

bool wifiConnected()     { return connected; }
const char* wifiGetIP() { return ipStr; }
bool wifiTimedOut()      { return timedOut; }
