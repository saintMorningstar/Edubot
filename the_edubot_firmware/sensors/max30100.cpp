#include "max30100.h"
#include "../system/config.h"
#include "../system/logger.h"
#include <MAX30100_PulseOximeter.h>

static PulseOximeter  pox;
static float          lastHeartRate = 0.0f;
static float          lastSpO2      = 0.0f;
static bool           fingerPresent = false;
static unsigned long  lastUpdate    = 0;

#define POX_UPDATE_MS  100UL

static void onBeatDetected() {
    // Heartbeat callback (can trigger LED flash here)
}

void initMAX30100() {
    if (!pox.begin()) {
        logError("MAX30100 init failed — check I2C (SDA=1, SCL=2)");
        return;
    }
    pox.setIRLedCurrent(MAX30100_LED_CURR_7_6MA);
    pox.setOnBeatDetectedCallback(onBeatDetected);
    logInfo("MAX30100 ready");
}

float getHeartRate() {
    if (millis() - lastUpdate > POX_UPDATE_MS) {
        lastUpdate    = millis();
        pox.update();
        lastHeartRate = pox.getHeartRate();
        lastSpO2      = pox.getSpO2();
        fingerPresent = (lastSpO2 > 0);
    }
    return lastHeartRate;
}

float getSpO2() {
    return lastSpO2;
}

bool fingerDetected() {
    return fingerPresent;
}
