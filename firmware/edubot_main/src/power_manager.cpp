#include "power_manager.h"
#include "config.h"
#include "display_manager.h"
#include "led_controller.h"
#include "audio_manager.h"
#include <WiFi.h>
#include <driver/i2s.h>
#include <esp_sleep.h>

void powerSetup() {
    // Wake on BTN_PIN LOW (button pressed)
    esp_sleep_enable_ext0_wakeup((gpio_num_t)BTN_PIN, 0);
}

bool powerWokeFromSleep() {
    return esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_EXT0;
}

void powerEnterSleep() {
    Serial.println("[PWR] Entering deep sleep...");

    // Graceful audio shutdown
    audioStop();

    // WiFi off
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    // I2S drivers (safe to call even if not installed)
    i2s_driver_uninstall(I2S_NUM_0);
    i2s_driver_uninstall(I2S_NUM_1);

    // LED off
    ledForceOff();

    // Show sleeping cat animation, then blank OLED
    displaySleepAnimation();

    delay(50);
    esp_deep_sleep_start();
    // Never returns
}
