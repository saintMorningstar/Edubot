#include "ble_services.h"
#include "ble_server.h"
#include "../system/logger.h"

void createBLEServices() {
    // Initialize BLE device and create server before service creation
    BLEDevice::init("Edubot");
    pBLEServer = BLEDevice::createServer();
    // Actual callbacks set in initBLE() after characteristics are created
    pBLEService = pBLEServer->createService(EDUBOT_SERVICE_UUID);
    logInfo("BLE service created");
}
