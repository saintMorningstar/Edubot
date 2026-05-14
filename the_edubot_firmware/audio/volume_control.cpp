#include "volume_control.h"
#include "dfplayer.h"

static uint8_t masterVolume = 25;

void setMasterVolume(uint8_t volume) {
    masterVolume = constrain(volume, 0, 30);
    setVolume(masterVolume);
}

uint8_t getMasterVolume() {
    return masterVolume;
}
