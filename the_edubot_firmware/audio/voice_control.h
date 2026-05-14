#ifndef VOICE_CONTROL_H
#define VOICE_CONTROL_H

#include <Arduino.h>

// Requires arduino-esp32 v3.x board package (ESP-IDF 5.x)
// Partition scheme must have a "model" partition — use the custom
// partition table in docs/partitions_16MB.csv and select it via
// Tools > Partition Scheme > Custom in Arduino IDE.
//
// Wake word: "Hi ESP"   (built-in WakeNet model)
// After wake word, say one of the voice commands to control the robot.

void initVoiceControl();
bool isVoiceControlActive();

#endif
