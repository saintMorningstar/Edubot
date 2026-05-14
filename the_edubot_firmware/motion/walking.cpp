#include "walking.h"
#include "servos.h"
#include "gait_engine.h"
#include "../system/config.h"
#include "../system/logger.h"

static bool walkingActive = false;
static int  walkDirection  = 0;  // 0=none 1=fwd 2=bwd 3=left 4=right

void walkForward() {
    if (walkingActive && walkDirection == 1) return;
    walkingActive = true;
    walkDirection = 1;
    setGaitDirection(1);
    logInfo("Walking forward");
}

void walkBackward() {
    if (walkingActive && walkDirection == 2) return;
    walkingActive = true;
    walkDirection = 2;
    setGaitDirection(2);
    logInfo("Walking backward");
}

void turnLeft() {
    walkingActive = true;
    walkDirection = 3;
    setGaitDirection(3);
    logInfo("Turning left");
}

void turnRight() {
    walkingActive = true;
    walkDirection = 4;
    setGaitDirection(4);
    logInfo("Turning right");
}

void stopWalking() {
    walkingActive = false;
    walkDirection = 0;
    setGaitDirection(0);
    isWalking = false;
}
