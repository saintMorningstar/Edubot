#include "mood_manager.h"
#include "emotions.h"
#include "../system/states.h"

void updateMood() {
    // Only drift emotion when idle
    if (getState() != IDLE) return;

    EmotionState em = getCurrentEmotion();
    if (em == EMOTION_ANGRY || em == EMOTION_SAD) {
        static unsigned long lastDrift = 0;
        if (millis() - lastDrift > 10000UL) {
            lastDrift = millis();
            setEmotion(EMOTION_HAPPY);
        }
    }
}
