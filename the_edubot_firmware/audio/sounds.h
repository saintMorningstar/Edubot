#ifndef SOUNDS_H
#define SOUNDS_H

#include <Arduino.h>

// SD card MP3 track index mapping
// Files: 0001.mp3, 0002.mp3, etc.
enum SoundTrack : uint16_t {
    SOUND_STARTUP       = 1,
    SOUND_HAPPY         = 2,
    SOUND_SAD           = 3,
    SOUND_ANGRY         = 4,
    SOUND_TOUCH         = 5,
    SOUND_OBSTACLE      = 6,
    SOUND_EXCITED       = 7,
    SOUND_SLEEPY        = 8,
    SOUND_DANCE         = 9,
    SOUND_GREET         = 10,
    SOUND_BYE           = 11,
    SOUND_LAUGH         = 12,
    SOUND_THINKING      = 13,
    SOUND_LEARNING      = 14,
    SOUND_VICTORY       = 15,
    SOUND_SONG_1        = 16,
    SOUND_SONG_2        = 17,
    SOUND_SONG_3        = 18,
    SOUND_EFFECT_1      = 19,
    SOUND_EFFECT_2      = 20,

    // Nursery rhyme tracks — files 0021.mp3 … 0030.mp3 on SD card
    SOUND_RHYME_1       = 21,   // Twinkle Little Star
    SOUND_RHYME_2       = 22,   // Humpty Dumpty
    SOUND_RHYME_3       = 23,   // Baa Baa Black Sheep
    SOUND_RHYME_4       = 24,   // Jack and Jill
    SOUND_RHYME_5       = 25,   // Old MacDonald
    SOUND_RHYME_6       = 26,   // Itsy Bitsy Spider
    SOUND_RHYME_7       = 27,   // Row Your Boat
    SOUND_RHYME_8       = 28,   // Wheels on the Bus
    SOUND_RHYME_9       = 29,   // Mary's Little Lamb
    SOUND_RHYME_10      = 30    // Head Shoulders Knees
};

void playSound(uint16_t track);

#endif // SOUNDS_H
