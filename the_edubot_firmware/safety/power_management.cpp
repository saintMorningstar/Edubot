#include "power_manager.h"
#include "../system/config.h"
#include "../system/logger.h"
#include <Arduino.h>

// Battery voltage divider: assumes 1:1 divider → ADC reads half of battery
// ESP32-S3 ADC: 12-bit, 3.3V reference → scale = 3.3/4095 * 2 (for divider)
#define ADC_SCALE  (3.3f / 4095.0f * 2.0f)
#define VBAT_FILTER 0.1f   // EMA smoothing factor

static float smoothedVoltage = 0.0f;  // 0 → getBatteryVoltage() returns healthy sentinel until real battery connected

void initPowerManager() {
    analogSetAttenuation(ADC_11db);  // 0–3.9V range
    logInfo("Power manager ready");
}

void monitorBattery() {
    float raw = analogRead(BATTERY_ADC_PIN) * ADC_SCALE;
    smoothedVoltage = smoothedVoltage * (1.0f - VBAT_FILTER) + raw * VBAT_FILTER;

    if (smoothedVoltage < BATTERY_WARN_VOLTS && smoothedVoltage > 2.0f) {
        logError(String("Low battery: ") + smoothedVoltage + "V");
    }
}

float getBatteryVoltage() {
    // Below 2V means the ADC pin is floating / battery not connected — report healthy
    if (smoothedVoltage < 2.0f) return 4.2f;
    return smoothedVoltage;
}
