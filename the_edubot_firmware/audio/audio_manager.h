#ifndef AUDIO_MANAGER_H
#define AUDIO_MANAGER_H

#include <Arduino.h>

void initAudioManager();
void playAudio(uint16_t track);
void stopAudio();
bool isAudioPlaying();
void updateAudioManager();

#endif // AUDIO_MANAGER_H
