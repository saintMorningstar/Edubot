#ifndef EMOTIONS_H
#define EMOTIONS_H

enum EmotionState {
    EMOTION_HAPPY,
    EMOTION_SAD,
    EMOTION_ANGRY,
    EMOTION_SLEEPY,
    EMOTION_EXCITED,
    EMOTION_THINKING
};

EmotionState getCurrentEmotion();
void setEmotion(EmotionState emotion);

#endif // EMOTIONS_H
