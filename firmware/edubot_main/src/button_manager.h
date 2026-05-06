#pragma once
#include <Arduino.h>

enum ButtonEvent {
    BTN_NONE,
    BTN_SHORT_PRESS,
    BTN_LONG_PRESS
};

void        buttonSetup();
ButtonEvent buttonLoop();   // call every loop() iteration
