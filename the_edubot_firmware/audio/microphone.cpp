#include "microphone.h"
#include "../system/config.h"
#include "../system/logger.h"
#include <driver/i2s.h>

#define I2S_PORT I2S_NUM_0
#define I2S_SAMPLE_RATE   16000
#define I2S_BUFFER_SIZE   512

static bool micActive = false;

void initMicrophone() {
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = I2S_SAMPLE_RATE,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 4,
        .dma_buf_len = I2S_BUFFER_SIZE,
        .use_apll = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk = 0
    };
    i2s_pin_config_t pin_config = {
        .bck_io_num   = I2S_SCK_PIN,
        .ws_io_num    = I2S_WS_PIN,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num  = I2S_SD_PIN
    };
    i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
    i2s_set_pin(I2S_PORT, &pin_config);
    logInfo("INMP441 microphone ready");
}

void startMicrophone() {
    micActive = true;
    i2s_start(I2S_PORT);
}

void stopMicrophone() {
    micActive = false;
    i2s_stop(I2S_PORT);
}

bool microphoneActive() {
    return micActive;
}
