#include "audio.h"
#include <driver/i2s.h>

#define I2S_MIC_PORT    I2S_NUM_0
#define I2S_SPK_PORT    I2S_NUM_1

// DMA: 8 buffers × 512 samples = 4 096 samples queued ahead (~256 ms at 16 kHz)
#define DMA_BUF_COUNT   8
#define DMA_BUF_LEN     512

// ── Recording buffer ──────────────────────────────────────────
// Static BSS allocation (~96 KB). If the module has PSRAM, change to
// ps_malloc() in audioSetup() and store the pointer here instead.
static uint8_t wavBuf[WAV_BUF_SIZE];
static size_t  recPos     = 0;   // bytes written after WAV header
static bool    recReady   = false;
static bool    micInst    = false;

// ── Playback buffer ───────────────────────────────────────────
static uint8_t* playBuf  = nullptr;
static size_t   playLen  = 0;
static size_t   playPos  = 0;    // current read position
static bool     spkInst  = false;

static AudioState state    = AUDIO_IDLE;
static unsigned long recStart = 0;

// ── WAV header ────────────────────────────────────────────────
static void buildWavHeader(uint8_t* buf, uint32_t dataBytes) {
    const uint32_t byteRate   = AUDIO_SAMPLE_RATE * (AUDIO_BITS / 8);
    const uint16_t blockAlign = AUDIO_BITS / 8;

    memcpy(buf,      "RIFF", 4);
    *(uint32_t*)(buf +  4) = 36 + dataBytes;
    memcpy(buf +  8, "WAVE", 4);
    memcpy(buf + 12, "fmt ", 4);
    *(uint32_t*)(buf + 16) = 16;               // PCM subchunk size
    *(uint16_t*)(buf + 20) = 1;                // PCM format
    *(uint16_t*)(buf + 22) = 1;                // mono
    *(uint32_t*)(buf + 24) = AUDIO_SAMPLE_RATE;
    *(uint32_t*)(buf + 28) = byteRate;
    *(uint16_t*)(buf + 32) = blockAlign;
    *(uint16_t*)(buf + 34) = AUDIO_BITS;
    memcpy(buf + 36, "data", 4);
    *(uint32_t*)(buf + 40) = dataBytes;
}

// ── I2S microphone ────────────────────────────────────────────
static bool installMic() {
    if (micInst) return true;

    i2s_config_t cfg = {};
    cfg.mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX);
    cfg.sample_rate          = AUDIO_SAMPLE_RATE;
    cfg.bits_per_sample      = I2S_BITS_PER_SAMPLE_16BIT;
    cfg.channel_format       = I2S_CHANNEL_FMT_ONLY_LEFT;
    cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
    cfg.intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1;
    cfg.dma_buf_count        = DMA_BUF_COUNT;
    cfg.dma_buf_len          = DMA_BUF_LEN;
    cfg.use_apll             = false;
    cfg.tx_desc_auto_clear   = false;
    cfg.fixed_mclk           = 0;

    i2s_pin_config_t pins = {};
    pins.bck_io_num    = I2S_MIC_SCK;
    pins.ws_io_num     = I2S_MIC_WS;
    pins.data_out_num  = I2S_PIN_NO_CHANGE;
    pins.data_in_num   = I2S_MIC_SD;

    if (i2s_driver_install(I2S_MIC_PORT, &cfg, 0, nullptr) != ESP_OK) {
        Serial.println("[Audio] Mic I2S install failed");
        return false;
    }
    if (i2s_set_pin(I2S_MIC_PORT, &pins) != ESP_OK) {
        i2s_driver_uninstall(I2S_MIC_PORT);
        Serial.println("[Audio] Mic pin config failed");
        return false;
    }
    i2s_zero_dma_buffer(I2S_MIC_PORT);
    micInst = true;
    return true;
}

static void uninstallMic() {
    if (!micInst) return;
    i2s_driver_uninstall(I2S_MIC_PORT);
    micInst = false;
}

// ── I2S speaker ───────────────────────────────────────────────
static bool installSpeaker() {
    if (spkInst) return true;

    i2s_config_t cfg = {};
    cfg.mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX);
    cfg.sample_rate          = AUDIO_SAMPLE_RATE;
    cfg.bits_per_sample      = I2S_BITS_PER_SAMPLE_16BIT;
    cfg.channel_format       = I2S_CHANNEL_FMT_ONLY_LEFT;
    cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
    cfg.intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1;
    cfg.dma_buf_count        = DMA_BUF_COUNT;
    cfg.dma_buf_len          = DMA_BUF_LEN;
    cfg.use_apll             = false;
    cfg.tx_desc_auto_clear   = true;   // zero-fill underruns (no pop noise)
    cfg.fixed_mclk           = 0;

    i2s_pin_config_t pins = {};
    pins.bck_io_num    = I2S_SPK_BCK;
    pins.ws_io_num     = I2S_SPK_LRC;
    pins.data_out_num  = I2S_SPK_DIN;
    pins.data_in_num   = I2S_PIN_NO_CHANGE;

    if (i2s_driver_install(I2S_SPK_PORT, &cfg, 0, nullptr) != ESP_OK) {
        Serial.println("[Audio] Speaker I2S install failed");
        return false;
    }
    if (i2s_set_pin(I2S_SPK_PORT, &pins) != ESP_OK) {
        i2s_driver_uninstall(I2S_SPK_PORT);
        Serial.println("[Audio] Speaker pin config failed");
        return false;
    }
    spkInst = true;
    return true;
}

static void uninstallSpeaker() {
    if (!spkInst) return;
    i2s_stop(I2S_SPK_PORT);
    i2s_driver_uninstall(I2S_SPK_PORT);
    spkInst = false;
}

// ── Public API ────────────────────────────────────────────────
void audioSetup() {
    // Drivers are installed on demand; just print the config
    Serial.printf("[Audio] Ready  MIC: GPIO %d/%d/%d  SPK: GPIO %d/%d/%d\n",
                  I2S_MIC_WS, I2S_MIC_SCK, I2S_MIC_SD,
                  I2S_SPK_LRC, I2S_SPK_BCK, I2S_SPK_DIN);
}

bool audioStartRecord() {
    if (state != AUDIO_IDLE) return false;

    recPos   = 0;
    recReady = false;
    memset(wavBuf, 0, WAV_HDR_SIZE);

    if (!installMic()) return false;

    recStart = millis();
    state    = AUDIO_RECORDING;
    Serial.printf("[Audio] Recording %ds @ %dHz\n", RECORD_SECONDS, AUDIO_SAMPLE_RATE);
    return true;
}

bool audioStopRecord() {
    if (state != AUDIO_RECORDING) return false;

    uninstallMic();
    buildWavHeader(wavBuf, recPos);
    state    = AUDIO_IDLE;
    recReady = true;
    Serial.printf("[Audio] Stopped — %u PCM bytes captured\n", (unsigned)recPos);
    return true;
}

bool audioRecordingReady() { return recReady; }

void audioConsumeRecording(const uint8_t** outBuf, size_t* outLen) {
    *outBuf  = wavBuf;
    *outLen  = WAV_HDR_SIZE + recPos;
    recReady = false;
}

void audioPlay(const uint8_t* data, size_t len) {
    if (len < WAV_HDR_SIZE + 2) return;

    audioStop();  // abort any in-progress operation

    // Prefer PSRAM on ESP32-S3 if available
#if defined(BOARD_HAS_PSRAM) || defined(CONFIG_SPIRAM)
    playBuf = (uint8_t*)ps_malloc(len);
#else
    playBuf = (uint8_t*)malloc(len);
#endif
    if (!playBuf) {
        Serial.printf("[Audio] OOM: need %u bytes for playback\n", (unsigned)len);
        return;
    }

    memcpy(playBuf, data, len);

    // Skip WAV header if present so we feed only raw PCM to I2S
    size_t offset = 0;
    if (len > WAV_HDR_SIZE && memcmp(playBuf, "RIFF", 4) == 0) offset = WAV_HDR_SIZE;

    playPos = offset;
    playLen = len;

    if (!installSpeaker()) {
        free(playBuf); playBuf = nullptr;
        return;
    }

    state = AUDIO_PLAYING;
    Serial.printf("[Audio] Playing %u PCM bytes\n", (unsigned)(len - offset));
}

void audioStop() {
    if (state == AUDIO_RECORDING) {
        uninstallMic();
        recReady = false;
        recPos   = 0;
    }
    if (state == AUDIO_PLAYING) {
        uninstallSpeaker();
        if (playBuf) { free(playBuf); playBuf = nullptr; }
        playLen = playPos = 0;
    }
    state = AUDIO_IDLE;
}

AudioState audioGetState() { return state; }

// ── Non-blocking loop ─────────────────────────────────────────
void audioLoop() {
    // Reusable DMA-sized temp buffer (1 024 bytes, in data segment)
    static int16_t chunk[DMA_BUF_LEN];

    switch (state) {

        case AUDIO_RECORDING: {
            size_t avail = RECORD_BYTES - recPos;
            bool timeout = (millis() - recStart) >= (uint32_t)RECORD_SECONDS * 1000;

            if (avail == 0 || timeout) {
                audioStopRecord();
                break;
            }
            size_t toRead    = min(avail, sizeof(chunk));
            size_t bytesRead = 0;
            // timeout=0: return immediately with whatever DMA has ready
            i2s_read(I2S_MIC_PORT, chunk, toRead, &bytesRead, 0);
            if (bytesRead > 0) {
                memcpy(wavBuf + WAV_HDR_SIZE + recPos, chunk, bytesRead);
                recPos += bytesRead;
            }
            break;
        }

        case AUDIO_PLAYING: {
            size_t remaining = playLen - playPos;
            if (remaining == 0) {
                delay(40);   // let last DMA buffer flush to amp
                uninstallSpeaker();
                free(playBuf); playBuf = nullptr;
                playLen = playPos = 0;
                state   = AUDIO_IDLE;
                Serial.println("[Audio] Playback complete");
                break;
            }
            // Write one DMA buffer worth; short timeout lets loop() continue
            size_t toWrite     = min(remaining, (size_t)(DMA_BUF_LEN * 2));
            size_t bytesWritten = 0;
            i2s_write(I2S_SPK_PORT, playBuf + playPos, toWrite,
                      &bytesWritten, pdMS_TO_TICKS(20));
            playPos += bytesWritten;
            break;
        }

        default: break;
    }
}
