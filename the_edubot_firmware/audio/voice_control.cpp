#include "voice_control.h"
#include "../system/logger.h"
#include "../system/states.h"
#include "../system/config.h"
#include "../bluetooth/ble_commands.h"

#include "ESP_I2S.h"
#include "ESP_SR.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define VC_SAMPLE_RATE 16000

// Heap pointer — no global constructor, created inside the background task
static I2SClass* _pVcI2S = nullptr;
static bool      _active  = false;

// ── Command table ─────────────────────────────────────────────────────────────
static const sr_cmd_t SR_COMMANDS[] = {
    {0,  "move forward"},
    {0,  "go forward"},
    {1,  "move backward"},
    {1,  "go backward"},
    {2,  "turn left"},
    {3,  "turn right"},
    {4,  "robot stop"},
    {4,  "stop moving"},
    {5,  "start dancing"},
    {5,  "lets dance"},
    {6,  "be happy"},
    {6,  "feel happy"},
    {7,  "be sad"},
    {7,  "feel sad"},
    {8,  "be angry"},
    {9,  "get excited"},
    {10, "feel sleepy"},
    {10, "go to sleep"},
    {11, "wave hello"},
    {12, "sleep now"},
    {13, "wake up"},
    {13, "wake up now"},
};

static const char *CMD_MAP[] = {
    "MOVE_FORWARD",   // 0
    "MOVE_BACKWARD",  // 1
    "TURN_LEFT",      // 2
    "TURN_RIGHT",     // 3
    "STOP",           // 4
    "DANCE",          // 5
    "HAPPY",          // 6
    "SAD",            // 7
    "ANGRY",          // 8
    "EXCITED",        // 9
    "SLEEPY",         // 10
    "POSE_WAVE",      // 11
    "SLEEP",          // 12
    "WAKE",           // 13
};
#define CMD_COUNT (int)(sizeof(CMD_MAP) / sizeof(CMD_MAP[0]))

// ── Event callback ────────────────────────────────────────────────────────────

static void onSrEvent(sr_event_t event, int command_id, int /*phrase_id*/) {
    switch (event) {
        case SR_EVENT_WAKEWORD:
            setState(LISTENING);
            logInfo("Voice: wake word heard, listening...");
            ESP_SR.setMode(SR_MODE_COMMAND);
            break;
        case SR_EVENT_WAKEWORD_CHANNEL:
            setState(LISTENING);
            ESP_SR.setMode(SR_MODE_COMMAND);
            break;
        case SR_EVENT_COMMAND:
            if (command_id >= 0 && command_id < CMD_COUNT) {
                logInfo(String("Voice cmd: ") + CMD_MAP[command_id]);
                processBLECommand(String(CMD_MAP[command_id]));
            }
            setState(IDLE);
            ESP_SR.setMode(SR_MODE_WAKEWORD);
            break;
        case SR_EVENT_TIMEOUT:
            logInfo("Voice: command timeout");
            setState(IDLE);
            ESP_SR.setMode(SR_MODE_WAKEWORD);
            break;
        default: break;
    }
}

// ── Background init task ──────────────────────────────────────────────────────

static void _vcInitTask(void *pvParameters) {
    vTaskDelay(pdMS_TO_TICKS(3000));  // let setup() + loop() settle first

    if (heap_caps_get_free_size(MALLOC_CAP_SPIRAM) < 3 * 1024 * 1024) {
        logError("Voice: PSRAM too small — need OPI PSRAM + QIO flash mode in Arduino IDE");
        vTaskDelete(NULL);
        return;
    }

    _pVcI2S = new I2SClass();
    if (!_pVcI2S) {
        logError("Voice: failed to allocate I2S object");
        vTaskDelete(NULL);
        return;
    }

    _pVcI2S->setTimeout(1000);
    _pVcI2S->setPins(I2S_SCK_PIN, I2S_WS_PIN, /*DOUT*/ -1, I2S_SD_PIN);

    if (!_pVcI2S->begin(I2S_MODE_STD, VC_SAMPLE_RATE,
                        I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO,
                        I2S_STD_SLOT_LEFT)) {
        logError("Voice: I2S mic init failed — check INMP441 wiring on GPIO4/5/6");
        delete _pVcI2S;
        _pVcI2S = nullptr;
        vTaskDelete(NULL);
        return;
    }

    ESP_SR.onEvent(onSrEvent);
    bool ok = ESP_SR.begin(
        *_pVcI2S,
        SR_COMMANDS, sizeof(SR_COMMANDS) / sizeof(sr_cmd_t),
        SR_CHANNELS_MONO,
        SR_MODE_WAKEWORD,
        "M"
    );

    _active = ok;
    if (ok) {
        logInfo("Voice control ready — say 'Hi ESP' then a command");
    } else {
        logError("Voice control failed — check partition/model flash");
        _pVcI2S->end();
        delete _pVcI2S;
        _pVcI2S = nullptr;
    }

    vTaskDelete(NULL);
}

// ── Public API ────────────────────────────────────────────────────────────────

void initVoiceControl() {
    xTaskCreatePinnedToCore(
        _vcInitTask, "vc_init",
        49152,  // 48KB — ESP_SR needs headroom for model init
        NULL, 1, NULL,
        1       // Core 1 (APP_CPU)
    );
    logInfo("Voice control: init deferred (ready ~3 s after boot)");
}

bool isVoiceControlActive() { return _active; }
