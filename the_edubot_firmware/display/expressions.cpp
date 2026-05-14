#include "expressions.h"
#include "oled.h"
#include "eye_engine.h"
#include "mouth_engine.h"
#include "../system/config.h"

// Colors: face is white, so features inside face = BLACK; decorations outside = WHITE
#define FG  SSD1306_BLACK
#define BG  SSD1306_WHITE

// ── Face frame sequences ──────────────────────────────────────────────────────

static const FaceFrame HAPPY_F[] = {
    { EYE_ARC,    EYE_ARC,    MOUTH_BIG_SMILE, true,  false },
    { EYE_ARC,    EYE_ARC,    MOUTH_BIG_SMILE, true,  false },
    { EYE_ARC,    EYE_ARC,    MOUTH_BIG_SMILE, true,  false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_BIG_SMILE, true,  false },  // blink
    { EYE_ARC,    EYE_ARC,    MOUTH_BIG_SMILE, true,  false },
};
static const FaceFrame SAD_F[] = {
    { EYE_HALF, EYE_HALF, MOUTH_FROWN,     false, true  },
    { EYE_HALF, EYE_HALF, MOUTH_BIG_FROWN, false, true  },
    { EYE_HALF, EYE_HALF, MOUTH_FROWN,     false, true  },
    { EYE_HALF, EYE_HALF, MOUTH_BIG_FROWN, false, true  },
};
static const FaceFrame ANGRY_F[] = {
    { EYE_SQUINT, EYE_SQUINT, MOUTH_BIG_FROWN, false, true  },
    { EYE_SQUINT, EYE_SQUINT, MOUTH_FROWN,     false, true  },
    { EYE_SQUINT, EYE_SQUINT, MOUTH_BIG_FROWN, false, true  },
};
static const FaceFrame SLEEPY_F[] = {
    { EYE_HALF,   EYE_HALF,   MOUTH_FLAT, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_FLAT, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_FLAT, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_OPEN, false, false },  // yawn
    { EYE_CLOSED, EYE_CLOSED, MOUTH_FLAT, false, false },
    { EYE_HALF,   EYE_HALF,   MOUTH_FLAT, false, false },
};
static const FaceFrame THINKING_F[] = {
    { EYE_OPEN,   EYE_SQUINT, MOUTH_FLAT, false, false },
    { EYE_OPEN,   EYE_OPEN,   MOUTH_FLAT, false, false },
    { EYE_HALF,   EYE_OPEN,   MOUTH_FLAT, false, false },
    { EYE_OPEN,   EYE_SQUINT, MOUTH_FLAT, false, false },
};
static const FaceFrame BLINK_F[] = {
    { EYE_OPEN,   EYE_OPEN,   MOUTH_SMILE, false, false },
    { EYE_CLOSED, EYE_CLOSED, MOUTH_SMILE, false, false },
    { EYE_OPEN,   EYE_OPEN,   MOUTH_SMILE, false, false },
};
static const FaceFrame EXCITED_F[] = {
    { EYE_WIDE, EYE_WIDE, MOUTH_BIG_SMILE, false, false },
    { EYE_STAR, EYE_STAR, MOUTH_BIG_SMILE, false, false },
    { EYE_WIDE, EYE_WIDE, MOUTH_TEETH,     false, false },
    { EYE_STAR, EYE_STAR, MOUTH_BIG_SMILE, false, false },
};
static const FaceFrame DANCING_F[] = {
    { EYE_ARC,  EYE_WINK, MOUTH_BIG_SMILE, true,  false },
    { EYE_ARC,  EYE_ARC,  MOUTH_BIG_SMILE, true,  false },
    { EYE_WINK, EYE_ARC,  MOUTH_TEETH,     true,  false },
    { EYE_ARC,  EYE_ARC,  MOUTH_BIG_SMILE, true,  false },
};

// Order must match Expressions enum exactly
static const FaceDef FACE_TABLE[] = {
    { HAPPY_F,    5,  450 },   // FACE_HAPPY
    { SAD_F,      4,  750 },   // FACE_SAD
    { ANGRY_F,    3,  280 },   // FACE_ANGRY
    { SLEEPY_F,   6, 1000 },   // FACE_SLEEPY
    { THINKING_F, 4,  750 },   // FACE_THINKING
    { BLINK_F,    3,  130 },   // FACE_BLINK
    { EXCITED_F,  4,  320 },   // FACE_EXCITED
    { DANCING_F,  4,  380 },   // FACE_DANCING
};

// ── Animation state ───────────────────────────────────────────────────────────

static Expressions   _face        = FACE_HAPPY;
static uint8_t       _frame       = 0;
static unsigned long _lastFrameMs = 0;
static int           _decorStep   = 0;
static unsigned long _lastDecorMs = 0;
#define DECOR_MS  85

// ── Decoration helpers (drawn outside or on face in appropriate color) ─────────

static void drawZZZ(int step) {
    // Three Zs rising from near the face, right side
    int rise = step % 26;
    struct { int x, y, s; } zz[] = {
        { 97, 56 - rise,      4 },
        { 102, 49 - rise,     3 },
        { 106, 43 - rise,     2 },
    };
    for (int i = 0; i < 3; i++) {
        int x = zz[i].x, y = zz[i].y, s = zz[i].s;
        if (y > 1 && y + s < 63) {
            display.drawFastHLine(x,         y,       s + 1, BG);
            display.drawLine     (x + s,     y,       x,     y + s, BG);
            display.drawFastHLine(x,         y + s,   s + 1, BG);
        }
    }
}

static void drawSparkles(int step) {
    // 4-pointed star sparkles in the four screen corners, staggered timing
    struct { int8_t x, y; } pts[] = { {8,6}, {118,6}, {8,57}, {118,57} };
    for (int i = 0; i < 4; i++) {
        if (((step + i * 4) % 8) < 4) {
            int x = pts[i].x, y = pts[i].y;
            display.drawPixel      (x,     y,     BG);
            display.drawFastHLine  (x - 3, y,     7, BG);
            display.drawFastVLine  (x,     y - 3, 7, BG);
        }
    }
}

static void drawTear(int step) {
    // Teardrop falls from right cheek area (inside face = black on white)
    int drop = step % 20;
    int tx = 79, ty = 27 + drop;
    if (ty < 49) {
        display.fillCircle(tx, ty + 2, 2, FG);
        display.drawPixel (tx, ty,     FG);
        display.drawPixel (tx, ty + 1, FG);
    }
}

static void drawMusicNote(int step) {
    // Quarter note floating upward right of face
    auto drawNote = [](int x, int y) {
        if (y < 3 || y + 8 > 61) return;
        display.fillCircle  (x,     y + 7, 3, BG);
        display.drawFastVLine(x + 3, y,     7, BG);
        display.drawFastHLine(x + 3, y,     5, BG);
    };
    int rise1 = step % 24;
    drawNote(99, 52 - rise1 * 2);
    int rise2 = (step + 12) % 24;
    drawNote(108, 52 - rise2 * 2);
}

static void drawThinkDots(int step) {
    // "..." appear one-by-one to the right of the face
    int count = (step % 9) / 3 + 1;
    for (int i = 0; i < count; i++) {
        display.fillCircle(100 + i * 8, 32, 2, BG);
    }
}

static void drawAngryLines(int step) {
    // Short radiating lines from the top-sides of the face head
    if ((step % 4) >= 2) return;  // flash on/off
    display.drawLine(87,  9, 95,  3, BG);
    display.drawLine(89, 12, 99,  7, BG);
    display.drawLine(41,  9, 33,  3, BG);
    display.drawLine(39, 12, 29,  7, BG);
}

static void drawDecoration() {
    switch (_face) {
        case FACE_SLEEPY:   drawZZZ(_decorStep);        break;
        case FACE_EXCITED:  drawSparkles(_decorStep);   break;
        case FACE_SAD:      drawTear(_decorStep);        break;
        case FACE_DANCING:  drawMusicNote(_decorStep);  break;
        case FACE_THINKING: drawThinkDots(_decorStep);  break;
        case FACE_ANGRY:    drawAngryLines(_decorStep); break;
        default: break;
    }
}

// ── Internal draw ─────────────────────────────────────────────────────────────

static void drawFrame() {
    const FaceDef&   def = FACE_TABLE[(int)_face];
    const FaceFrame& fr  = def.frames[_frame];

    display.clearDisplay();
    display.fillCircle(64, 32, 30, BG);   // emoji-style white face

    drawEyes(fr.leftEye, fr.rightEye);
    drawMouth(fr.mouth);
    if (fr.cheeks) drawCheeks();
    if (fr.brows)  drawBrows();

    drawDecoration();   // animated overlays per emotion
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
    _decorStep   = 0;
    _lastFrameMs = millis();
    _lastDecorMs = millis();
    drawFrame();
}

void redrawCurrentFace() {
    drawFrame();
}

void advanceFaceFrame() {
    if (isSpeaking) return;
    const FaceDef& def  = FACE_TABLE[(int)_face];
    unsigned long  now  = millis();
    bool needDraw       = false;

    // Advance face keyframe
    if (def.numFrames > 1 && now - _lastFrameMs >= def.frameMs) {
        _lastFrameMs = now;
        _frame       = (_frame + 1) % def.numFrames;
        needDraw     = true;
    }

    // Advance decoration step independently
    if (now - _lastDecorMs >= DECOR_MS) {
        _lastDecorMs = now;
        _decorStep++;
        needDraw = true;
    }

    if (needDraw) drawFrame();
}
