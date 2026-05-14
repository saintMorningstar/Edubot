#ifndef BLE_CALLBACKS_H
#define BLE_CALLBACKS_H

#include <Arduino.h>

void onBLEConnect();
void onBLEDisconnect();
void onBLEDataReceived(String data);

#endif // BLE_CALLBACKS_H
