#pragma once
#include <Arduino.h>

void powerSetup();
bool powerWokeFromSleep();   // true when wakeup cause == EXT0 (button)
void powerEnterSleep();      // display animation, shutdown peripherals, deep sleep
