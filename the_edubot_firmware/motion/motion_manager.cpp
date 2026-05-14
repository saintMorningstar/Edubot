#include "motion_manager.h"
#include "servos.h"
#include "walking.h"
#include "dancing.h"
#include "poses.h"
#include "../system/logger.h"

void initMotionManager() {
    logInfo("Motion manager ready");
}

void stopAllMotion() {
    stopWalking();
    stopDancing();
    poseNeutral();
    logInfo("All motion stopped");
}

void updateMotion() {
    updateServoInterpolation();
    updateDanceEngine();
}
