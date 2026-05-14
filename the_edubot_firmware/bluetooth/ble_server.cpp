#include "ble_server.h"
#include "ble_callbacks.h"
#include "../system/logger.h"

// ─── Global BLE objects ───────────────────────────────────────────────────────
BLEServer*         pBLEServer               = nullptr;
BLEService*        pBLEService              = nullptr;
BLECharacteristic* pCmdCharacteristic       = nullptr;
BLECharacteristic* pTelemetryCharacteristic = nullptr;
BLECharacteristic* pStatusCharacteristic    = nullptr;
bool               bleDeviceConnected       = false;
bool               blePreviouslyConnected   = false;

// ─── Server callbacks ─────────────────────────────────────────────────────────
class EdubotServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) override {
        bleDeviceConnected = true;
        onBLEConnect();
    }
    void onDisconnect(BLEServer* pServer) override {
        bleDeviceConnected = false;
        blePreviouslyConnected = true;
        onBLEDisconnect();
    }
};

// ─── Command characteristic callbacks ────────────────────────────────────────
class EdubotCmdCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pCharacteristic) override {
        String value = pCharacteristic->getValue();
        if (value.length() > 0) {
            onBLEDataReceived(value);
        }
    }
};

// ─── initBLE ─────────────────────────────────────────────────────────────────
void initBLE() {
    logInfo("BLE init");
    pBLEServer->setCallbacks(new EdubotServerCallbacks());
    pCmdCharacteristic->setCallbacks(new EdubotCmdCallbacks());
    logInfo("BLE ready -- device: Edubot");
}

// ─── startBLEAdvertising ─────────────────────────────────────────────────────
void startBLEAdvertising() {
    BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(EDUBOT_SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();
    logInfo("BLE advertising started");
}

bool isBLEConnected() {
    return bleDeviceConnected;
}

void sendBLEMessage(String message) {
    if (!bleDeviceConnected) return;
    sendBLENotification(pStatusCharacteristic, message);
}

void sendBLENotification(BLECharacteristic* pChar, String data) {
    if (!bleDeviceConnected || pChar == nullptr) return;
    pChar->setValue(data.c_str());
    pChar->notify();
}
