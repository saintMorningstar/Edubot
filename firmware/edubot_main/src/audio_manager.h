#pragma once
#include <Arduino.h>

enum AudioState { AUDIO_IDLE, AUDIO_RECORDING, AUDIO_PLAYING };

void       audioSetup();

// Recording
bool       audioStartRecord();
bool       audioStopRecord();
bool       audioRecordingReady();
void       audioConsumeRecording(const uint8_t** outBuf, size_t* outLen);

// Playback — format auto-detected (WAV header "RIFF" or MP3 sync word)
void       audioPlay(const uint8_t* data, size_t len);
void       audioStop();

AudioState audioGetState();
bool       audioPlaybackJustFinished();
void       audioLoop();
