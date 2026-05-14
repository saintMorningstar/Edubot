#include "expressions.h"
#include "oled.h"
#include "eye_engine.h"
#include "mouth_engine.h"
#include "../system/config.h"

// ── Face frame sequences (mirror app data/faces.ts) ───────────────────────────

static const FaceFrame HAPPY_F[] = {
    { EYE_OPEN,   EYE_OPEN,   MOUTH_SMILE, true,  false },
    { EYE_OPEN,   EYE_OPEN,   MOUTH_SMILE, true,  false },
    { EYE_OPEN,   EYE_OPEN,   MOUTH_SMILE, true,  false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_SMILE, true,  false },
    { EYE_OPEN,   EYE_OPEN,   MOUTH_SMILE, true,  false },
};
static const FaceFrame SAD_F[] = {
    { EYE_OPEN, EYE_OPEN, MOUTH_FROWN, false, false },
    { EYE_HALF, EYE_HALF, MOUTH_FROWN, false, false },
    { EYE_OPEN, EYE_OPEN, MOUTH_FROWN, false, false },
};
static const FaceFrame ANGRY_F[] = {
    { EYE_SQUINT, EYE_SQUINT, MOUTH_FROWN,     false, true },
    { EYE_SQUINT, EYE_SQUINT, MOUTH_BIG_FROWN, false, true },
    { EYE_SQUINT, EYE_SQUINT, MOUTH_FROWN,     false, true },
};
static const FaceFrame SLEEPY_F[] = {
    { EYE_CLOSED, EYE_CLOSED, MOUTH_FLAT, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_FLAT, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_FLAT, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_OPEN, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_FLAT, false, false },
};
static const FaceFrame THINKING_F[] = {
    { EYE_OPEN,   EYE_SQUINT, MOUTH_FLAT, false, false },
    { EYE_OPEN,   EYE_OPEN,   MOUTH_FLAT, false, false },
    { EYE_OPEN,   EYE_SQUINT, MOUTH_FLAT, false, false },
};
static const FaceFrame BLINK_F[] = {
    { EYE_OPEN,   EYE_OPEN,   MOUTH_SMILE, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_SMILE, false, false },
    { EYE_OPEN,   EYE_OPEN,   MOUTH_SMILE, false, false },
};
static const FaceFrame EXCITED_F[] = {
    { EYE_WIDE,   EYE_WIDE,   MOUTH_BIG_SMILE, false, false },
    { EYE_WIDE,   EYE_WIDE,   MOUTH_BIG_SMILE, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_BIG_SMILE, false, false },
    { EYE_WIDE,   EYE_WIDE,   MOUTH_BIG_SMILE, false, false },
};

// Order must match Expressions enum exactly
static const FaceDef FACE_TABLE[] = {
    { HAPPY_F,    5,  600 },   // FACE_HAPPY
    { SAD_F,      3,  700 },   // FACE_SAD
    { ANGRY_F,    3,  500 },   // FACE_ANGRY
    { SLEEPY_F,   5, 1000 },   // FACE_SLEEPY
    { THINKING_F, 3,  800 },   // FACE_THINKING
    { BLINK_F,    3,  150 },   // FACE_BLINK
    { EXCITED_F,  4,  400 },   // FACE_EXCITED
};

// ── Animation state ───────────────────────────────────────────────────────────

static Expressions   _face        = FACE_HAPPY;
static uint8_t       _frame       = 0;
static unsigned long _lastFrameMs = 0;

// ── Internal draw ─────────────────────────────────────────────────────────────

static void drawFrame() {
    const FaceDef&   def = FACE_TABLE[(int)_face];
    const FaceFrame& fr  = def.frames[_frame];
    display.clearDisplay();
    display.fillCircle(64, 32, 30, SSD1306_WHITE);
    drawEyes(fr.leftEye, fr.rightEye);
    drawMouth(fr.mouth);
    if (fr.cheeks) drawCheeks();
    if (fr.brows)  drawBrows();
    display.display();
}

// ── Public API ────────────────────────────────────────────────────────────────

const FaceDef& getFaceDef(Expressions face) {
    return FACE_TABLE[(int)face];
}

Expressions getCurrentExpression() { return _face; }

void showExpression(Expressions face) {
    _face        = face;
    _frame       = 0;
    _lastFrameMs = millis();
    drawFrame();
}

void redrawCurrentFace() {
    drawFrame();
}

void advanceFaceFrame() {
    if (isSpeaking) return;
    const FaceDef& def = FACE_TABLE[(int)_face];
    if (def.numFrames <= 1) return;
    if (millis() - _lastFrameMs < def.frameMs) return;
    _lastFrameMs = millis();
    _frame       = (_frame + 1) % def.numFrames;
    drawFrame();
}
