#include "audio_manager.h"
#include "dfplayer.h"
#include "sounds.h"
#include "../system/logger.h"

static bool audioPlaying = false;
static uint16_t currentTrack = 0;
static unsigned long playStartTime = 0;

void initAudioManager() {
    audioPlaying = false;
    currentTrack = 0;
    logInfo("Audio manager ready");
}

void playAudio(uint16_t track) {
    currentTrack = track;
    audioPlaying = true;
    playStartTime = millis();
    playTrack(track);
}

void playSound(uint16_t track) {
    playAudio(track);
}

void stopAudio() {
    stopTrack();
    audioPlaying = false;
}

bool isAudioPlaying() {
    return audioPlaying;
}

void updateAudioManager() {
    // DFPlayer is non-blocking; mark done after ~5s as safety fallback
    if (audioPlaying && (millis() - playStartTime > 5000)) {
        audioPlaying = false;
    }
}
