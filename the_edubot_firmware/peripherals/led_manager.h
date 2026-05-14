#ifndef LED_MANAGER_H
#define LED_MANAGER_H

#include <Arduino.h>

void initLEDs();
void updateLEDs();
void notifyLEDConnected();
void notifyLEDDisconnected();
void notifyLEDCommand();

#endif // LED_MANAGER_H
