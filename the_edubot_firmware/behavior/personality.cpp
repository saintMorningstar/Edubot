#include "personality.h"
#include "emotions.h"
#include "../system/logger.h"

void initPersonality() {
    logInfo("Personality: Friendly & Curious");
    setEmotion(EMOTION_HAPPY);
}
