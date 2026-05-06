#pragma once
#include <Arduino.h>

// ─── I2S Speaker (MAX98357A) ──────────────────────────────────────────────────
#define I2S_SPK_BCLK    7
#define I2S_SPK_LRC     6
#define I2S_SPK_DIN     8

// ─── I2S Microphone (INMP441) ─────────────────────────────────────────────────
#define I2S_MIC_SCK     2
#define I2S_MIC_WS      3
#define I2S_MIC_SD      4

// ─── RGB LED (NeoPixel WS2812 — GPIO 48 on ESP32-S3-DevKitC-1) ───────────────
#define LED_PIN         48
#define LED_COUNT       1

// ─── Button ───────────────────────────────────────────────────────────────────
#define BTN_PIN             16
#define BTN_DEBOUNCE_MS     30
#define BTN_SHORT_MAX_MS    500
#define BTN_LONG_MS         3000

// ─── OLED (I2C, SSD1306 128×64) ───────────────────────────────────────────────
#define OLED_SDA        9
#define OLED_SCL        10
#define OLED_ADDR       0x3C
#define OLED_WIDTH      128
#define OLED_HEIGHT     64

// ─── WebSocket ────────────────────────────────────────────────────────────────
#define WS_PORT             81
#define WS_HEARTBEAT_MS     5000
#define WS_CONNECT_TIMEOUT  10000

// ─── Audio ────────────────────────────────────────────────────────────────────
#define AUDIO_SAMPLE_RATE   16000
#define AUDIO_BITS          16
#define RECORD_SECONDS      8
#define WAV_HDR_SIZE        44
#define RECORD_BYTES        (AUDIO_SAMPLE_RATE * (AUDIO_BITS / 8) * RECORD_SECONDS)
#define WAV_BUF_SIZE        (WAV_HDR_SIZE + RECORD_BYTES)   // ~250 KB — use PSRAM

// ─── WiFi ─────────────────────────────────────────────────────────────────────
#define WIFI_TIMEOUT_MS     15000

// ─── Backend (all AI API keys live here — ESP32 never holds keys) ─────────────
#define BACKEND_PORT        3000
#define BACKEND_PROCESS_PATH "/api/process"   // POST WAV → receive WAV response
#define HTTP_REQ_TIMEOUT_MS  25000

// ─── System State Machine ─────────────────────────────────────────────────────
enum SystemState {
    STATE_OFF,
    STATE_BOOTING,
    STATE_WIFI_CONNECTING,
    STATE_STANDALONE_LISTENING,
    STATE_RECORDING,
    STATE_STANDALONE_PROCESSING,
    STATE_PAIRED_IDLE,
    STATE_PAIRED_PROCESSING,
    STATE_SPEAKING,
    STATE_ERROR
};
