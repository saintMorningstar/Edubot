#ifndef SERVOS_H
#define SERVOS_H

#include <Arduino.h>

void initServos();
void moveServo(uint8_t channel, int angle);
void moveServoSmooth(uint8_t channel, int targetAngle, float speed);
void centerServos();
void updateServoInterpolation();
int  getServoAngle(uint8_t channel);

#endif // SERVOS_H
