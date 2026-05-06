#include "display.h"
#include "sensors.h"
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

bool oledOk = false;
static Adafruit_SSD1306 disp(SCREEN_W, SCREEN_H, &Wire, -1);

// ── Setup ─────────────────────────────────────────────────────
void displaySetup() {
    if (!disp.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
        Serial.println("[OLED] Init failed");
        oledOk = false;
        return;
    }
    oledOk = true;
    disp.setTextColor(SSD1306_WHITE);
    disp.cp437(true);
    oledDrawStartup();
    Serial.println("[OLED] OK");
}

// ── Startup splash ────────────────────────────────────────────
void oledDrawStartup() {
    if (!oledOk) return;
    disp.clearDisplay();
    disp.setTextSize(2);
    disp.setCursor(16, 12);
    disp.print("EDUBOT");
    disp.setTextSize(1);
    disp.setCursor(20, 40);
    disp.print("Initializing...");
    disp.display();
}

// ── Simple two-line message ───────────────────────────────────
void oledMsg(const char* line1, const char* line2) {
    if (!oledOk) return;
    disp.clearDisplay();
    disp.setTextSize(1);
    disp.setCursor(0, 18); disp.println(line1);
    if (line2 && strlen(line2) > 0) { disp.setCursor(0, 34); disp.println(line2); }
    disp.display();
}

// ── WiFi status screen ───────────────────────────────────────
void oledDrawWifiStatus(bool connected, const String& ip) {
    if (!oledOk) return;
    disp.clearDisplay();
    disp.setTextSize(1);
    disp.setCursor(0, 0);
    disp.println("=== EDUBOT ===");
    if (connected) {
        disp.println("WiFi: Connected");
        disp.print("IP: "); disp.println(ip);
    } else {
        disp.println("WiFi: Offline");
        disp.println("Reconnecting...");
    }
    disp.display();
}

// ── Sensor data page ─────────────────────────────────────────
// Shows temperature + humidity with bar, plus BPM if available
void oledDrawSensors(float temp, float hum, float bpm, float spo2) {
    if (!oledOk) return;
    disp.clearDisplay();
    disp.setTextSize(1);
    disp.setCursor(0, 0);
    disp.println("-- Environment --");

    // Temperature row
    char buf[20];
    snprintf(buf, sizeof(buf), "Temp: %.1f C", temp);
    disp.setCursor(0, 12); disp.print(buf);

    // Humidity bar (0-100% → 0-100px)
    disp.setCursor(0, 24); disp.print("Hum:");
    int humBar = (int)(hum);
    if (humBar < 0) humBar = 0;
    if (humBar > 100) humBar = 100;
    disp.drawRect(30, 24, 82, 8, SSD1306_WHITE);
    disp.fillRect(30, 24, humBar * 82 / 100, 8, SSD1306_WHITE);
    snprintf(buf, sizeof(buf), " %.0f%%", hum);
    disp.setCursor(114, 24); disp.print(buf[1] == '1' ? "100" : buf + 1);

    // Separator
    disp.drawLine(0, 36, 127, 36, SSD1306_WHITE);

    // Heart rate row
    disp.setCursor(0, 40); disp.print("Heart:");
    if (bpm > 20.0f) {
        disp.setTextSize(2);
        snprintf(buf, sizeof(buf), "%.0f", bpm);
        disp.setCursor(40, 38); disp.print(buf);
        disp.setTextSize(1);
        disp.setCursor(90, 44); disp.print("bpm");
        snprintf(buf, sizeof(buf), "SpO2:%.0f%%", spo2);
        disp.setCursor(40, 56); disp.print(buf);
    } else {
        disp.setCursor(40, 40); disp.print("Place finger");
    }
    disp.display();
}

// ── Heart visualisation modes ─────────────────────────────────
void oledDrawHeart(const String& mode) {
    if (!oledOk) return;
    disp.clearDisplay();
    disp.setTextSize(1);
    int bpm = 0; // heartRate is in sensors.h; include it where needed
    bpm = (int)heartRate;

    if (mode == "beating_heart") {
        disp.setTextSize(3);
        disp.setCursor(20, 8);
        disp.print("<3");
        disp.setTextSize(1);
        disp.setCursor(30, 50);
        if (bpm > 0) { char b[16]; snprintf(b, sizeof(b), "%d bpm", bpm); disp.print(b); }
        else disp.print("waiting...");

    } else if (mode == "bar_graph") {
        disp.setCursor(16, 0); disp.print("Heart Rate");
        int bars = bpm > 0 ? (bpm / 25 < 5 ? bpm / 25 : 5) : 0;
        for (int b = 0; b < 5; b++) {
            int x = 8 + b * 24;
            int h = 12 + b * 6;
            if (b < bars) disp.fillRect(x, 48 - h, 16, h, SSD1306_WHITE);
            else          disp.drawRect(x, 48 - h, 16, h, SSD1306_WHITE);
        }
        if (bpm > 0) { char buf[12]; snprintf(buf, sizeof(buf), "%d bpm", bpm);
            disp.setCursor(36, 56); disp.print(buf); }

    } else if (mode == "game_meter") {
        disp.println("-- Power Meter --");
        int fill = bpm > 0 ? ((bpm - 40) * 120 / 140) : 0;
        if (fill < 0) fill = 0; if (fill > 120) fill = 120;
        disp.drawRect(4, 28, 120, 16, SSD1306_WHITE);
        if (fill > 0) disp.fillRect(4, 28, fill, 16, SSD1306_WHITE);
        if (bpm > 0) { char buf[16]; snprintf(buf, sizeof(buf), "BPM: %d", bpm);
            disp.setCursor(36, 52); disp.print(buf); }

    } else if (mode == "power_level") {
        disp.println("-- BPM --");
        disp.setTextSize(3);
        disp.setCursor(8, 22);
        if (bpm > 0) { char buf[8]; snprintf(buf, sizeof(buf), "%d", bpm); disp.print(buf); }
        else disp.print("---");
        disp.setTextSize(1);
        disp.setCursor(90, 34); disp.print("bpm");

    } else {
        disp.setCursor(0, 24); disp.print("Mode: "); disp.println(mode);
    }
    disp.display();
}

// ── Face expression renderer ─────────────────────────────────
static String faceEmotion(const String& id) {
    int u = id.indexOf('_');
    if (u > 0) {
        String pre = id.substring(0, u);
        if (pre == "happy" || pre == "excited" || pre == "laughing") return pre;
        if (pre == "sad")       return "sad";
        if (pre == "sleeping" || pre == "tired") return "sleeping";
        if (pre == "angry")     return "angry";
        if (pre == "confused")  return "confused";
        if (pre == "surprised") return "surprised";
        if (pre == "winking")   return "winking";
        if (pre == "cool")      return "cool";
        if (pre == "love")      return "love";
        if (pre == "nervous")   return "nervous";
        if (pre == "thinking")  return "thinking";
        if (pre == "silly" || pre == "party") return "silly";
        if (pre == "robot")     return "robot";
    }
    if (id=="cheerful"||id=="grin"||id=="beaming"||id=="joyful"||id=="content") return "happy";
    if (id=="crying"||id=="tearful"||id=="disappointed"||id=="heartbroken")     return "sad";
    if (id=="thrilled"||id=="ecstatic"||id=="pumped"||id=="hyped")             return "excited";
    if (id=="yawning"||id=="drowsy"||id=="dozing"||id=="snoozing")             return "sleeping";
    if (id=="furious"||id=="annoyed"||id=="grumpy"||id=="mad")                 return "angry";
    if (id=="puzzled"||id=="lost"||id=="baffled"||id=="dizzy")                 return "confused";
    if (id=="shocked"||id=="amazed"||id=="astonished"||id=="wide_eyed")        return "surprised";
    if (id=="sly"||id=="cheeky"||id=="flirty"||id=="playful")                  return "winking";
    if (id=="suave"||id=="chill"||id=="swag")                                  return "cool";
    if (id=="adoring"||id=="smitten"||id=="heart_eyes")                        return "love";
    if (id=="anxious"||id=="worried"||id=="sweating")                          return "nervous";
    if (id=="pondering"||id=="contemplating"||id=="calculating")               return "thinking";
    if (id=="giggling"||id=="chuckling"||id=="rofl")                           return "laughing";
    if (id=="sick"||id=="eww"||id=="hungry"||id=="silly")                      return "silly";
    if (id=="scanning"||id=="charging"||id=="power_up")                        return "robot";
    return "neutral";
}

void oledDrawFace(const String& faceId, bool blinkFrame) {
    if (!oledOk) return;
    String em = faceEmotion(faceId);

    disp.clearDisplay();
    disp.drawRoundRect(24, 4, 80, 56, 28, SSD1306_WHITE);

    const int eyeY   = 22;
    const int mouthY = 42;

    // ── Eyes ─────────────────────────────────────────────────
    if (blinkFrame) {
        disp.drawLine(40, eyeY, 52, eyeY, SSD1306_WHITE);
        disp.drawLine(76, eyeY, 88, eyeY, SSD1306_WHITE);

    } else if (em == "happy" || em == "excited" || em == "laughing") {
        disp.drawCircle(46, eyeY+4, 7, SSD1306_WHITE);
        disp.fillRect(39, eyeY+4, 15, 8, SSD1306_BLACK);
        disp.drawCircle(82, eyeY+4, 7, SSD1306_WHITE);
        disp.fillRect(75, eyeY+4, 15, 8, SSD1306_BLACK);

    } else if (em == "sad" || em == "nervous") {
        disp.drawCircle(46, eyeY-2, 7, SSD1306_WHITE);
        disp.fillRect(39, eyeY-9, 15, 8, SSD1306_BLACK);
        disp.drawCircle(82, eyeY-2, 7, SSD1306_WHITE);
        disp.fillRect(75, eyeY-9, 15, 8, SSD1306_BLACK);

    } else if (em == "surprised") {
        disp.drawCircle(46, eyeY, 9, SSD1306_WHITE);
        disp.drawCircle(82, eyeY, 9, SSD1306_WHITE);
        disp.fillCircle(46, eyeY, 4, SSD1306_WHITE);
        disp.fillCircle(82, eyeY, 4, SSD1306_WHITE);

    } else if (em == "sleeping") {
        disp.drawLine(40, eyeY, 52, eyeY, SSD1306_WHITE);
        disp.drawLine(76, eyeY, 88, eyeY, SSD1306_WHITE);
        disp.setTextSize(1); disp.setCursor(91, 8); disp.print("z");
        disp.setCursor(96, 4); disp.print("Z");

    } else if (em == "angry") {
        disp.drawCircle(46, eyeY, 7, SSD1306_WHITE);
        disp.drawCircle(82, eyeY, 7, SSD1306_WHITE);
        disp.drawLine(38, eyeY-9, 54, eyeY-5, SSD1306_WHITE);
        disp.drawLine(74, eyeY-5, 90, eyeY-9, SSD1306_WHITE);

    } else if (em == "winking") {
        disp.drawCircle(46, eyeY, 7, SSD1306_WHITE);
        disp.fillCircle(46, eyeY, 3, SSD1306_WHITE);
        disp.drawLine(76, eyeY, 88, eyeY, SSD1306_WHITE);

    } else if (em == "cool") {
        disp.fillRect(37, eyeY-5, 18, 10, SSD1306_WHITE);
        disp.fillRect(73, eyeY-5, 18, 10, SSD1306_WHITE);
        disp.drawLine(55, eyeY, 73, eyeY, SSD1306_WHITE);

    } else if (em == "love") {
        disp.fillCircle(43, eyeY-2, 4, SSD1306_WHITE);
        disp.fillCircle(49, eyeY-2, 4, SSD1306_WHITE);
        disp.fillTriangle(39, eyeY+1, 53, eyeY+1, 46, eyeY+8, SSD1306_WHITE);
        disp.fillCircle(79, eyeY-2, 4, SSD1306_WHITE);
        disp.fillCircle(85, eyeY-2, 4, SSD1306_WHITE);
        disp.fillTriangle(75, eyeY+1, 89, eyeY+1, 82, eyeY+8, SSD1306_WHITE);

    } else if (em == "confused") {
        disp.drawLine(39, eyeY, 53, eyeY, SSD1306_WHITE);
        disp.drawCircle(82, eyeY, 9, SSD1306_WHITE);
        disp.fillCircle(82, eyeY, 4, SSD1306_WHITE);

    } else if (em == "thinking") {
        disp.drawLine(40, eyeY, 52, eyeY, SSD1306_WHITE);
        disp.drawCircle(82, eyeY, 7, SSD1306_WHITE);
        disp.fillCircle(82, eyeY, 3, SSD1306_WHITE);

    } else if (em == "silly") {
        disp.drawLine(40, eyeY-5, 52, eyeY+5, SSD1306_WHITE);
        disp.drawLine(52, eyeY-5, 40, eyeY+5, SSD1306_WHITE);
        disp.drawLine(76, eyeY-5, 88, eyeY+5, SSD1306_WHITE);
        disp.drawLine(88, eyeY-5, 76, eyeY+5, SSD1306_WHITE);

    } else if (em == "robot") {
        disp.drawRect(37, eyeY-5, 18, 10, SSD1306_WHITE);
        disp.fillRect(39, eyeY-3,  5,  6, SSD1306_WHITE);
        disp.drawRect(73, eyeY-5, 18, 10, SSD1306_WHITE);
        disp.fillRect(75, eyeY-3,  5,  6, SSD1306_WHITE);

    } else {
        disp.drawCircle(46, eyeY, 7, SSD1306_WHITE);
        disp.drawCircle(82, eyeY, 7, SSD1306_WHITE);
        disp.fillCircle(46, eyeY, 3, SSD1306_WHITE);
        disp.fillCircle(82, eyeY, 3, SSD1306_WHITE);
    }

    // ── Mouth ────────────────────────────────────────────────
    if (em == "happy" || em == "love" || em == "winking" || em == "cool") {
        disp.drawCircle(64, mouthY-6, 12, SSD1306_WHITE);
        disp.fillRect(52, mouthY-18, 24, 12, SSD1306_BLACK);

    } else if (em == "excited" || em == "laughing") {
        disp.fillRoundRect(50, mouthY-2, 28, 14, 5, SSD1306_WHITE);
        disp.fillRect(50, mouthY-2, 28, 6, SSD1306_BLACK);

    } else if (em == "sad") {
        disp.drawCircle(64, mouthY+6, 12, SSD1306_WHITE);
        disp.fillRect(52, mouthY+6, 24, 12, SSD1306_BLACK);

    } else if (em == "nervous" || em == "confused") {
        disp.drawLine(50, mouthY+2, 57, mouthY-2, SSD1306_WHITE);
        disp.drawLine(57, mouthY-2, 64, mouthY+2, SSD1306_WHITE);
        disp.drawLine(64, mouthY+2, 71, mouthY-2, SSD1306_WHITE);
        disp.drawLine(71, mouthY-2, 78, mouthY+2, SSD1306_WHITE);

    } else if (em == "surprised") {
        disp.drawCircle(64, mouthY, 8, SSD1306_WHITE);

    } else if (em == "angry") {
        disp.drawLine(50, mouthY, 78, mouthY, SSD1306_WHITE);

    } else if (em == "sleeping") {
        disp.drawRoundRect(54, mouthY-3, 20, 10, 4, SSD1306_WHITE);

    } else if (em == "thinking") {
        disp.drawLine(56, mouthY+1, 72, mouthY-1, SSD1306_WHITE);

    } else if (em == "silly") {
        disp.drawRoundRect(50, mouthY-4, 28, 12, 4, SSD1306_WHITE);
        disp.fillRoundRect(58, mouthY+2, 12, 8, 4, SSD1306_WHITE);

    } else if (em == "robot") {
        disp.drawLine(46, mouthY, 82, mouthY, SSD1306_WHITE);
        for (int x = 52; x <= 76; x += 6)
            disp.drawLine(x, mouthY, x, mouthY+4, SSD1306_WHITE);

    } else {
        disp.drawLine(52, mouthY, 76, mouthY, SSD1306_WHITE);
    }

    disp.display();
}
