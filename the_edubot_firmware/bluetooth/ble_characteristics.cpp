#include "ble_characteristics.h"
#include "ble_server.h"
#include "../system/logger.h"

void createBLECharacteristics() {
    // Command characteristic (phone -> robot): WRITE + WRITE_NR
    pCmdCharacteristic = pBLEService->createCharacteristic(
        EDUBOT_CMD_CHAR_UUID,
        BLECharacteristic::PROPERTY_WRITE |
        BLECharacteristic::PROPERTY_WRITE_NR
    );

    // Telemetry characteristic (robot -> phone): NOTIFY
    // Note: CCCD (BLE2902) is auto-created in arduino-esp32 v3.x — do not add manually
    pTelemetryCharacteristic = pBLEService->createCharacteristic(
        EDUBOT_TELEMETRY_CHAR_UUID,
        BLECharacteristic::PROPERTY_NOTIFY |
        BLECharacteristic::PROPERTY_READ
    );

    // Status characteristic (robot -> phone): NOTIFY
    pStatusCharacteristic = pBLEService->createCharacteristic(
        EDUBOT_STATUS_CHAR_UUID,
        BLECharacteristic::PROPERTY_NOTIFY |
        BLECharacteristic::PROPERTY_READ
    );

    pBLEService->start();
    logInfo("BLE characteristics created, service started");
}
