#include "dfplayer.h"
#include <DFRobotDFPlayerMini.h>
#include <HardwareSerial.h>
#include "../system/logger.h"
#include "../system/config.h"

static DFRobotDFPlayerMini dfPlayer;
static HardwareSerial dfSerial(2);  // UART2
static uint8_t currentVolume = 25;

void initDFPlayer() {
    dfSerial.begin(DFPLAYER_BAUD, SERIAL_8N1, DFPLAYER_RX_PIN, DFPLAYER_TX_PIN);
    delay(1000);  // DFPlayer needs time to power up

    if (!dfPlayer.begin(dfSerial, false, true)) {
        logError("DFPlayer init failed");
        return;
    }
    dfPlayer.setTimeOut(500);
    dfPlayer.volume(currentVolume);
    dfPlayer.EQ(DFPLAYER_EQ_NORMAL);
    dfPlayer.outputDevice(DFPLAYER_DEVICE_SD);
    logInfo("DFPlayer ready");
}

void playTrack(uint16_t track) {
    dfPlayer.play(track);
}

void stopTrack() {
    dfPlayer.stop();
}

void setVolume(uint8_t volume) {
    currentVolume = constrain(volume, 0, 30);
    dfPlayer.volume(currentVolume);
}

bool dfPlayerBusy() {
    return dfPlayer.available();
}
