#include "routines.h"
#include "emotions.h"
#include "../display/expressions.h"
#include "../audio/audio_manager.h"
#include "../audio/sounds.h"
#include "../motion/poses.h"
#include "../system/states.h"
#include "../system/logger.h"

static unsigned long idleLastAction = 0;
#define IDLE_ACTION_MS  8000UL

void startupRoutine() {
    logInfo("Startup routine");
    showExpression(FACE_HAPPY);
    poseNeutral();
    delay(300);
    poseHappy();
    delay(500);
    poseNeutral();
}

void idleRoutine() {
    if (millis() - idleLastAction < IDLE_ACTION_MS) return;
    idleLastAction = millis();

    static uint8_t step = 0;
    switch (step % 5) {
        case 0: setEmotion(EMOTION_HAPPY);    break;
        case 1: poseWave();                   break;
        case 2: setEmotion(EMOTION_THINKING); break;
        case 3: poseNeutral();                break;
        case 4: setEmotion(EMOTION_EXCITED);  break;
    }
    step++;
}

void sleepRoutine() {
    showExpression(FACE_SLEEPY);
    poseNeutral();
    playSound(SOUND_SLEEPY);
    setState(SLEEPING);
}
