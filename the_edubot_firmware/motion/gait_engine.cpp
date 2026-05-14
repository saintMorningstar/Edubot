#include "gait_engine.h"
#include "servos.h"
#include "dancing.h"
#include "../system/config.h"

// Gait phase advances every 200ms; servo interpolation runs every call (~5ms)
#define GAIT_PHASE_MS    200

static int           gaitDirection  = 0;
static int           gaitPhase      = 0;
static unsigned long lastGaitUpdate = 0;

// ch: 0=L_Hip  1=L_Foot  2=L_Hand  3=R_Hip  4=R_Foot  5=R_Hand
static const int GAIT_FORWARD[4][6] = {
    { 100,  80, 90,  80,  90, 90 },
    {  80,  90, 90,  80,  90, 90 },
    {  80,  90, 90, 100, 100, 90 },
    {  90,  90, 90,  90,  90, 90 },
};

static const int GAIT_BACKWARD[4][6] = {
    {  80,  80, 90, 100,  90, 90 },
    { 100,  90, 90, 100,  90, 90 },
    { 100,  90, 90,  80, 100, 90 },
    {  90,  90, 90,  90,  90, 90 },
};

static const int GAIT_TURN_LEFT[4][6] = {
    {  70,  80, 90,  90,  90, 90 },
    {  90,  90, 90,  90,  90, 90 },
    {  90,  90, 90, 110,  80, 90 },
    {  90,  90, 90,  90,  90, 90 },
};

static const int GAIT_TURN_RIGHT[4][6] = {
    {  90,  90, 90,  70,  80, 90 },
    {  90,  90, 90,  90,  90, 90 },
    { 110,  80, 90,  90,  90, 90 },
    {  90,  90, 90,  90,  90, 90 },
};

void initGaitEngine() {
    gaitDirection  = 0;
    gaitPhase      = 0;
    lastGaitUpdate = 0;
}

void setGaitDirection(int dir) {
    gaitDirection = dir;
    gaitPhase     = 0;
}

void updateWalkingCycle() {
    // Always run servo interpolation and dance engine every loop call (~5ms)
    updateServoInterpolation();
    updateDanceEngine();

    // Gait phase only advances every GAIT_PHASE_MS
    if (gaitDirection == 0) return;
    if (millis() - lastGaitUpdate < GAIT_PHASE_MS) return;
    lastGaitUpdate = millis();

    const int (*gaitTable)[6] = nullptr;
    switch (gaitDirection) {
        case 1: gaitTable = GAIT_FORWARD;    break;
        case 2: gaitTable = GAIT_BACKWARD;   break;
        case 3: gaitTable = GAIT_TURN_LEFT;  break;
        case 4: gaitTable = GAIT_TURN_RIGHT; break;
        default: return;
    }

    const int* phase = gaitTable[gaitPhase];
    for (int i = 0; i < NUM_SERVOS; i++) {
        moveServoSmooth(i, phase[i], 8.0f);
    }
    gaitPhase = (gaitPhase + 1) % 4;
}
