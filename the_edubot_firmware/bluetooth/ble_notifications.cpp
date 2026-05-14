#include "ble_notifications.h"
#include "ble_server.h"
#include "../sensors/ultrasonic.h"
#include "../sensors/max30100.h"
#include "../safety/power_manager.h"
#include "../sensors/dht11.h"

// Build a compact JSON telemetry string and notify
static void sendTelemetry() {
    if (!bleDeviceConnected) return;

    float bat   = getBatteryVoltage();
    float dist  = getDistanceCM();
    float hr    = getHeartRate();
    float spo2  = getSpO2();
    float temp  = getTemperature();
    float humid = getHumidity();

    char buf[128];
    snprintf(buf, sizeof(buf),
        "{\"b\":%.2f,\"d\":%.1f,\"h\":%.0f,\"s\":%.0f,\"t\":%.1f,\"hu\":%.0f}",
        bat, dist, hr, spo2, temp, humid);

    sendBLENotification(pTelemetryCharacteristic, String(buf));
}

void sendBatteryNotification() {
    if (!bleDeviceConnected) return;
    char buf[32];
    snprintf(buf, sizeof(buf), "{\"bat\":%.2f}", getBatteryVoltage());
    sendBLENotification(pTelemetryCharacteristic, String(buf));
}

void sendDistanceNotification() {
    if (!bleDeviceConnected) return;
    // Full telemetry on every distance notification cycle
    sendTelemetry();
}

void sendHeartRateNotification() {
    if (!bleDeviceConnected) return;
    char buf[48];
    snprintf(buf, sizeof(buf),
        "{\"hr\":%.0f,\"spo2\":%.0f}", getHeartRate(), getSpO2());
    sendBLENotification(pTelemetryCharacteristic, String(buf));
}
