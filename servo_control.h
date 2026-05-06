#pragma once
#include <Arduino.h>
#include <ESP32Servo.h>

// ── Pin map ───────────────────────────────────────────────────
#define PIN_L_HIP   32
#define PIN_L_FOOT  33
#define PIN_L_HAND  25
#define PIN_R_HIP   27
#define PIN_R_FOOT  26
#define PIN_R_HAND  14

// ── Servo indices ─────────────────────────────────────────────
#define SRV_L_HIP   0
#define SRV_L_FOOT  1
#define SRV_L_HAND  2
#define SRV_R_HIP   3
#define SRV_R_FOOT  4
#define SRV_R_HAND  5
#define SERVO_COUNT 6

#define PULSE_MIN_US  500
#define PULSE_MAX_US  2400
#define DEADBAND_DEG  2

struct ServoConfig {
    uint8_t pin;
    int16_t neutral;    // calibrated center angle (degrees)
    int16_t minOff;     // minimum offset from neutral
    int16_t maxOff;     // maximum offset from neutral
    bool    reversed;   // mirror-mounted: flip offset sign
};

extern ServoConfig SCFG[SERVO_COUNT];
extern Servo       servos[SERVO_COUNT];
extern int         lastOffset[SERVO_COUNT];

void servoSetup();
void servoWriteOffset(uint8_t idx, int offset);
void writeAllOffsets(int offsets[SERVO_COUNT]);
void standPose();
void glideTo(int targets[SERVO_COUNT], uint8_t steps = 18, uint8_t stepMs = 10);

// Gaits (biped Otto-style)
void walkForward(int amp = 20);
void walkBackward(int amp = 20);
void turnLeft(int amp = 20);
void turnRight(int amp = 20);
void waveLeft();
void waveRight();
void dance();
void calibrationSweep();

// Called from touch-tap handler
void tap1Routine();
void tap2Routine();
void tap3Routine();
