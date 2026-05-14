#include "ble_callbacks.h"
#include "ble_commands.h"
#include "ble_server.h"
#include "../system/logger.h"
#include "../system/states.h"
#include "../behavior/reactions.h"
#include "../display/expressions.h"
#include "../audio/audio_manager.h"
#include "../audio/sounds.h"
#include "../peripherals/led_manager.h"

void onBLEConnect() {
    logInfo("BLE client connected");
    notifyLEDConnected();
    reactToBLEConnection();
    sendBLEMessage("{\"event\":\"CONNECTED\",\"robot\":\"Edubot\"}");
}

void onBLEDisconnect() {
    logInfo("BLE client disconnected -- restarting advertising");
    notifyLEDDisconnected();
    BLEDevice::startAdvertising();
}

void onBLEDataReceived(String data) {
    logInfo(String("BLE rx: ") + data);
    processBLECommand(data);
}
