#include "face_manager.h"
#include "expressions.h"
#include "eye_engine.h"
#include "mouth_engine.h"
#include "animations.h"

static unsigned long _lastIdleAnim = 0;
static int           _idleStep     = 0;
#define IDLE_ANIM_MS 8000

void initFaceManager() {
    initEyeEngine();
    initMouthEngine();
}

void updateFace() {
    updateMouthAnimation();
    advanceFaceFrame();

    if (millis() - _lastIdleAnim > IDLE_ANIM_MS) {
        _lastIdleAnim = millis();
        switch (_idleStep % 3) {
            case 0: lookLeft();   break;
            case 1: lookRight();  break;
            case 2: lookCenter(); break;
        }
        _idleStep++;
        redrawCurrentFace();
    }
}
