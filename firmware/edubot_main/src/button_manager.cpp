#include "button_manager.h"
#include "config.h"

static bool          pressed     = false;
static bool          longFired   = false;
static unsigned long pressStart  = 0;
static unsigned long lastChange  = 0;
static bool          rawPrev     = false;

void buttonSetup() {
    pinMode(BTN_PIN, INPUT_PULLUP);
}

ButtonEvent buttonLoop() {
    unsigned long now = millis();
    bool rawDown = (digitalRead(BTN_PIN) == LOW);

    // Debounce: ignore transitions shorter than BTN_DEBOUNCE_MS
    if (rawDown != rawPrev) {
        lastChange = now;
        rawPrev    = rawDown;
        return BTN_NONE;
    }
    if ((now - lastChange) < BTN_DEBOUNCE_MS) return BTN_NONE;

    // Rising edge: button just pressed
    if (rawDown && !pressed) {
        pressed   = true;
        longFired = false;
        pressStart = now;
        return BTN_NONE;
    }

    // Held down: fire long press once
    if (rawDown && pressed && !longFired) {
        if ((now - pressStart) >= BTN_LONG_MS) {
            longFired = true;
            return BTN_LONG_PRESS;
        }
        return BTN_NONE;
    }

    // Falling edge: button released
    if (!rawDown && pressed) {
        pressed = false;
        if (!longFired && (now - pressStart) < BTN_SHORT_MAX_MS) {
            return BTN_SHORT_PRESS;
        }
        return BTN_NONE;
    }

    return BTN_NONE;
}
