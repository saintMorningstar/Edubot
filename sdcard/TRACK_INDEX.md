# Edubot SD Card — MP3 Track Index

Copy these files to the root of the DFPlayer Mini microSD card.
Files MUST be named with 4-digit zero-padded numbers: 0001.mp3, 0002.mp3, etc.
DFPlayer Mini uses index-based playback — do NOT rely on filenames.

## Track Mapping

| File         | SoundTrack Enum  | Description                          |
|--------------|------------------|--------------------------------------|
| 0001.mp3     | SOUND_STARTUP    | Boot-up jingle / greeting            |
| 0002.mp3     | SOUND_HAPPY      | Happy exclamation (e.g. "Yay!")      |
| 0003.mp3     | SOUND_SAD        | Sad sound (e.g. "Aww...")            |
| 0004.mp3     | SOUND_ANGRY      | Angry/frustrated sound               |
| 0005.mp3     | SOUND_TOUCH      | Touch reaction (giggle / "Hee hee!") |
| 0006.mp3     | SOUND_OBSTACLE   | Obstacle detected ("Oops! Watch out!")|
| 0007.mp3     | SOUND_EXCITED    | Excitement ("Woohoo!")               |
| 0008.mp3     | SOUND_SLEEPY     | Sleepy / yawn sound                  |
| 0009.mp3     | SOUND_DANCE      | Dance music loop (upbeat, ~10s)      |
| 0010.mp3     | SOUND_GREET      | Hello greeting ("Hi there, friend!") |
| 0011.mp3     | SOUND_BYE        | Goodbye ("Bye bye! See you soon!")   |
| 0012.mp3     | SOUND_LAUGH      | Laughter sound                       |
| 0013.mp3     | SOUND_THINKING   | Thinking hum ("Hmm...")              |
| 0014.mp3     | SOUND_LEARNING   | Learning phrase ("Let's learn!")     |
| 0015.mp3     | SOUND_VICTORY    | Victory fanfare / "You did it!"      |
| 0016.mp3     | SOUND_SONG_1     | Educational song — ABC Song          |
| 0017.mp3     | SOUND_SONG_2     | Educational song — Counting 1-10     |
| 0018.mp3     | SOUND_SONG_3     | Educational song — Nursery rhyme     |
| 0019.mp3     | SOUND_EFFECT_1   | Fun sound effect (boing/pop)         |
| 0020.mp3     | SOUND_EFFECT_2   | Fun sound effect (sparkle/chime)     |

## Audio Recommendations

- Format: MP3, 44.1kHz or 22.05kHz, 128kbps CBR
- Duration: 1-3 seconds for reactions; 10-30 seconds for songs
- Volume: Normalize to -6dB to avoid clipping at full DFPlayer volume
- Content: Child-friendly, upbeat, age-appropriate for 1-5 years
- Language: Simple, clear words if speech is used

## Hardware Note

The DFPlayer Mini (MP3-TF-16P) manages the SD card directly.
The ESP32 communicates with it via UART (TX=GPIO17, RX=GPIO18) at 9600 baud.
No direct SD card access from the ESP32 is needed.
