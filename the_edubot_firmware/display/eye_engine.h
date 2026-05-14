#ifndef EYE_ENGINE_H
#define EYE_ENGINE_H

#include "expressions.h"

void initEyeEngine();
void blinkEyes();
void lookLeft();
void lookRight();
void lookCenter();
void drawEyes(EyeType left, EyeType right);
void drawBrows();
void drawCheeks();

#endif // EYE_ENGINE_H
