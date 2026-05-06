#include "ai_manager.h"
#include "config.h"
#include "secrets.h"
#include <HTTPClient.h>
#include <WiFi.h>

// ─── Task state (written by task, read by main loop) ─────────────────────────
static enum { AI_IDLE, AI_RUNNING, AI_DONE, AI_FAILED } aiState = AI_IDLE;
static SemaphoreHandle_t aiMutex = nullptr;

static uint8_t*  reqBuf   = nullptr;
static size_t    reqLen   = 0;

static uint8_t*  resBuf   = nullptr;
static size_t    resLen   = 0;
static uint8_t   resR = 255, resG = 255, resB = 255;  // LED colour from response

static AiResultCb resultCb = nullptr;
static AiErrorCb  errorCb  = nullptr;

// ─── FreeRTOS task ────────────────────────────────────────────────────────────
static void httpTask(void* param) {
    char url[128];
    snprintf(url, sizeof(url), "http://%s:%d%s", BACKEND_HOST, BACKEND_PORT, BACKEND_PROCESS_PATH);

    HTTPClient http;
    http.setTimeout(HTTP_REQ_TIMEOUT_MS);
    http.begin(url);
    http.addHeader("Content-Type", "audio/wav");

    int code = http.POST(reqBuf, reqLen);

    if (code == HTTP_CODE_OK) {
        // Read optional LED colour from response header
        String colorHdr = http.header("X-Led-Color");
        if (colorHdr.length() > 0) {
            int r, g, b;
            if (sscanf(colorHdr.c_str(), "%d,%d,%d", &r, &g, &b) == 3) {
                xSemaphoreTake(aiMutex, portMAX_DELAY);
                resR = (uint8_t)r; resG = (uint8_t)g; resB = (uint8_t)b;
                xSemaphoreGive(aiMutex);
            }
        }

        int totalLen = http.getSize();
        if (totalLen > 0 && totalLen < 1024 * 512) {
            uint8_t* buf = (uint8_t*)ps_malloc(totalLen);
            if (!buf) buf = (uint8_t*)malloc(totalLen);

            if (buf) {
                WiFiClient* stream = http.getStreamPtr();
                int pos = 0;
                unsigned long deadline = millis() + HTTP_REQ_TIMEOUT_MS;

                while (http.connected() && pos < totalLen) {
                    size_t avail = stream->available();
                    if (avail) {
                        int got = stream->readBytes(buf + pos, min((size_t)(totalLen - pos), avail));
                        pos += got;
                    } else if (millis() > deadline) {
                        break;
                    } else {
                        vTaskDelay(pdMS_TO_TICKS(2));
                    }
                }

                xSemaphoreTake(aiMutex, portMAX_DELAY);
                resBuf  = buf;
                resLen  = (size_t)pos;
                aiState = AI_DONE;
                xSemaphoreGive(aiMutex);
                Serial.printf("[AI] Response %d bytes\n", pos);
            } else {
                xSemaphoreTake(aiMutex, portMAX_DELAY);
                aiState = AI_FAILED;
                xSemaphoreGive(aiMutex);
            }
        } else {
            Serial.printf("[AI] Bad content-length: %d\n", totalLen);
            xSemaphoreTake(aiMutex, portMAX_DELAY);
            aiState = AI_FAILED;
            xSemaphoreGive(aiMutex);
        }
    } else {
        Serial.printf("[AI] HTTP error: %d\n", code);
        xSemaphoreTake(aiMutex, portMAX_DELAY);
        aiState = AI_FAILED;
        xSemaphoreGive(aiMutex);
    }

    http.end();
    // reqBuf freed after task exits
    vTaskDelete(nullptr);
}

// ─── Public API ───────────────────────────────────────────────────────────────
void aiSetup() {
    aiMutex = xSemaphoreCreateMutex();
}

void aiProcess(const uint8_t* wavData, size_t wavLen) {
    if (aiState != AI_IDLE) return;

    // Copy audio into PSRAM so the task can safely read it
    reqBuf = (uint8_t*)ps_malloc(wavLen);
    if (!reqBuf) reqBuf = (uint8_t*)malloc(wavLen);
    if (!reqBuf) { Serial.println("[AI] OOM for request buffer"); return; }

    memcpy(reqBuf, wavData, wavLen);
    reqLen  = wavLen;
    resR = resG = resB = 255;  // default: white
    aiState = AI_RUNNING;

    xTaskCreatePinnedToCore(httpTask, "ai_http", 16384, nullptr, 1, nullptr, 0);
    Serial.printf("[AI] HTTP task started (%u bytes)\n", (unsigned)wavLen);
}

bool aiBusy() { return aiState == AI_RUNNING; }

void aiLoop() {
    if (aiState == AI_DONE) {
        xSemaphoreTake(aiMutex, portMAX_DELAY);
        uint8_t* buf = resBuf;  size_t len = resLen;
        uint8_t  r = resR, g = resG, b = resB;
        resBuf  = nullptr; resLen = 0;
        aiState = AI_IDLE;
        xSemaphoreGive(aiMutex);

        if (reqBuf) { free(reqBuf); reqBuf = nullptr; }
        if (resultCb && buf) resultCb(buf, len, r, g, b);
        if (buf) free(buf);
    }

    if (aiState == AI_FAILED) {
        xSemaphoreTake(aiMutex, portMAX_DELAY);
        aiState = AI_IDLE;
        xSemaphoreGive(aiMutex);
        if (reqBuf) { free(reqBuf); reqBuf = nullptr; }
        if (errorCb) errorCb("HTTP_FAILED");
    }
}

void aiSetResultCallback(AiResultCb cb) { resultCb = cb; }
void aiSetErrorCallback(AiErrorCb  cb)  { errorCb  = cb; }
