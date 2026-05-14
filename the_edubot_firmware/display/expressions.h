#ifndef EXPRESSIONS_H
#define EXPRESSIONS_H

#include <Arduino.h>

// ── Face identifiers ──────────────────────────────────────────────────────────
enum Expressions {
    FACE_HAPPY,
    FACE_SAD,
    FACE_ANGRY,
    FACE_SLEEPY,
    FACE_THINKING,
    FACE_BLINK,
    FACE_EXCITED,
    FACE_DANCING    // new: shown when DANCE BLE command received
};

// ── Eye shapes ────────────────────────────────────────────────────────────────
enum EyeType {
    EYE_OPEN, EYE_CLOSED, EYE_WIDE, EYE_DOT,
    EYE_HALF, EYE_SQUINT, EYE_WINK, EYE_X,
    EYE_SPIRAL, EYE_HEART, EYE_STAR,
    EYE_ARC     // new: upward ∩ arc — happy ^^ style
};

// ── Mouth shapes (mirrors app MouthShape type) ────────────────────────────────
enum MouthType {
    MOUTH_SMILE,    MOUTH_BIG_SMILE,
    MOUTH_FROWN,    MOUTH_BIG_FROWN,
    MOUTH_FLAT,     MOUTH_OPEN,
    MOUTH_O_SHAPE,  MOUTH_TEETH,
    MOUTH_TONGUE,   MOUTH_KISS,
    MOUTH_WAVY
};

// ── Animation frame ───────────────────────────────────────────────────────────
struct FaceFrame {
    EyeType   leftEye;
    EyeType   rightEye;
    MouthType mouth;
    bool      cheeks;
    bool      brows;
};

struct FaceDef {
    const FaceFrame* frames;
    uint8_t          numFrames;
    uint16_t         frameMs;
};

// ── Public API ────────────────────────────────────────────────────────────────
Expressions    getCurrentExpression();
void           showExpression(Expressions face);
void           redrawCurrentFace();
void           advanceFaceFrame();
const FaceDef& getFaceDef(Expressions face);

#endif // EXPRESSIONS_H
