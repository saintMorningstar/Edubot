#include "reactions.h"
#include "emotions.h"
#include "../display/expressions.h"
#include "../audio/audio_manager.h"
#include "../audio/sounds.h"
#include "../motion/poses.h"
#include "../motion/walking.h"
#include "../system/logger.h"
#include "../system/states.h"

void reactToTouch() {
    logInfo("React: touch");
    setEmotion(EMOTION_HAPPY);
    poseWave();
    playSound(SOUND_TOUCH);
}

void reactToObstacle() {
    logInfo("React: obstacle");
    stopWalking();
    setEmotion(EMOTION_ANGRY);
    playSound(SOUND_OBSTACLE);
}

void reactToWakeWord() {
    logInfo("React: wake word");
    setEmotion(EMOTION_EXCITED);
    playSound(SOUND_GREET);
    setState(LISTENING);
}

void reactToBLEConnection() {
    logInfo("React: BLE connected");
    setEmotion(EMOTION_EXCITED);
    poseHappy();
    playSound(SOUND_GREET);
}
