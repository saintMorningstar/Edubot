#include "servo_control.h"

// ── Config table ─────────────────────────────────────────────
// neutral=90 is true mechanical center for SG90 when PULSE_MIN=500, PULSE_MAX=2400.
// Adjust neutral per servo if a unit drifts (use serial: "n <idx> <val>").
// reversed=true flips the offset sign so +offset always means the same body direction
// on both the left and right sides.
ServoConfig SCFG[SERVO_COUNT] = {
//  pin          neutral  minOff  maxOff  reversed
  { PIN_L_HIP,   90,      -45,    45,     false },  // 0 L_HIP
  { PIN_L_FOOT,  90,      -35,    35,     false },  // 1 L_FOOT
  { PIN_L_HAND,  90,      -60,    60,     false },  // 2 L_HAND
  { PIN_R_HIP,   90,      -45,    45,     true  },  // 3 R_HIP  (mirrored)
  { PIN_R_FOOT,  90,      -35,    35,     true  },  // 4 R_FOOT (mirrored)
  { PIN_R_HAND,  90,      -60,    60,     true  },  // 5 R_HAND (mirrored)
};

Servo servos[SERVO_COUNT];
int   lastOffset[SERVO_COUNT];

// ── Initialisation ───────────────────────────────────────────
void servoSetup() {
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);

    for (uint8_t i = 0; i < SERVO_COUNT; i++) {
        servos[i].setPeriodHertz(50);
        servos[i].attach(SCFG[i].pin, PULSE_MIN_US, PULSE_MAX_US);
        lastOffset[i] = 0;
    }
    delay(100);
    standPose();
    Serial.println("[Servo] Init OK — 6 servos at 90°");
}

// ── Primitives ───────────────────────────────────────────────
static inline int clamp(int v, int lo, int hi) {
    return v < lo ? lo : v > hi ? hi : v;
}

void servoWriteOffset(uint8_t idx, int offset) {
    if (offset > -DEADBAND_DEG && offset < DEADBAND_DEG) offset = 0;
    offset = clamp(offset, SCFG[idx].minOff, SCFG[idx].maxOff);

    int hw = SCFG[idx].reversed ? -offset : offset;
    int angle = clamp(SCFG[idx].neutral + hw, 0, 180);

    lastOffset[idx] = offset;
    servos[idx].write(angle);
}

void writeAllOffsets(int offsets[SERVO_COUNT]) {
    for (uint8_t i = 0; i < SERVO_COUNT; i++) servoWriteOffset(i, offsets[i]);
}

void standPose() {
    for (uint8_t i = 0; i < SERVO_COUNT; i++) servoWriteOffset(i, 0);
}

// Linear interpolation from current offsets to targets
void glideTo(int targets[SERVO_COUNT], uint8_t steps, uint8_t stepMs) {
    int start[SERVO_COUNT];
    for (uint8_t i = 0; i < SERVO_COUNT; i++) start[i] = lastOffset[i];

    for (uint8_t s = 1; s <= steps; s++) {
        for (uint8_t i = 0; i < SERVO_COUNT; i++) {
            int off = start[i] + ((targets[i] - start[i]) * (int)s) / steps;
            servoWriteOffset(i, off);
        }
        delay(stepMs);
    }
}

// ── Otto-style biped gaits ───────────────────────────────────
// Coordinate convention (positive offset means):
//   HIP  → swing leg forward
//   FOOT → tilt that side down (shift weight to that side)
//   HAND → raise forward

void walkForward(int amp) {
    // Phase A: shift weight left, right leg steps forward
    int pA[SERVO_COUNT] = { -amp/2, -amp/2, 0,  amp,  amp/2, 0 };
    // Phase B: shift weight right, left leg steps forward
    int pB[SERVO_COUNT] = {  amp,    amp/2, 0, -amp/2, -amp/2, 0 };
    glideTo(pA, 16, 10);
    glideTo(pB, 16, 10);
}

void walkBackward(int amp) {
    int pA[SERVO_COUNT] = {  amp/2, -amp/2, 0, -amp,  amp/2, 0 };
    int pB[SERVO_COUNT] = { -amp,    amp/2, 0,  amp/2, -amp/2, 0 };
    glideTo(pA, 16, 10);
    glideTo(pB, 16, 10);
}

void turnLeft(int amp) {
    // Both hips push same direction → pivot
    int pose[SERVO_COUNT] = { -amp, amp/2, 0, -amp, amp/2, 0 };
    glideTo(pose, 16, 12);
    delay(80);
    standPose();
}

void turnRight(int amp) {
    int pose[SERVO_COUNT] = { amp, amp/2, 0, amp, amp/2, 0 };
    glideTo(pose, 16, 12);
    delay(80);
    standPose();
}

// ── Expressive movements ─────────────────────────────────────
void waveLeft() {
    for (uint8_t i = 0; i < 3; i++) {
        int up[SERVO_COUNT]   = { 0, 0,  50, 0, 0, 0 };
        int down[SERVO_COUNT] = { 0, 0, -20, 0, 0, 0 };
        glideTo(up,   10, 12);
        glideTo(down, 10, 12);
    }
    standPose();
}

void waveRight() {
    for (uint8_t i = 0; i < 3; i++) {
        int up[SERVO_COUNT]   = { 0, 0, 0, 0, 0,  50 };
        int down[SERVO_COUNT] = { 0, 0, 0, 0, 0, -20 };
        glideTo(up,   10, 12);
        glideTo(down, 10, 12);
    }
    standPose();
}

void dance() {
    // Shake + wave sequence
    for (uint8_t i = 0; i < 2; i++) {
        int shakeL[SERVO_COUNT] = { -15, -20,  40, 15, 20, -40 };
        int shakeR[SERVO_COUNT] = {  15, -20, -40,-15, 20,  40 };
        glideTo(shakeL, 12, 10);
        glideTo(shakeR, 12, 10);
    }
    waveLeft();
    waveRight();
    standPose();
}

// ── Touch-tap routines (1/2/3 taps) ─────────────────────────
void tap1Routine() {
    waveRight();
}

void tap2Routine() {
    walkForward(22);
    walkForward(22);
    standPose();
}

void tap3Routine() {
    dance();
}

// ── Calibration sweep ────────────────────────────────────────
void calibrationSweep() {
    const char* labels[] = { "L_HIP","L_FOOT","L_HAND","R_HIP","R_FOOT","R_HAND" };
    standPose();
    delay(600);
    for (uint8_t i = 0; i < SERVO_COUNT; i++) {
        Serial.printf("[CAL] %s (GPIO %d) neutral=%d\n",
                      labels[i], SCFG[i].pin, SCFG[i].neutral);
        for (int o = 0; o <= 25; o += 1) { servoWriteOffset(i, o);  delay(8); }
        for (int o = 25; o >= -25; o -= 1) { servoWriteOffset(i, o); delay(8); }
        for (int o = -25; o <= 0; o += 1) { servoWriteOffset(i, o); delay(8); }
        delay(300);
    }
    standPose();
    Serial.println("[CAL] Done");
}
