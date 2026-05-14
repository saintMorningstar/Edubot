#ifndef BLE_SERVER_H
#define BLE_SERVER_H

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ─── Service & Characteristic UUIDs ──────────────────────────────────────────
#define EDUBOT_SERVICE_UUID         "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define EDUBOT_CMD_CHAR_UUID        "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define EDUBOT_TELEMETRY_CHAR_UUID  "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define EDUBOT_STATUS_CHAR_UUID     "beb54840-36e1-4688-b7f5-ea07361b26a8"

// ─── Shared BLE objects (defined in ble_server.cpp) ──────────────────────────
extern BLEServer*         pBLEServer;
extern BLEService*        pBLEService;
extern BLECharacteristic* pCmdCharacteristic;
extern BLECharacteristic* pTelemetryCharacteristic;
extern BLECharacteristic* pStatusCharacteristic;
extern bool               bleDeviceConnected;
extern bool               blePreviouslyConnected;

void initBLE();
void startBLEAdvertising();
bool isBLEConnected();
void sendBLEMessage(String message);
void sendBLENotification(BLECharacteristic* pChar, String data);

#endif // BLE_SERVER_H
