#include "poses.h"
#include "servos.h"
#include "../system/config.h"

// ch: 0=L_Hip 1=L_Foot 2=L_Hand 3=R_Hip 4=R_Foot 5=R_Hand
void poseNeutral() {
    moveServoSmooth(SERVO_CH_LEFT_HIP,   90, 4.0f);
    moveServoSmooth(SERVO_CH_LEFT_FOOT,  90, 4.0f);
    moveServoSmooth(SERVO_CH_LEFT_HAND,  90, 4.0f);
    moveServoSmooth(SERVO_CH_RIGHT_HIP,  90, 4.0f);
    moveServoSmooth(SERVO_CH_RIGHT_FOOT, 90, 4.0f);
    moveServoSmooth(SERVO_CH_RIGHT_HAND, 90, 4.0f);
}

void poseHappy() {
    moveServoSmooth(SERVO_CH_LEFT_HAND,  130, 5.0f);
    moveServoSmooth(SERVO_CH_RIGHT_HAND,  50, 5.0f);
    moveServoSmooth(SERVO_CH_LEFT_HIP,    90, 3.0f);
    moveServoSmooth(SERVO_CH_RIGHT_HIP,   90, 3.0f);
    moveServoSmooth(SERVO_CH_LEFT_FOOT,   80, 3.0f);
    moveServoSmooth(SERVO_CH_RIGHT_FOOT, 100, 3.0f);
}

void poseSad() {
    moveServoSmooth(SERVO_CH_LEFT_HAND,   60, 4.0f);
    moveServoSmooth(SERVO_CH_RIGHT_HAND, 120, 4.0f);
    moveServoSmooth(SERVO_CH_LEFT_HIP,    85, 3.0f);
    moveServoSmooth(SERVO_CH_RIGHT_HIP,   95, 3.0f);
    moveServoSmooth(SERVO_CH_LEFT_FOOT,   90, 3.0f);
    moveServoSmooth(SERVO_CH_RIGHT_FOOT,  90, 3.0f);
}

void poseWave() {
    // Raise right hand and wave
    moveServoSmooth(SERVO_CH_RIGHT_HAND, 150, 6.0f);
    moveServoSmooth(SERVO_CH_LEFT_HAND,   90, 4.0f);
    moveServoSmooth(SERVO_CH_LEFT_HIP,    90, 3.0f);
    moveServoSmooth(SERVO_CH_RIGHT_HIP,   90, 3.0f);
}
