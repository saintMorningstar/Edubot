#ifndef DFPLAYER_H
#define DFPLAYER_H

#include <Arduino.h>

void initDFPlayer();
void playTrack(uint16_t track);
void stopTrack();
void setVolume(uint8_t volume);
bool dfPlayerBusy();

#endif // DFPLAYER_H
