#include "dancing.h"
#include "servos.h"
#include "poses.h"
#include "../system/config.h"
#include "../system/logger.h"

static bool danceActive    = false;
static int  dancePhase     = 0;
static int  danceRoutineId = 0;
static unsigned long lastDanceStep = 0;
#define DANCE_STEP_MS  300

void danceRoutine1() {
    if (!danceActive || danceRoutineId != 1) {
        danceActive    = true;
        danceRoutineId = 1;
        dancePhase     = 0;
        isDancing      = true;
        logInfo("Dance routine 1 start");
    }
}

void danceRoutine2() {
    if (!danceActive || danceRoutineId != 2) {
        danceActive    = true;
        danceRoutineId = 2;
        dancePhase     = 0;
        isDancing      = true;
        logInfo("Dance routine 2 start");
    }
}

void stopDancing() {
    danceActive = false;
    isDancing   = false;
    dancePhase  = 0;
    poseNeutral();
    logInfo("Dance stopped");
}

// Call this from loop via motion_manager
void updateDanceEngine() {
    if (!danceActive) return;
    if (millis() - lastDanceStep < DANCE_STEP_MS) return;
    lastDanceStep = millis();

    if (danceRoutineId == 1) {
        // Simple bounce dance
        static const int dance1[6][6] = {
            {  70,  80, 120, 110,  80,  60 },
            { 110,  80,  60,  70,  80, 120 },
            {  70, 100, 120, 110, 100,  60 },
            { 110, 100,  60,  70, 100, 120 },
            {  90,  90, 150,  90,  90,  30 },
            {  90,  90,  30,  90,  90, 150 },
        };
        for (int i = 0; i < NUM_SERVOS; i++)
            moveServoSmooth(i, dance1[dancePhase][i], 10.0f);
        dancePhase = (dancePhase + 1) % 6;
    } else {
        // Sway dance
        static const int dance2[4][6] = {
            {  70,  90, 90, 110,  90, 90 },
            {  90,  80, 90,  90, 100, 90 },
            { 110,  90, 90,  70,  90, 90 },
            {  90, 100, 90,  90,  80, 90 },
        };
        for (int i = 0; i < NUM_SERVOS; i++)
            moveServoSmooth(i, dance2[dancePhase][i], 8.0f);
        dancePhase = (dancePhase + 1) % 4;
    }
}
