#include "touch.h"
#include "../system/config.h"
#include "../system/logger.h"

static bool lastState    = false;
static unsigned long lastDebounce = 0;
#define DEBOUNCE_MS 50

void initTouchSensor() {
    pinMode(BUTTON_PIN, INPUT_PULLUP);  // Active LOW
    logInfo("Button ready on GPIO16");
}

bool isTouched() {
    bool raw = (digitalRead(BUTTON_PIN) == LOW);
    if (raw != lastState && millis() - lastDebounce > DEBOUNCE_MS) {
        lastDebounce = millis();
        lastState    = raw;
    }
    return lastState;
}
