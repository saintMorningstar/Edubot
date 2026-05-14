/*
========================================================
                    EDUBOT.ino
========================================================
ESP32-S3 N16R8
BLE Robotics Architecture
========================================================
*/

#include "system/config.h"
#include "system/states.h"
#include "system/tasks.h"
#include "system/logger.h"
#include "system/events.h"
#include "system/scheduler.h"
#include "system/watchdog.h"

#include "bluetooth/ble_server.h"
#include "bluetooth/ble_callbacks.h"
#include "bluetooth/ble_commands.h"
#include "bluetooth/ble_services.h"
#include "bluetooth/ble_characteristics.h"
#include "bluetooth/ble_notifications.h"

#include "audio/dfplayer.h"
#include "audio/sounds.h"
#include "audio/audio_manager.h"
#include "audio/volume_control.h"
#include "audio/voice_control.h"

#include "motion/servos.h"
#include "motion/poses.h"
#include "motion/walking.h"
#include "motion/dancing.h"
#include "motion/motion_manager.h"
#include "motion/gait_engine.h"
#include "motion/servo_calibration.h"

#include "display/oled.h"
#include "display/expressions.h"
#include "display/animations.h"
#include "display/face_manager.h"
#include "display/eye_engine.h"
#include "display/mouth_engine.h"

#include "behavior/emotions.h"
#include "behavior/reactions.h"
#include "behavior/routines.h"
#include "behavior/personality.h"
#include "behavior/mood_manager.h"
#include "behavior/interaction_engine.h"

#include "sensors/touch.h"
#include "sensors/ultrasonic.h"
#include "sensors/dht11.h"
#include "sensors/max30100.h"

#include "storage/preferences_manager.h"
#include "storage/sd_manager.h"

#include "safety/power_manager.h"
#include "safety/thermal_monitor.h"
#include "safety/failsafe.h"

#include "app/app_protocol.h"
#include "app/packet_handler.h"

#include "peripherals/led_manager.h"

/*
========================================================
                    TIMERS
========================================================
*/

unsigned long sensorTimer = 0;
unsigned long blinkTimer = 0;
unsigned long moodTimer = 0;
unsigned long batteryTimer = 0;
unsigned long animationTimer = 0;
unsigned long notificationTimer = 0;

const unsigned long SENSOR_INTERVAL = 100;
const unsigned long BLINK_INTERVAL = 4000;
const unsigned long MOOD_INTERVAL = 1000;
const unsigned long BATTERY_INTERVAL = 5000;
const unsigned long ANIMATION_INTERVAL = 50;
const unsigned long NOTIFICATION_INTERVAL = 500;

/*
========================================================
                    ROBOT FLAGS
========================================================
*/

bool robotAwake = true;
bool lowBattery = false;
bool obstacleDetected = false;
bool heartSensorActive = false;

/*
========================================================
                    SETUP
========================================================
*/

void setup() {

    Serial.begin(115200);

    /*
    ----------------------------------------------------
                    LOGGER
    ----------------------------------------------------
    */

    logInfo("=================================");
    logInfo("EDUBOT BOOTING");
    logInfo("ESP32-S3 BLE ROBOTICS SYSTEM");
    logInfo("=================================");

    /*
    ----------------------------------------------------
                    WATCHDOG
    ----------------------------------------------------
    */

    initWatchdog();

    /*
    ----------------------------------------------------
                    LEDS
    ----------------------------------------------------
    */

    initLEDs();

    /*
    ----------------------------------------------------
                    STORAGE
    ----------------------------------------------------
    */

    loadPreferences();

    initSDCard();

    /*
    ----------------------------------------------------
                    OLED DISPLAY
    ----------------------------------------------------
    */

    initOLED();

    initFaceManager();

    clearDisplay();

    showExpression(FACE_HAPPY);

    updateDisplay();

    /*
    ----------------------------------------------------
                    AUDIO SYSTEM
    ----------------------------------------------------
    */

    initAudioManager();

    initDFPlayer();

    setMasterVolume(25);

    /*
    ----------------------------------------------------
                    MOTION SYSTEM
    ----------------------------------------------------
    */

    initServos();

    initMotionManager();

    initGaitEngine();

    loadServoCalibration();

    centerServos();

    poseNeutral();

    /*
    ----------------------------------------------------
                    BLUETOOTH SYSTEM
    ----------------------------------------------------
    */

    createBLEServices();

    createBLECharacteristics();

    initBLE();

    startBLEAdvertising();

    /*
    ----------------------------------------------------
                    VOICE CONTROL
    ----------------------------------------------------
    NOTE: disabled until srmodels.bin is flashed to the
    model partition (0xC10000). Re-enable after flashing.
    */

    // initVoiceControl();  // requires OPI PSRAM — re-enable once PSRAM init issue is resolved

    /*
    ----------------------------------------------------
                    SENSOR SYSTEM
    ----------------------------------------------------
    */

    initTouchSensor();

    initUltrasonic();

    initDHT11();

    initMAX30100();

    /*
    ----------------------------------------------------
                    PERSONALITY SYSTEM
    ----------------------------------------------------
    */

    initPersonality();

    setEmotion(EMOTION_HAPPY);

    /*
    ----------------------------------------------------
                    STARTUP ROUTINE
    ----------------------------------------------------
    */

    startupRoutine();

    playSound(SOUND_STARTUP);

    blinkEyes();

    /*
    ----------------------------------------------------
                    STATE
    ----------------------------------------------------
    */

    setState(IDLE);

    logInfo("EDUBOT READY");
}

/*
========================================================
                    MAIN LOOP
========================================================
*/

void loop() {

    /*
    ----------------------------------------------------
                    WATCHDOG
    ----------------------------------------------------
    */

    updateTimers();

    updateLEDs();

    /*
    ----------------------------------------------------
                    SENSOR TASKS
    ----------------------------------------------------
    */

    if (millis() - sensorTimer >= SENSOR_INTERVAL) {

        sensorTimer = millis();

        /*
        TOUCH SENSOR
        */

        if (isTouched()) {

            reactToTouch();

            triggerEvent("TOUCH_SENSOR");

            playSound(SOUND_HAPPY);

            blinkEyes();
        }

        /*
        ULTRASONIC SENSOR
        */

        float distance = getDistanceCM();

        if (distance > 0 && distance < 15) {

            obstacleDetected = true;

            reactToObstacle();

            stopWalking();

            showExpression(FACE_ANGRY);

            triggerEvent("OBSTACLE");
        }
        else {

            obstacleDetected = false;
        }

        /*
        DHT11 SENSOR
        */

        float temperature = getTemperature();

        float humidity = getHumidity();

        /*
        MAX30100 SENSOR
        */

        if (fingerDetected()) {

            heartSensorActive = true;

            float heartRate = getHeartRate();

            float spo2 = getSpO2();

            sendHeartRateNotification();
        }
        else {

            heartSensorActive = false;
        }
    }

    /*
    ----------------------------------------------------
                    BLINK ENGINE
    ----------------------------------------------------
    */

    if (millis() - blinkTimer >= BLINK_INTERVAL) {

        blinkTimer = millis();

        blinkEyes();
    }

    /*
    ----------------------------------------------------
                    MOOD ENGINE
    ----------------------------------------------------
    */

    if (millis() - moodTimer >= MOOD_INTERVAL) {

        moodTimer = millis();

        updateMood();

        processInteraction();
    }

    /*
    ----------------------------------------------------
                    BATTERY MONITOR
    ----------------------------------------------------
    */

    if (millis() - batteryTimer >= BATTERY_INTERVAL) {

        batteryTimer = millis();

        monitorBattery();

        monitorTemperature();

        if (getBatteryVoltage() < 3.3) {

            lowBattery = true;

            emergencyStop();

            stopAudio();

            showExpression(FACE_SLEEPY);

            setEmotion(EMOTION_SAD);

            playSound(SOUND_SAD);

            setState(SLEEPING);

            logError("LOW BATTERY");
        }
        else {

            lowBattery = false;
        }
    }

    /*
    ----------------------------------------------------
                    DISPLAY ENGINE
    ----------------------------------------------------
    */

    if (millis() - animationTimer >= ANIMATION_INTERVAL) {

        animationTimer = millis();

        updateFace();
    }

    /*
    ----------------------------------------------------
                    BLE NOTIFICATIONS
    ----------------------------------------------------
    */

    if (millis() - notificationTimer >= NOTIFICATION_INTERVAL) {

        notificationTimer = millis();

        sendBatteryNotification();

        sendDistanceNotification();

        if (heartSensorActive) {

            sendHeartRateNotification();
        }
    }

    /*
    ----------------------------------------------------
                    MOTION ENGINE
    ----------------------------------------------------
    */

    updateWalkingCycle();

    /*
    ----------------------------------------------------
                    ROBOT STATE ENGINE
    ----------------------------------------------------
    */

    switch(currentState) {

        case IDLE:

            idleRoutine();

        break;

        case WALKING:

            walkForward();

        break;

        case DANCING:

            danceRoutine1();

        break;

        case SLEEPING:

        break;

        case LISTENING:

        break;

        case THINKING:

        break;

        case SPEAKING:

            startTalkingAnimation();

        break;
    }

    /*
    ----------------------------------------------------
                    SMALL DELAY
    ----------------------------------------------------
    */

    delay(5);
}