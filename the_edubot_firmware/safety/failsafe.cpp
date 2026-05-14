#include "failsafe.h"
#include "power_manager.h"
#include "../motion/motion_manager.h"
#include "../audio/audio_manager.h"
#include "../display/expressions.h"
#include "../system/logger.h"
#include "../system/states.h"
#include "../system/config.h"

static bool emergencyActive = false;

void initFailsafe() {
    emergencyActive = false;
    logInfo("Failsafe ready");
}

void emergencyStop() {
    emergencyActive = true;
    stopAllMotion();
    stopAudio();
    showExpression(FACE_SLEEPY);
    setState(SLEEPING);
    logError("EMERGENCY STOP triggered");
}

void checkSafety() {
    if (getBatteryVoltage() < LOW_BATTERY_VOLTS && !emergencyActive) {
        logError("Low battery — emergency stop");
        emergencyStop();
    }
}
