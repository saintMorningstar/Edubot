#include "sensors.h"
#include <DHT.h>
#include <MAX30100_PulseOximeter.h>

// ── Globals ───────────────────────────────────────────────────
float temperature = 0.0f;
float humidity    = 0.0f;
float heartRate   = 0.0f;
float spO2        = 0.0f;
bool  poxOk       = false;

volatile uint8_t tapCount = 0;
volatile bool    tapReady = false;

// ── Internals ─────────────────────────────────────────────────
static DHT           dht(PIN_DHT11, DHT11);
static PulseOximeter pox;

static unsigned long lastDHTMs     = 0;
static unsigned long lastBeatMs    = 0;   // stale-reading watchdog
static unsigned long touchLastMs   = 0;
static unsigned long tapWindowMs   = 0;   // when current tap sequence started
static bool          lastTouched   = false;
static bool          inTapSeq      = false;

#define DHT_INTERVAL_MS    2000
#define TOUCH_DEBOUNCE_MS    50
#define TAP_WINDOW_MS       700   // gap after last tap → sequence complete
#define BEAT_STALE_MS      8000   // reset bpm if no beat in this window

// ── Beat callback ─────────────────────────────────────────────
static void onBeatDetected() {
    heartRate  = pox.getHeartRate();
    spO2       = pox.getSpO2();
    lastBeatMs = millis();
    Serial.printf("[HR] Beat  BPM:%.0f  SpO2:%.0f%%\n", heartRate, spO2);
}

// ── Setup ─────────────────────────────────────────────────────
void sensorsSetup() {
    // DHT11
    dht.begin();
    delay(1500);   // allow first reading to stabilise
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) temperature = t;
    if (!isnan(h)) humidity    = h;
    Serial.printf("[DHT11] Init  T:%.1f°C  H:%.1f%%\n", temperature, humidity);

    // Touch sensor (TTP223 module or GPIO capacitive)
    pinMode(PIN_TOUCH, INPUT);
    Serial.printf("[Touch] Pin GPIO %d ready\n", PIN_TOUCH);

#if USE_ANALOG_HR
    // Simple analog pulse sensor — no init needed
    Serial.printf("[HR] Analog mode on GPIO %d\n", PIN_HR_ANALOG);
    poxOk = false;
#else
    // MAX30100 on I2C
    if (pox.begin()) {
        poxOk = true;
    } else {
        delay(400);
        poxOk = pox.begin();
    }
    if (poxOk) {
        pox.setIRLedCurrent(MAX30100_LED_CURR_27_1MA);
        pox.setOnBeatDetectedCallback(onBeatDetected);
        lastBeatMs = millis();
        Serial.println("[HR] MAX30100 OK");
    } else {
        Serial.println("[HR] MAX30100 not found — check SDA/SCL on GPIO 21/22");
    }
#endif
}

// ── Non-blocking DHT read ─────────────────────────────────────
void updateDHT() {
    unsigned long now = millis();
    if (now - lastDHTMs < DHT_INTERVAL_MS) return;
    lastDHTMs = now;

    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (isnan(t) || isnan(h)) {
        Serial.println("[DHT11] Read failed");
        return;
    }
    temperature = t;
    humidity    = h;
    Serial.printf("[DHT11] T:%.1f°C  H:%.1f%%\n", temperature, humidity);
}

// ── Heart rate update ─────────────────────────────────────────
void updateHeartRate() {
#if USE_ANALOG_HR
    // Basic AC-coupled pulse detection on analog pin
    static int samples[8] = {};
    static uint8_t si = 0;
    static unsigned long lastSampleMs = 0;
    static int baseline = 2048;

    unsigned long now = millis();
    if (now - lastSampleMs < 20) return;   // 50 Hz sample rate
    lastSampleMs = now;

    int raw = analogRead(PIN_HR_ANALOG);
    baseline = baseline * 0.99 + raw * 0.01;  // slow DC baseline
    int ac  = raw - baseline;
    samples[si++ & 7] = ac;

    // Detect positive zero-crossing as a beat proxy
    static bool aboveZero = false;
    static unsigned long lastCrossMs = 0;
    bool nowAbove = (ac > 30);
    if (nowAbove && !aboveZero) {
        unsigned long period = now - lastCrossMs;
        if (period > 300 && period < 2000) {   // 30-200 BPM range
            heartRate  = 60000.0f / (float)period;
            lastBeatMs = now;
        }
        lastCrossMs = now;
    }
    aboveZero = nowAbove;

    // Stale watchdog
    if (millis() - lastBeatMs > BEAT_STALE_MS) heartRate = 0.0f;

#else
    if (!poxOk) return;
    pox.update();   // MUST be called very frequently

    // Stale watchdog — if no beat detected recently, finger is gone
    if (heartRate > 0 && millis() - lastBeatMs > BEAT_STALE_MS) {
        heartRate = 0.0f;
        spO2      = 0.0f;
        Serial.println("[HR] No signal — waiting for finger");
    }
#endif
}

// ── Touch / tap counting ──────────────────────────────────────
void updateTouch() {
    unsigned long now = millis();
    bool touched = (digitalRead(PIN_TOUCH) == HIGH);  // TTP223: HIGH = touched

    // Debounce
    if (touched != lastTouched) {
        if (now - touchLastMs < TOUCH_DEBOUNCE_MS) return;
        touchLastMs = now;
        lastTouched = touched;

        if (touched) {
            // Start or extend a tap sequence
            if (!inTapSeq) {
                tapCount  = 0;
                inTapSeq  = true;
                tapReady  = false;
            }
            tapCount++;
            tapWindowMs = now;
            Serial.printf("[Touch] Tap #%d\n", tapCount);
        }
    }

    // Sequence complete if TAP_WINDOW_MS passes with no new tap
    if (inTapSeq && !touched && (now - tapWindowMs > TAP_WINDOW_MS)) {
        inTapSeq = false;
        tapReady = true;
        Serial.printf("[Touch] Sequence done: %d tap(s)\n", tapCount);
    }
}
