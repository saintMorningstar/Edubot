#include "ultrasonic.h"
#include "../system/config.h"
#include "../system/logger.h"

void initUltrasonic() {
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    digitalWrite(TRIG_PIN, LOW);
    logInfo("HC-SR04 ready (ECHO via voltage divider)");
}

float getDistanceCM() {
    // Trigger 10µs pulse
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    // Timeout = 25ms → max range ~425 cm
    long duration = pulseIn(ECHO_PIN, HIGH, 25000);
    if (duration == 0) return 999.0f;

    return duration * 0.0343f / 2.0f;
}
