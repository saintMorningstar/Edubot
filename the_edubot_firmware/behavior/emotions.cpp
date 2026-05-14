#include "emotions.h"
#include "../display/expressions.h"
#include "../audio/audio_manager.h"
#include "../audio/sounds.h"
#include "../motion/poses.h"
#include "../system/logger.h"

static EmotionState currentEmotion = EMOTION_HAPPY;

EmotionState getCurrentEmotion() {
    return currentEmotion;
}

void setEmotion(EmotionState emotion) {
    if (currentEmotion == emotion) return;
    currentEmotion = emotion;

    switch (emotion) {
        case EMOTION_HAPPY:
            showExpression(FACE_HAPPY);
            poseHappy();
            playSound(SOUND_HAPPY);
            break;
        case EMOTION_SAD:
            showExpression(FACE_SAD);
            poseSad();
            playSound(SOUND_SAD);
            break;
        case EMOTION_ANGRY:
            showExpression(FACE_ANGRY);
            poseNeutral();
            playSound(SOUND_ANGRY);
            break;
        case EMOTION_SLEEPY:
            showExpression(FACE_SLEEPY);
            poseNeutral();
            playSound(SOUND_SLEEPY);
            break;
        case EMOTION_EXCITED:
            showExpression(FACE_EXCITED);
            poseHappy();
            playSound(SOUND_EXCITED);
            break;
        case EMOTION_THINKING:
            showExpression(FACE_THINKING);
            poseNeutral();
            playSound(SOUND_THINKING);
            break;
    }
    logInfo(String("Emotion: ") + (int)emotion);
}
