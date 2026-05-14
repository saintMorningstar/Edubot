#include "mouth_engine.h"
#include "oled.h"
#include "expressions.h"
#include "../system/config.h"

// ── Layout: matches face circle r=30 at (64,32) ───────────────────────────────
// Mouth center y derived from app: face*0.42 below face-top = ~30 → y=33
#define MCX    64
#define MMY    33
#define MHALF  13
#define MAMP    5

#define FG  SSD1306_BLACK
#define HL  SSD1306_WHITE

static bool          talkingActive   = false;
static int           talkFrame       = 0;
static unsigned long lastMouthUpdate = 0;
#define MOUTH_FRAME_MS 120

void initMouthEngine() {
    talkingActive = false;
    talkFrame     = 0;
}

void drawMouth(MouthType type) {
    switch (type) {

        case MOUTH_SMILE:
            for (int x = MCX - MHALF; x <= MCX + MHALF; x++) {
                float t = (float)(x - MCX) / MHALF;
                int y = MMY + (int)(MAMP * (1.0f - t*t));
                display.drawPixel(x, y,   FG);
                display.drawPixel(x, y+1, FG);
            }
            break;

        case MOUTH_BIG_SMILE:
            for (int x = MCX - MHALF; x <= MCX + MHALF; x++) {
                float t  = (float)(x - MCX) / MHALF;
                int arcY = MMY + (int)(MAMP * (1.0f - t*t));
                for (int y = arcY; y <= MMY + MAMP + 4; y++)
                    display.drawPixel(x, y, FG);
            }
            break;

        case MOUTH_FROWN:
            for (int x = MCX - MHALF; x <= MCX + MHALF; x++) {
                float t = (float)(x - MCX) / MHALF;
                int y = MMY - (int)(MAMP * (1.0f - t*t));
                display.drawPixel(x, y,   FG);
                display.drawPixel(x, y+1, FG);
            }
            break;

        case MOUTH_BIG_FROWN:
            for (int x = MCX - MHALF; x <= MCX + MHALF; x++) {
                float t  = (float)(x - MCX) / MHALF;
                int arcY = MMY - (int)(MAMP * (1.0f - t*t));
                for (int y = MMY - MAMP - 4; y <= arcY; y++)
                    display.drawPixel(x, y, FG);
            }
            break;

        case MOUTH_FLAT:
            display.drawFastHLine(MCX - MHALF + 4, MMY,   MHALF*2 - 8, FG);
            display.drawFastHLine(MCX - MHALF + 4, MMY+1, MHALF*2 - 8, FG);
            break;

        case MOUTH_OPEN:
            display.fillRoundRect(MCX-10, MMY-4, 20, 12, 5, FG);
            display.fillRoundRect(MCX-8,  MMY-2, 16,  8, 3, HL);
            break;

        case MOUTH_O_SHAPE:
            display.fillCircle(MCX, MMY+2, 7, FG);
            display.fillCircle(MCX, MMY+2, 4, HL);
            break;

        case MOUTH_TEETH:
            for (int x = MCX - MHALF; x <= MCX + MHALF; x++) {
                float t  = (float)(x - MCX) / MHALF;
                int arcY = MMY + (int)(MAMP * (1.0f - t*t));
                for (int y = arcY; y <= MMY + MAMP + 4; y++)
                    display.drawPixel(x, y, FG);
            }
            display.drawFastHLine(MCX - MHALF + 2, MMY + MAMP - 1, MHALF*2 - 4, HL);
            break;

        case MOUTH_TONGUE:
            for (int x = MCX - MHALF; x <= MCX + MHALF; x++) {
                float t  = (float)(x - MCX) / MHALF;
                int arcY = MMY + (int)(MAMP * (1.0f - t*t));
                for (int y = arcY; y <= MMY + MAMP + 4; y++)
                    display.drawPixel(x, y, FG);
            }
            display.fillCircle(MCX, MMY + MAMP + 2, 4, HL);
            display.drawCircle(MCX, MMY + MAMP + 2, 4, FG);
            break;

        case MOUTH_KISS: {
            int bx = MCX - 3, by = MMY - 1;
            display.fillRect(bx+1, by,   2, 1, FG);
            display.fillRect(bx+4, by,   2, 1, FG);
            display.fillRect(bx,   by+1, 7, 3, FG);
            display.fillRect(bx+1, by+4, 5, 1, FG);
            display.fillRect(bx+2, by+5, 3, 1, FG);
            display.fillRect(bx+3, by+6, 1, 1, FG);
            break;
        }

        case MOUTH_WAVY: {
            int y  = MMY;
            bool up = true;
            for (int x = MCX - MHALF; x < MCX + MHALF; x += 5) {
                int nx = min(x + 4, MCX + MHALF);
                int ny = up ? y - 4 : y + 4;
                display.drawLine(x, y, nx, ny, FG);
                y  = ny;
                up = !up;
            }
            break;
        }
    }
}

void startTalkingAnimation() {
    talkingActive = true;
    talkFrame     = 0;
    isSpeaking    = true;
}

void stopTalkingAnimation() {
    talkingActive = false;
    isSpeaking    = false;
    showExpression(getCurrentExpression());
}

void updateMouthAnimation() {
    if (!talkingActive) return;
    if (millis() - lastMouthUpdate < MOUTH_FRAME_MS) return;
    lastMouthUpdate = millis();

    // erase mouth area back to white before redrawing
    display.fillRect(MCX-14, MMY-6, 28, 20, HL);

    if (talkFrame % 2 == 0) {
        display.fillRoundRect(MCX-12, MMY-3, 24, 10, 4, FG);
        display.fillRoundRect(MCX-10, MMY-1, 20,  6, 3, HL);
    } else {
        display.drawFastHLine(MCX-10, MMY+2, 20, FG);
        display.drawFastHLine(MCX-10, MMY+3, 20, FG);
    }
    display.display();
    talkFrame++;
}
