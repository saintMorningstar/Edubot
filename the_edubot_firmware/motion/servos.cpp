#include "servos.h"
#include "../system/config.h"
#include "../system/logger.h"
#include <ESP32Servo.h>

static Servo servos[NUM_SERVOS];

static const uint8_t SERVO_PINS[NUM_SERVOS] = {
    SERVO_PIN_LEFT_HIP,
    SERVO_PIN_LEFT_FOOT,
    SERVO_PIN_LEFT_HAND,
    SERVO_PIN_RIGHT_HIP,
    SERVO_PIN_RIGHT_FOOT,
    SERVO_PIN_RIGHT_HAND
};

struct ServoState {
    float currentAngle;
    float targetAngle;
    float speed;
    bool  moving;
};

static ServoState servoStates[NUM_SERVOS];

static const int8_t  SERVO_OFFSETS[NUM_SERVOS] = { 0, 0, 0, 0, 0, 0 };
static const uint8_t SERVO_CENTER[NUM_SERVOS]  = { 90, 90, 90, 90, 90, 90 };

static void writeServo(uint8_t channel, int angle) {
    servos[channel].write(angle);
}

void initServos() {
    Wire.begin(I2C_SDA, I2C_SCL);

    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);

    for (int i = 0; i < NUM_SERVOS; i++) {
        servos[i].setPeriodHertz(50);
        servos[i].attach(SERVO_PINS[i], 500, 2500);

        servoStates[i].currentAngle = 90.0f;
        servoStates[i].targetAngle  = 90.0f;
        servoStates[i].speed        = SERVO_DEFAULT_SPEED;
        servoStates[i].moving       = false;
        writeServo(i, 90);
        logInfo(String("Servo ch") + i + " GPIO" + SERVO_PINS[i] + " attached");
    }
    delay(300);
    logInfo("Servos ready");
}

void moveServo(uint8_t channel, int angle) {
    if (channel >= NUM_SERVOS) return;
    int clamped = constrain(angle + SERVO_OFFSETS[channel], 0, 180);
    servoStates[channel].currentAngle = clamped;
    servoStates[channel].targetAngle  = clamped;
    servoStates[channel].moving       = false;
    writeServo(channel, clamped);
}

void moveServoSmooth(uint8_t channel, int targetAngle, float speed) {
    if (channel >= NUM_SERVOS) return;
    servoStates[channel].targetAngle = constrain(targetAngle, 0, 180);
    servoStates[channel].speed       = (speed > 0) ? speed : SERVO_DEFAULT_SPEED;
    servoStates[channel].moving      = true;
}

void centerServos() {
    for (int i = 0; i < NUM_SERVOS; i++) {
        moveServo(i, SERVO_CENTER[i]);
    }
}

int getServoAngle(uint8_t channel) {
    if (channel >= NUM_SERVOS) return 90;
    return (int)servoStates[channel].currentAngle;
}

void updateServoInterpolation() {
    for (int i = 0; i < NUM_SERVOS; i++) {
        if (!servoStates[i].moving) continue;

        float diff = servoStates[i].targetAngle - servoStates[i].currentAngle;
        if (fabsf(diff) <= 0.5f) {
            servoStates[i].currentAngle = servoStates[i].targetAngle;
            servoStates[i].moving = false;
        } else {
            float step = (diff > 0) ? servoStates[i].speed : -servoStates[i].speed;
            servoStates[i].currentAngle += step;
        }
        int clamped = constrain((int)servoStates[i].currentAngle + SERVO_OFFSETS[i], 0, 180);
        writeServo(i, clamped);
    }
}
