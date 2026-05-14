#include "sd_manager.h"
#include "../system/logger.h"

// SD card is used by DFPlayer Mini only (dedicated module)
// No direct SPI SD access needed from ESP32

static bool sdAvailable = false;

void initSDCard() {
    // DFPlayer manages the SD card directly via its own hardware
    // Mark available — DFPlayer will report errors if SD is missing
    sdAvailable = true;
    logInfo("SD card managed by DFPlayer");
}

bool sdCardAvailable() {
    return sdAvailable;
}
