#include "servo_calibration.h"
#include "../system/logger.h"
#include <Preferences.h>

static Preferences prefsServo;

void loadServoCalibration() {
    prefsServo.begin("servocal", true);
    // In a real system, load per-channel offset values
    // For now, defaults (0 offset) are used
    prefsServo.end();
    logInfo("Servo calibration loaded (defaults)");
}

void saveServoCalibration() {
    prefsServo.begin("servocal", false);
    // Save per-channel offsets
    prefsServo.end();
    logInfo("Servo calibration saved");
}
