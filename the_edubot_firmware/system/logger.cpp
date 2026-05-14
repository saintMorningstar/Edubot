#include "logger.h"
#include <Arduino.h>

void logInfo(String message) {
    Serial.print("[INFO] ");
    Serial.println(message);
}

void logError(String message) {
    Serial.print("[ERR]  ");
    Serial.println(message);
}
