#include "preferences_manager.h"
#include "../system/logger.h"
#include <Preferences.h>

static Preferences prefsStorage;

void loadPreferences() {
    prefsStorage.begin("edubot", true);
    logInfo(String("Volume: ") + prefsStorage.getUChar("volume", 25));
    prefsStorage.end();
    logInfo("Preferences loaded");
}

void savePreferences() {
    prefsStorage.begin("edubot", false);
    // Save current settings
    extern uint8_t getMasterVolume();
    prefsStorage.putUChar("volume", getMasterVolume());
    prefsStorage.end();
    logInfo("Preferences saved");
}
