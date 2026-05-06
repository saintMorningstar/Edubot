#pragma once
#include <Arduino.h>

// ── I2S Microphone (INMP441) pins ─────────────────────────────
// Wire: WS→GPIO4  SCK→GPIO5  SD→GPIO6  L/R→GND (selects left ch)
#define I2S_MIC_WS    4
#define I2S_MIC_SCK   5
#define I2S_MIC_SD    6

// ── I2S Amplifier (MAX98357A) pins ────────────────────────────
// Wire: LRC→GPIO7  BCLK→GPIO8  DIN→GPIO9  GAIN→GND (9 dB gain)
#define I2S_SPK_LRC   7
#define I2S_SPK_BCK   8
#define I2S_SPK_DIN   9

// ── Audio parameters ──────────────────────────────────────────
#define AUDIO_SAMPLE_RATE   16000
#define AUDIO_BITS          16
#define RECORD_SECONDS      3
#define RECORD_BYTES        (AUDIO_SAMPLE_RATE * (AUDIO_BITS / 8) * RECORD_SECONDS)
// 16000 Hz * 2 bytes * 3 s = 96 000 bytes
#define WAV_HDR_SIZE        44
#define WAV_BUF_SIZE        (WAV_HDR_SIZE + RECORD_BYTES)  // 96 044 bytes

enum AudioState { AUDIO_IDLE, AUDIO_RECORDING, AUDIO_PLAYING };

// Initialise I2S hardware (called once from setup)
void audioSetup();

// Non-blocking tick — call every loop iteration
void audioLoop();

// ── Recording ─────────────────────────────────────────────────
// Returns false if already busy
bool audioStartRecord();

// Finish early (also called automatically when buffer full / timeout)
bool audioStopRecord();

// True after a recording completes and before it is consumed
bool audioRecordingReady();

// Hand off the WAV buffer (pointer valid until next record/play call)
void audioConsumeRecording(const uint8_t** outBuf, size_t* outLen);

// ── Playback ──────────────────────────────────────────────────
// Copies data internally; accepts raw WAV (44-byte header is stripped)
void audioPlay(const uint8_t* data, size_t len);

// Stop any in-progress recording or playback
void audioStop();

AudioState audioGetState();
