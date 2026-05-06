#include "audio_manager.h"
#include "config.h"
#include <driver/i2s.h>
#include <AudioOutputI2S.h>
#include <AudioGeneratorMP3.h>
#include <AudioGeneratorWAV.h>
#include <AudioFileSource.h>

#define I2S_MIC_PORT    I2S_NUM_0
#define I2S_SPK_PORT    I2S_NUM_1
#define DMA_BUF_COUNT   8
#define DMA_BUF_LEN     512

// ─── Custom AudioFileSource that reads from a PSRAM buffer ───────────────────
class AudioFileSourceRAM : public AudioFileSource {
public:
    void setData(const uint8_t* data, uint32_t len) {
        _data = data; _len = len; _pos = 0;
    }
    bool     open(const char*)       override { _pos = 0; return _data != nullptr; }
    uint32_t read(void* buf, uint32_t n) override {
        uint32_t avail  = _len - _pos;
        uint32_t toRead = (n < avail) ? n : avail;
        memcpy(buf, _data + _pos, toRead);
        _pos += toRead;
        return toRead;
    }
    bool seek(int32_t off, int whence) override {
        if (whence == SEEK_SET) _pos = (uint32_t)off;
        else if (whence == SEEK_CUR) _pos += off;
        else _pos = _len + off;
        if (_pos > _len) _pos = _len;
        return true;
    }
    bool     close()            override { return true; }
    bool     isOpen()           override { return _data != nullptr; }
    uint32_t getSize()          override { return _len; }
    uint32_t getPos()           override { return _pos; }
private:
    const uint8_t* _data = nullptr;
    uint32_t _len = 0, _pos = 0;
};

// ─── Statics ──────────────────────────────────────────────────────────────────
// Speaker (shared by WAV and MP3)
static AudioOutputI2S*   audioOut = nullptr;

// Playback generators (only one active at a time)
static AudioGeneratorMP3* mp3Gen  = nullptr;
static AudioGeneratorWAV* wavGen  = nullptr;
static AudioFileSourceRAM ramSrc;

// Playback data buffer (PSRAM)
static uint8_t* playBuf  = nullptr;
static size_t   playLen  = 0;

// Recording (raw I2S driver on I2S_NUM_0)
static uint8_t* wavBuf   = nullptr;
static size_t   recPos   = 0;
static bool     recReady = false;
static bool     micInst  = false;
static unsigned long recStart = 0;

// State
static AudioState  state        = AUDIO_IDLE;
static bool        playFinished = false;

// ─── WAV header builder ───────────────────────────────────────────────────────
static void buildWavHeader(uint8_t* buf, uint32_t dataBytes) {
    const uint32_t byteRate   = AUDIO_SAMPLE_RATE * (AUDIO_BITS / 8);
    const uint16_t blockAlign = AUDIO_BITS / 8;
    memcpy(buf,      "RIFF", 4); *(uint32_t*)(buf +  4) = 36 + dataBytes;
    memcpy(buf +  8, "WAVE", 4);
    memcpy(buf + 12, "fmt ", 4); *(uint32_t*)(buf + 16) = 16;
    *(uint16_t*)(buf + 20) = 1;  *(uint16_t*)(buf + 22) = 1;
    *(uint32_t*)(buf + 24) = AUDIO_SAMPLE_RATE;
    *(uint32_t*)(buf + 28) = byteRate;
    *(uint16_t*)(buf + 32) = blockAlign;
    *(uint16_t*)(buf + 34) = AUDIO_BITS;
    memcpy(buf + 36, "data", 4); *(uint32_t*)(buf + 40) = dataBytes;
}

// ─── Format detection ─────────────────────────────────────────────────────────
static inline bool dataIsWAV(const uint8_t* d) { return memcmp(d, "RIFF", 4) == 0; }
static inline bool dataIsMP3(const uint8_t* d) {
    return (d[0] == 0xFF && (d[1] & 0xE0) == 0xE0) ||
           (d[0] == 'I'  &&  d[1] == 'D' && d[2] == '3');
}

// ─── I2S microphone (raw driver) ─────────────────────────────────────────────
static bool installMic() {
    if (micInst) return true;
    i2s_config_t cfg = {};
    cfg.mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX);
    cfg.sample_rate          = AUDIO_SAMPLE_RATE;
    cfg.bits_per_sample      = I2S_BITS_PER_SAMPLE_32BIT;
    cfg.channel_format       = I2S_CHANNEL_FMT_ONLY_LEFT;
    cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
    cfg.intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1;
    cfg.dma_buf_count        = DMA_BUF_COUNT;
    cfg.dma_buf_len          = DMA_BUF_LEN;

    i2s_pin_config_t pins = {};
    pins.bck_io_num   = I2S_MIC_SCK;
    pins.ws_io_num    = I2S_MIC_WS;
    pins.data_out_num = I2S_PIN_NO_CHANGE;
    pins.data_in_num  = I2S_MIC_SD;

    if (i2s_driver_install(I2S_MIC_PORT, &cfg, 0, nullptr) != ESP_OK) return false;
    if (i2s_set_pin(I2S_MIC_PORT, &pins) != ESP_OK) {
        i2s_driver_uninstall(I2S_MIC_PORT); return false;
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

// ─── Playback cleanup helper ──────────────────────────────────────────────────
static void stopGenerators() {
    if (mp3Gen && mp3Gen->isRunning()) { mp3Gen->stop(); }
    if (wavGen && wavGen->isRunning()) { wavGen->stop(); }
    if (playBuf) { free(playBuf); playBuf = nullptr; playLen = 0; }
}

// ─── Public API ───────────────────────────────────────────────────────────────
void audioSetup() {
    // PSRAM recording buffer
    wavBuf = (uint8_t*)ps_malloc(WAV_BUF_SIZE);
    if (!wavBuf) wavBuf = (uint8_t*)malloc(WAV_BUF_SIZE);

    // Shared I2S speaker output (AudioOutputI2S owns the I2S_NUM_1 driver)
    audioOut = new AudioOutputI2S(I2S_SPK_PORT, AudioOutputI2S::EXTERNAL_I2S);
    audioOut->SetPinout(I2S_SPK_BCLK, I2S_SPK_LRC, I2S_SPK_DIN);
    audioOut->SetGain(0.7f);

    // Allocate generators once; reuse across sessions
    mp3Gen = new AudioGeneratorMP3();
    wavGen = new AudioGeneratorWAV();

    Serial.printf("[Audio] MIC SCK=%d WS=%d SD=%d  SPK BCLK=%d LRC=%d DIN=%d\n",
                  I2S_MIC_SCK, I2S_MIC_WS, I2S_MIC_SD,
                  I2S_SPK_BCLK, I2S_SPK_LRC, I2S_SPK_DIN);
}

bool audioStartRecord() {
    if (state != AUDIO_IDLE || !wavBuf) return false;
    recPos = 0; recReady = false;
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
    Serial.printf("[Audio] Stopped — %u PCM bytes\n", (unsigned)recPos);
    return true;
}

bool audioRecordingReady() { return recReady; }

void audioConsumeRecording(const uint8_t** outBuf, size_t* outLen) {
    *outBuf = wavBuf; *outLen = WAV_HDR_SIZE + recPos;
    recReady = false;
}

void audioPlay(const uint8_t* data, size_t len) {
    if (!data || len < 8) return;
    audioStop();

    playBuf = (uint8_t*)ps_malloc(len);
    if (!playBuf) playBuf = (uint8_t*)malloc(len);
    if (!playBuf) { Serial.println("[Audio] OOM for playback"); return; }

    memcpy(playBuf, data, len);
    playLen = len;
    playFinished = false;

    ramSrc.setData(playBuf, (uint32_t)len);
    ramSrc.open(nullptr);

    bool started = false;
    if (dataIsWAV(data)) {
        started = wavGen->begin(&ramSrc, audioOut);
        Serial.printf("[Audio] Playing WAV %u bytes\n", (unsigned)len);
    } else if (dataIsMP3(data)) {
        started = mp3Gen->begin(&ramSrc, audioOut);
        Serial.printf("[Audio] Playing MP3 %u bytes\n", (unsigned)len);
    } else {
        Serial.println("[Audio] Unknown format — skipping");
        free(playBuf); playBuf = nullptr;
        return;
    }

    if (started) {
        state = AUDIO_PLAYING;
    } else {
        Serial.println("[Audio] Generator begin() failed");
        free(playBuf); playBuf = nullptr;
    }
}

void audioStop() {
    if (state == AUDIO_RECORDING) { uninstallMic(); recReady = false; recPos = 0; }
    stopGenerators();
    state = AUDIO_IDLE;
}

AudioState audioGetState() { return state; }

bool audioPlaybackJustFinished() {
    if (playFinished) { playFinished = false; return true; }
    return false;
}

// ─── Non-blocking loop ────────────────────────────────────────────────────────
void audioLoop() {
    // INMP441 outputs 32-bit words; downsample to 16-bit PCM for WAV
    static int32_t chunk32[DMA_BUF_LEN];
    static int16_t chunk16[DMA_BUF_LEN];

    switch (state) {
        case AUDIO_RECORDING: {
            bool timeout = (millis() - recStart) >= (uint32_t)RECORD_SECONDS * 1000;
            size_t avail = RECORD_BYTES - recPos;
            if (avail == 0 || timeout) { audioStopRecord(); break; }

            size_t toRead   = (avail * 2 < sizeof(chunk32)) ? avail * 2 : sizeof(chunk32);
            size_t bytesRead = 0;
            i2s_read(I2S_MIC_PORT, chunk32, toRead, &bytesRead, 0);
            if (bytesRead > 0) {
                size_t samples  = bytesRead / 4;
                for (size_t i = 0; i < samples; i++) chunk16[i] = (int16_t)(chunk32[i] >> 14);
                size_t pcmBytes = samples * 2;
                if (pcmBytes > avail) pcmBytes = avail;
                memcpy(wavBuf + WAV_HDR_SIZE + recPos, chunk16, pcmBytes);
                recPos += pcmBytes;
            }
            break;
        }
        case AUDIO_PLAYING: {
            // Determine which generator is active and pump it
            bool running = false;
            if (mp3Gen->isRunning()) running = mp3Gen->loop();
            else if (wavGen->isRunning()) running = wavGen->loop();

            if (!running) {
                if (mp3Gen->isRunning()) mp3Gen->stop();
                if (wavGen->isRunning()) wavGen->stop();
                free(playBuf); playBuf = nullptr; playLen = 0;
                state        = AUDIO_IDLE;
                playFinished = true;
                Serial.println("[Audio] Playback complete");
            }
            break;
        }
        default: break;
    }
}
