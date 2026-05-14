#include "interaction_engine.h"
#include "emotions.h"
#include "../system/states.h"
#include "../audio/audio_manager.h"
#include "../audio/sounds.h"

void processInteraction() {
    // When SPEAKING and audio finished, play a learning phrase
    if (getState() == SPEAKING && !isAudioPlaying()) {
        playSound(SOUND_LEARNING);
    }
}
