#include "eye_engine.h"
#include "oled.h"
#include "expressions.h"

// ── Layout: scaled from app proportions for a 60px face circle ───────────────
// Face circle: center (64,32), radius 30
// eyeSz = face*0.16 = ~10,  eyeGap = face*0.20 = 12
// Eyes y: circle_top(2) + face*0.23(14) + eyeH/2(4) = 20
#define LE_X  53
#define RE_X  75
#define EY    20
#define EW    10
#define EH     8

// Features drawn BLACK on white face circle
#define FG  SSD1306_BLACK
#define HL  SSD1306_WHITE

static int8_t _ox = 0;

void initEyeEngine() { _ox = 0; }
void lookLeft()       { _ox = -2; }
void lookRight()      { _ox =  2; }
void lookCenter()     { _ox =  0; }

static void drawEye(EyeType type, int cx, int cy) {
    switch (type) {

        case EYE_OPEN:
            display.fillRoundRect(cx - EW/2, cy - EH/2, EW, EH, 3, FG);
            display.fillCircle(cx + _ox - 1, cy - 1, 1, HL);
            break;

        case EYE_CLOSED:
            display.drawFastHLine(cx - EW/2, cy,   EW, FG);
            display.drawFastHLine(cx - EW/2, cy+1, EW, FG);
            break;

        case EYE_WIDE:
            display.fillCircle(cx, cy, EH/2 + 2, FG);
            display.fillCircle(cx + _ox - 2, cy - 2, 1, HL);
            break;

        case EYE_DOT:
            display.fillCircle(cx, cy, 3, FG);
            break;

        case EYE_HALF:
            display.fillRoundRect(cx - EW/2, cy - EH/2, EW, EH/2 + 1, 2, FG);
            break;

        case EYE_SQUINT:
            display.fillRoundRect(cx - EW/2, cy - 3, EW, 6, 2, FG);
            break;

        case EYE_WINK:
            display.drawLine(cx - EW/2, cy+1, cx + EW/2, cy-1, FG);
            display.drawLine(cx - EW/2, cy+2, cx + EW/2, cy,   FG);
            break;

        case EYE_X:
            display.drawLine(cx-4, cy-4, cx+4, cy+4, FG);
            display.drawLine(cx-4, cy-3, cx+4, cy+5, FG);
            display.drawLine(cx+4, cy-4, cx-4, cy+4, FG);
            display.drawLine(cx+4, cy-3, cx-4, cy+5, FG);
            break;

        case EYE_SPIRAL:
            display.drawCircle(cx, cy, 5, FG);
            display.drawCircle(cx, cy, 3, FG);
            display.fillCircle(cx, cy, 1, FG);
            break;

        case EYE_HEART: {
            // 7×6 pixel heart in FG
            int bx = cx - 3, by = cy - 3;
            display.fillRect(bx+1, by,   2, 1, FG);
            display.fillRect(bx+4, by,   2, 1, FG);
            display.fillRect(bx,   by+1, 7, 3, FG);
            display.fillRect(bx+1, by+4, 5, 1, FG);
            display.fillRect(bx+2, by+5, 3, 1, FG);
            display.fillRect(bx+3, by+6, 1, 1, FG);
            break;
        }

        case EYE_STAR:
            display.fillCircle(cx, cy, 2, FG);
            display.drawFastVLine(cx,   cy-5, 3, FG);
            display.drawFastVLine(cx,   cy+3, 3, FG);
            display.drawFastHLine(cx-5, cy,   3, FG);
            display.drawFastHLine(cx+3, cy,   3, FG);
            break;
    }
}

void drawEyes(EyeType left, EyeType right) {
    drawEye(left,  LE_X, EY);
    drawEye(right, RE_X, EY);
}

void drawBrows() {
    // Angled brows slanting toward center — drawn in FG above eyes
    display.drawLine(LE_X-6, EY-EH/2-5, LE_X+6, EY-EH/2-1, FG);
    display.drawLine(LE_X-6, EY-EH/2-4, LE_X+6, EY-EH/2,   FG);
    display.drawLine(RE_X-6, EY-EH/2-1, RE_X+6, EY-EH/2-5, FG);
    display.drawLine(RE_X-6, EY-EH/2,   RE_X+6, EY-EH/2-4, FG);
}

void drawCheeks() {
    // Small rosy cheek ovals on the face sides
    // app: left={left:face*0.07, top:face*0.47}, w=face*0.18, h=face*0.12
    // For face r=30 circle at (64,32): cheeks at ~(43,34) and (85,34)
    display.drawCircle(43, 34, 4, FG);
    display.drawCircle(85, 34, 4, FG);
}

void blinkEyes() {
    display.clearDisplay();
    display.fillCircle(64, 32, 30, SSD1306_WHITE);
    display.drawFastHLine(LE_X-EW/2, EY,   EW, FG);
    display.drawFastHLine(LE_X-EW/2, EY+1, EW, FG);
    display.drawFastHLine(RE_X-EW/2, EY,   EW, FG);
    display.drawFastHLine(RE_X-EW/2, EY+1, EW, FG);
    display.display();
    delay(80);
    redrawCurrentFace();
}
