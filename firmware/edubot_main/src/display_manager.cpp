#include "display_manager.h"
#include "config.h"
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

static Adafruit_SSD1306 oled(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
static bool oledOk = false;

void displaySetup() {
    Wire.begin(OLED_SDA, OLED_SCL);
    oledOk = oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
    if (!oledOk) { Serial.println("[OLED] Not found"); return; }
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.setTextSize(1);
    oled.display();
}

void displayClear() {
    if (!oledOk) return;
    oled.clearDisplay();
    oled.display();
}

void displayShowBoot(const char* msg) {
    if (!oledOk) return;
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setCursor(24, 0); oled.println("== EDUBOT ==");
    oled.setCursor(0, 14); oled.println(msg);
    oled.display();
}

void displayShowIP(const char* ip, bool pairedAvailable) {
    if (!oledOk) return;
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setCursor(24, 0);  oled.println("== EDUBOT ==");
    oled.setCursor(0, 14);  oled.print("IP: "); oled.println(ip);
    oled.setCursor(0, 26);  oled.print("WS :81  ");
    oled.println(pairedAvailable ? "Paired" : "Standalone");
    oled.display();
}

void displayShowState(const char* mode, const char* stateLine) {
    if (!oledOk) return;
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setCursor(24, 0);  oled.println("== EDUBOT ==");
    oled.setCursor(0, 14);  oled.print("Mode: "); oled.println(mode);
    oled.setTextSize(2);
    oled.setCursor(0, 30);  oled.println(stateLine);
    oled.display();
}

void displayShowError(const char* msg) {
    if (!oledOk) return;
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setCursor(28, 0); oled.println("!! ERROR !!");
    oled.setCursor(0, 16); oled.println(msg);
    oled.display();
}

// ─── Sleeping cat animation ───────────────────────────────────────────────────
// pixel-art cat face: open eyes → closed eyes → floating zzz → blank

static void drawCatFrame(bool eyesClosed, uint8_t zStep) {
    oled.clearDisplay();

    // Head
    const int cx = 64, cy = 34;
    oled.drawRoundRect(cx - 20, cy - 16, 40, 30, 7, SSD1306_WHITE);

    // Ears
    oled.fillTriangle(cx - 18, cy - 16, cx - 10, cy - 16, cx - 14, cy - 25, SSD1306_WHITE);
    oled.fillTriangle(cx + 10, cy - 16, cx + 18, cy - 16, cx + 14, cy - 25, SSD1306_WHITE);

    // Eyes
    if (eyesClosed) {
        oled.drawLine(cx - 10, cy - 6, cx - 6, cy - 4, SSD1306_WHITE);
        oled.drawLine(cx +  6, cy - 6, cx + 10, cy - 4, SSD1306_WHITE);
    } else {
        oled.fillCircle(cx - 8, cy - 6, 3, SSD1306_WHITE);
        oled.fillCircle(cx + 8, cy - 6, 3, SSD1306_WHITE);
    }

    // Nose
    oled.fillTriangle(cx - 2, cy + 1, cx + 2, cy + 1, cx, cy + 4, SSD1306_WHITE);

    // Whiskers
    oled.drawLine(cx - 14, cy,     cx - 5, cy + 1, SSD1306_WHITE);
    oled.drawLine(cx - 14, cy + 4, cx - 5, cy + 3, SSD1306_WHITE);
    oled.drawLine(cx +  5, cy + 1, cx + 14, cy,    SSD1306_WHITE);
    oled.drawLine(cx +  5, cy + 3, cx + 14, cy + 4, SSD1306_WHITE);

    // Floating Z's (3 characters at staggered vertical offsets)
    oled.setTextSize(1);
    int base = 18;
    int z1y  = base - (zStep % 18);
    int z2y  = base - ((zStep + 6) % 18) - 8;
    int z3y  = base - ((zStep + 12) % 18) - 16;
    if (z1y > 0 && z1y < OLED_HEIGHT) { oled.setCursor(cx + 22, z1y); oled.print("z"); }
    if (z2y > 0 && z2y < OLED_HEIGHT) { oled.setCursor(cx + 29, z2y); oled.print("Z"); }
    if (z3y > 0 && z3y < OLED_HEIGHT) { oled.setCursor(cx + 36, z3y); oled.print("Z"); }

    oled.display();
}

void displaySleepAnimation() {
    if (!oledOk) return;
    unsigned long start = millis();
    uint8_t tick = 0;

    while (millis() - start < 3000) {
        unsigned long elapsed = millis() - start;
        bool eyesClosed = elapsed > 900;   // eyes close after 0.9 s
        tick = (millis() - start) / 120;   // advances every 120 ms
        drawCatFrame(eyesClosed, tick % 18);
        delay(50);
    }

    oled.clearDisplay();
    oled.display();
}
