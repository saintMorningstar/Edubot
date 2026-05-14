#include "watchdog.h"
#include <esp_task_wdt.h>

#define WDT_TIMEOUT_SEC  10

void initWatchdog() {
    // arduino-esp32 v3.x initialises TWDT before setup() — reconfigure instead of init
    esp_task_wdt_config_t wdt_cfg = {
        .timeout_ms     = WDT_TIMEOUT_SEC * 1000,
        .idle_core_mask = 0,
        .trigger_panic  = true,
    };
    esp_task_wdt_reconfigure(&wdt_cfg);
    esp_task_wdt_add(NULL);
}

void feedWatchdog() {
    esp_task_wdt_reset();
}
