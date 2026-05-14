/*
 ================================================================
                     CAR FIRMWARE
 ================================================================
 ESP32  (standard DevKit, not S3)
 2-Wheel Robot Car — BLE controlled via Edubot App Sports Mode

 BLE device name : EdubotCar
 Service UUID    : c7a6e100-f000-4d00-b000-000000000001
 CMD char UUID   : c7a6e100-f000-4d00-b000-000000000002

 Commands received (plain ASCII, write-without-response):
   CAR_FORWARD:30   CAR_FORWARD:65   CAR_FORWARD:100
   CAR_BACKWARD:30  CAR_BACKWARD:65  CAR_BACKWARD:100
   CAR_LEFT:30      CAR_LEFT:65      CAR_LEFT:100
   CAR_RIGHT:30     CAR_RIGHT:65     CAR_RIGHT:100
   CAR_STOP

 Speed value is a percentage (0-100).
 It is converted to an 8-bit PWM value (0-255) internally.

 Motor driver : L298N
 ================================================================
*/

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ─── L298N Pin Assignments ────────────────────────────────────────────────────
// Change these to match your wiring.

#define LEFT_IN1   26   // Left motor direction A
#define LEFT_IN2   27   // Left motor direction B
#define LEFT_ENA   14   // Left motor PWM enable (ENA)

#define RIGHT_IN3  25   // Right motor direction A
#define RIGHT_IN4  33   // Right motor direction B
#define RIGHT_ENB  32   // Right motor PWM enable (ENB)

// ─── LEDC PWM Config ─────────────────────────────────────────────────────────
#define LEDC_CH_LEFT    0
#define LEDC_CH_RIGHT   1
#define LEDC_FREQ       1000    // Hz
#define LEDC_RESOLUTION 8       // bits → 0-255

// ─── BLE ──────────────────────────────────────────────────────────────────────
#define DEVICE_NAME   "EdubotCar"
#define SERVICE_UUID  "c7a6e100-f000-4d00-b000-000000000001"
#define CMD_CHAR_UUID "c7a6e100-f000-4d00-b000-000000000002"

// ─── Safety timeout ───────────────────────────────────────────────────────────
// If no command arrives within this window, motors stop automatically.
// The app sends a repeat command every 380 ms while a button is held.
// 600 ms gives comfortable margin while still being safe on release.
#define CMD_TIMEOUT_MS 600UL

// ─── Globals ──────────────────────────────────────────────────────────────────
BLEServer         *pServer   = nullptr;
BLECharacteristic *pCmdChar  = nullptr;
bool               bleConnected = false;
unsigned long      lastCmdMs    = 0;
bool               motorsStopped = true;

// ─── Motor helpers ────────────────────────────────────────────────────────────

static void setLeft(int speed) {
    // Positive = forward, negative = backward, 0 = stop (coast)
    if (speed > 0) {
        digitalWrite(LEFT_IN1, HIGH);
        digitalWrite(LEFT_IN2, LOW);
        ledcWrite(LEDC_CH_LEFT, constrain(speed, 0, 255));
    } else if (speed < 0) {
        digitalWrite(LEFT_IN1, LOW);
        digitalWrite(LEFT_IN2, HIGH);
        ledcWrite(LEDC_CH_LEFT, constrain(-speed, 0, 255));
    } else {
        digitalWrite(LEFT_IN1, LOW);
        digitalWrite(LEFT_IN2, LOW);
        ledcWrite(LEDC_CH_LEFT, 0);
    }
}

static void setRight(int speed) {
    if (speed > 0) {
        digitalWrite(RIGHT_IN3, HIGH);
        digitalWrite(RIGHT_IN4, LOW);
        ledcWrite(LEDC_CH_RIGHT, constrain(speed, 0, 255));
    } else if (speed < 0) {
        digitalWrite(RIGHT_IN3, LOW);
        digitalWrite(RIGHT_IN4, HIGH);
        ledcWrite(LEDC_CH_RIGHT, constrain(-speed, 0, 255));
    } else {
        digitalWrite(RIGHT_IN3, LOW);
        digitalWrite(RIGHT_IN4, LOW);
        ledcWrite(LEDC_CH_RIGHT, 0);
    }
}

static void stopMotors() {
    setLeft(0);
    setRight(0);
    motorsStopped = true;
}

// ─── Command processor ────────────────────────────────────────────────────────

static void processCommand(const String &raw) {
    String cmd = raw;
    cmd.trim();
    if (cmd.length() == 0) return;

    lastCmdMs = millis();

    // Parse  "BASE:PCT"  or  "BASE"
    int    colon = cmd.indexOf(':');
    String base  = (colon >= 0) ? cmd.substring(0, colon) : cmd;
    int    pct   = (colon >= 0) ? cmd.substring(colon + 1).toInt() : 0;
    int    pwm   = constrain((pct * 255) / 100, 0, 255);

    Serial.print("[CMD] "); Serial.print(base);
    if (colon >= 0) { Serial.print(" pct="); Serial.print(pct); Serial.print(" pwm="); Serial.print(pwm); }
    Serial.println();

    if (base == "CAR_FORWARD") {
        setLeft(pwm);
        setRight(pwm);
        motorsStopped = false;
    } else if (base == "CAR_BACKWARD") {
        setLeft(-pwm);
        setRight(-pwm);
        motorsStopped = false;
    } else if (base == "CAR_LEFT") {
        // Pivot: left motor reverse, right motor forward
        setLeft(-pwm);
        setRight(pwm);
        motorsStopped = false;
    } else if (base == "CAR_RIGHT") {
        // Pivot: left motor forward, right motor reverse
        setLeft(pwm);
        setRight(-pwm);
        motorsStopped = false;
    } else {
        // CAR_STOP or anything unrecognised
        stopMotors();
    }
}

// ─── BLE Server callbacks ─────────────────────────────────────────────────────

class ServerCB : public BLEServerCallbacks {
    void onConnect(BLEServer *) override {
        bleConnected = true;
        lastCmdMs    = millis();  // reset timeout clock on connect
        Serial.println("[BLE] Client connected");
    }
    void onDisconnect(BLEServer *) override {
        bleConnected = false;
        stopMotors();
        Serial.println("[BLE] Client disconnected — motors stopped");
        // Restart advertising so the app can reconnect
        BLEDevice::startAdvertising();
    }
};

class CmdCB : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) override {
        std::string val = pChar->getValue();
        if (!val.empty()) {
            processCommand(String(val.c_str()));
        }
    }
};

// ─── Setup ────────────────────────────────────────────────────────────────────

void setup() {
    Serial.begin(115200);
    Serial.println("=================================");
    Serial.println("  EdubotCar BLE Motor Controller");
    Serial.println("=================================");

    // ── Motor pin init
    pinMode(LEFT_IN1,  OUTPUT);
    pinMode(LEFT_IN2,  OUTPUT);
    pinMode(RIGHT_IN3, OUTPUT);
    pinMode(RIGHT_IN4, OUTPUT);

    ledcSetup(LEDC_CH_LEFT,  LEDC_FREQ, LEDC_RESOLUTION);
    ledcSetup(LEDC_CH_RIGHT, LEDC_FREQ, LEDC_RESOLUTION);
    ledcAttachPin(LEFT_ENA,   LEDC_CH_LEFT);
    ledcAttachPin(RIGHT_ENB,  LEDC_CH_RIGHT);

    stopMotors();
    Serial.println("[MOTORS] L298N ready");

    // ── BLE init
    BLEDevice::init(DEVICE_NAME);
    BLEDevice::setMTU(64);

    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCB());

    BLEService *pService = pServer->createService(SERVICE_UUID);

    // CMD characteristic: write-without-response (fastest for real-time control)
    pCmdChar = pService->createCharacteristic(
        CMD_CHAR_UUID,
        BLECharacteristic::PROPERTY_WRITE      |
        BLECharacteristic::PROPERTY_WRITE_NR
    );
    pCmdChar->setCallbacks(new CmdCB());

    pService->start();

    // Advertise with service UUID and scan response for name visibility
    BLEAdvertising *pAdv = BLEDevice::getAdvertising();
    pAdv->addServiceUUID(SERVICE_UUID);
    pAdv->setScanResponse(true);
    pAdv->setMinPreferred(0x06);
    pAdv->setMaxPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("[BLE] Advertising as: " DEVICE_NAME);
    Serial.println("[BLE] Ready — waiting for Sports Mode app connection");
}

// ─── Loop ─────────────────────────────────────────────────────────────────────

void loop() {
    // Safety timeout: stop motors if connected but no command arrives in time.
    // This catches the case where the app closes or BLE drops mid-drive.
    if (bleConnected && !motorsStopped) {
        if (millis() - lastCmdMs > CMD_TIMEOUT_MS) {
            stopMotors();
            Serial.println("[SAFETY] Timeout — motors stopped");
        }
    }
    delay(10);
}
