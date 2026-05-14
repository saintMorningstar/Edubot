#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DFRobotDFPlayerMini.h>

// ─── I2C ──────────────────────────────────────────────────────────────────────
#define I2C_SDA            1
#define I2C_SCL            2

// ─── OLED SSD1306 ─────────────────────────────────────────────────────────────
#define SCREEN_WIDTH       128
#define SCREEN_HEIGHT      64
#define OLED_RESET         -1
#define OLED_ADDRESS       0x3C

// ─── DFPlayer Mini ────────────────────────────────────────────────────────────
// ESP32 TX (GPIO17) → DFPlayer RX
// ESP32 RX (GPIO18) ← DFPlayer TX
#define DFPLAYER_BAUD      9600
#define DFPLAYER_RX_PIN    18
#define DFPLAYER_TX_PIN    17

// ─── Servo GPIO Pins (direct ESP32-S3 LEDC PWM) ──────────────────────────────
#define SERVO_PIN_LEFT_HIP    36
#define SERVO_PIN_LEFT_FOOT   37
#define SERVO_PIN_LEFT_HAND   10
#define SERVO_PIN_RIGHT_HIP   39
#define SERVO_PIN_RIGHT_FOOT  40
#define SERVO_PIN_RIGHT_HAND  21

// LEDC channels (0-7 available on ESP32-S3; one per servo)
#define SERVO_CH_LEFT_HIP    0
#define SERVO_CH_LEFT_FOOT   1
#define SERVO_CH_LEFT_HAND   2
#define SERVO_CH_RIGHT_HIP   3
#define SERVO_CH_RIGHT_FOOT  4
#define SERVO_CH_RIGHT_HAND  5
#define NUM_SERVOS           6

#define SERVO_FREQUENCY    50

// ─── GPIO ─────────────────────────────────────────────────────────────────────
#define BUTTON_PIN         16
#define NEOPIXEL_PIN       48
#define LED_STATUS1_PIN    42
#define LED_STATUS2_PIN    47

// I2S Microphone INMP441
#define I2S_SCK_PIN         5
#define I2S_WS_PIN          4
#define I2S_SD_PIN          6

// I2S Amplifier MAX98357A
#define I2S_BCLK_PIN        8
#define I2S_LRC_PIN         7
#define I2S_DIN_PIN         9

// HC-SR04 Ultrasonic (ECHO uses voltage divider — ESP32-S3 is 3.3V)
#define TRIG_PIN           14
#define ECHO_PIN           15

// DHT11
#define DHT11_PIN          13

// Battery ADC (voltage divider to 3.3V range)
#define BATTERY_ADC_PIN    34

// ─── Tuning ───────────────────────────────────────────────────────────────────
#define SERVO_STEP_MS          20
#define SERVO_DEFAULT_SPEED    3.0f   // degrees per step
#define OBSTACLE_DIST_CM      15.0f
#define LOW_BATTERY_VOLTS      3.3f
#define BATTERY_WARN_VOLTS     3.5f

// ─── Global flags ─────────────────────────────────────────────────────────────
extern bool aiEnabled;
extern bool wakeWordDetected;
extern bool isWalking;
extern bool isDancing;
extern bool isSpeaking;

#endif // CONFIG_H
