#include "ble_commands.h"
#include "ble_server.h"
#include "../system/logger.h"
#include "../system/states.h"
#include "../motion/walking.h"
#include "../motion/dancing.h"
#include "../motion/poses.h"
#include "../motion/motion_manager.h"
#include "../behavior/emotions.h"
#include "../display/expressions.h"
#include "../audio/audio_manager.h"
#include "../audio/sounds.h"
#include "../audio/volume_control.h"
#include "../motion/servos.h"
#include "../peripherals/led_manager.h"

void processBLECommand(String cmd) {
    cmd.trim();
    notifyLEDCommand();

    // ── Movement ─────────────────────────────────────────────────────────────
    if      (cmd == "MOVE_FORWARD")  { walkForward();   setState(WALKING); }
    else if (cmd == "MOVE_BACKWARD") { walkBackward();  setState(WALKING); }
    else if (cmd == "TURN_LEFT")     { turnLeft();      setState(WALKING); }
    else if (cmd == "TURN_RIGHT")    { turnRight();     setState(WALKING); }
    else if (cmd == "STOP")          { stopAllMotion(); setState(IDLE); }

    // ── Dance ─────────────────────────────────────────────────────────────────
    else if (cmd == "DANCE")      { danceRoutine1(); setState(DANCING); }
    else if (cmd == "DANCE_2")    { danceRoutine2(); setState(DANCING); }
    else if (cmd == "STOP_DANCE") { stopDancing();   setState(IDLE); }

    // ── Emotions / Faces ──────────────────────────────────────────────────────
    else if (cmd == "HAPPY")    { setEmotion(EMOTION_HAPPY);    showExpression(FACE_HAPPY); }
    else if (cmd == "SAD")      { setEmotion(EMOTION_SAD);      showExpression(FACE_SAD); }
    else if (cmd == "ANGRY")    { setEmotion(EMOTION_ANGRY);    showExpression(FACE_ANGRY); }
    else if (cmd == "SLEEPY")   { setEmotion(EMOTION_SLEEPY);   showExpression(FACE_SLEEPY); }
    else if (cmd == "EXCITED")  { setEmotion(EMOTION_EXCITED);  showExpression(FACE_EXCITED); }
    else if (cmd == "THINKING") { setEmotion(EMOTION_THINKING); showExpression(FACE_THINKING); }

    // ── Poses ─────────────────────────────────────────────────────────────────
    else if (cmd == "POSE_NEUTRAL") { poseNeutral(); }
    else if (cmd == "POSE_HAPPY")   { poseHappy(); }
    else if (cmd == "POSE_SAD")     { poseSad(); }
    else if (cmd == "POSE_WAVE")    { poseWave(); }

    // ── Sounds ────────────────────────────────────────────────────────────────
    else if (cmd == "PLAY_SOUND_1") { playSound(SOUND_STARTUP); }
    else if (cmd == "PLAY_SOUND_2") { playSound(SOUND_HAPPY); }
    else if (cmd == "PLAY_SOUND_3") { playSound(SOUND_SAD); }
    else if (cmd == "PLAY_SOUND_4") { playSound(SOUND_DANCE); }
    else if (cmd == "PLAY_SOUND_5") { playSound(SOUND_EXCITED); }
    else if (cmd == "STOP_SOUND")   { stopAudio(); }

    // ── Volume ────────────────────────────────────────────────────────────────
    else if (cmd.startsWith("VOL:")) {
        int vol = cmd.substring(4).toInt();
        setMasterVolume((uint8_t)constrain(vol, 0, 30));
    }

    // ── Servo direct ─────────────────────────────────────────────────────────
    else if (cmd.startsWith("SERVO:")) {
        // Format: SERVO:channel:angle  e.g. SERVO:0:90
        int colon1 = cmd.indexOf(':', 6);
        if (colon1 > 0) {
            uint8_t ch  = cmd.substring(6, colon1).toInt();
            int     ang = cmd.substring(colon1 + 1).toInt();
            moveServo(ch, constrain(ang, 0, 180));
        }
    }

    // ── Sleep / Wake ─────────────────────────────────────────────────────────
    else if (cmd == "SLEEP") { setState(SLEEPING); }
    else if (cmd == "WAKE")  { setState(IDLE); }

    // ── Status request ────────────────────────────────────────────────────────
    else if (cmd == "STATUS") {
        sendBLEMessage(String("{\"state\":\"") + stateToString(currentState) + "\"}");
    }

    else {
        logError(String("Unknown BLE cmd: ") + cmd);
    }
}
