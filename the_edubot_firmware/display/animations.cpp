#include "animations.h"
#include "eye_engine.h"
#include "mouth_engine.h"
#include "expressions.h"

void playBlinkAnimation() {
    blinkEyes();
}

void playTalkingAnimation() {
    startTalkingAnimation();
}

void playThinkingAnimation() {
    showExpression(FACE_THINKING);
}
