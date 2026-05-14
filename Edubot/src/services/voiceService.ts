/**
 * src/services/voiceService.ts
 *
 * Emotion-aware text-to-speech built on expo-speech.
 *
 * ── Low-level API (unchanged) ─────────────────────────────────────────────────
 *   speak(text, emotion)      – speak any string with an emotional tone
 *   stopSpeaking()            – stop current speech
 *   randomPhrase(category)    – pick a random phrase from a legacy pool
 *
 * ── High-level game API (new) ─────────────────────────────────────────────────
 *   speakPhrase(type)         – speak a context-aware robot personality phrase
 *
 * PhraseType values and when to trigger them:
 *   'levelStart'   – when a level screen mounts and when GO is pressed
 *   'correctMove'  – after the robot makes a successful move (no wall)
 *   'wrongMove'    – when the robot hits a wall or obstacle
 *   'victory'      – when the robot reaches the goal
 *   'encourage'    – when the program runs but misses the goal
 *
 * Pitch / rate per emotion:
 *   excited → high pitch, fast   (wins, stars)
 *   happy   → medium pitch       (level start, correct)
 *   calm    → low pitch, slow    (wrong move, gentle guidance)
 */

import * as Speech from 'expo-speech';
import { ambientService } from './ambientService';

// ── Emotion types & config ────────────────────────────────────────────────────

export type Emotion = 'happy' | 'excited' | 'calm' | 'sad';

interface VoiceConfig { pitch: number; rate: number }

const EMOTION_MAP: Record<Emotion, VoiceConfig> = {
  happy:   { pitch: 1.30, rate: 0.92 },   // upbeat, friendly
  excited: { pitch: 1.50, rate: 1.08 },   // high energy
  calm:    { pitch: 1.00, rate: 0.76 },   // slow & soothing
  sad:     { pitch: 0.85, rate: 0.72 },   // gentle
};

// ── Phrase type definition ────────────────────────────────────────────────────

export type PhraseType =
  | 'levelStart'
  | 'correctMove'
  | 'wrongMove'
  | 'victory'
  | 'encourage';

// ── Phrase pools ──────────────────────────────────────────────────────────────

const GAME_PHRASES: Record<PhraseType, string[]> = {
  levelStart: [
    "Let's help our robot reach the star!",
    "Ready? Let's go!",
    "Time to code! What will you try?",
    "You've got this! Let's start!",
    "New level! I wonder which way to go…",
  ],
  correctMove: [
    'Great thinking!',
    'Nice move!',
    'Awesome!',
    'Well done!',
    'You are so smart!',
    'Perfect!',
    'Keep going!',
  ],
  wrongMove: [
    "Hmm… that path doesn't work.",
    'Oops! Try another way.',
    "That's not quite right — try again!",
    'Uh oh! Something is in the way.',
    "The robot is stuck! Let's fix the program.",
  ],
  victory: [
    'Fantastic! You did it!',
    'Great job! You are amazing!',
    'Woohoo! You reached the goal!',
    'You are a coding superstar!',
    'Yes! The robot made it! You rock!',
  ],
  encourage: [
    'You can do it!',
    'Try again — you are almost there!',
    "Don't give up! Keep going!",
    "That's okay! Try a different way!",
    'So close! One more try!',
  ],
};

// ── Legacy phrase pools (kept for backward compatibility) ─────────────────────

const PHRASES = {
  correct: [
    'Well done!',
    'Great job!',
    'Fantastic!',
    'You are amazing!',
    'Super star!',
    'Excellent work!',
    'Brilliant!',
  ],
  wrong: [
    'Oops! Try again!',
    'Almost! Give it another go!',
    'Keep going, you can do it!',
    "That's okay! Try again!",
    "Don't give up!",
    'You are almost there!',
  ],
  success: [
    'You did it! I am so proud of you!',
    'Woohoo! You are a superstar!',
    'Incredible! You are amazing!',
    'Well done! You finished!',
    'You are brilliant! Great job!',
    'Fantastic work! Keep it up!',
  ],
};

// ── Low-level API ─────────────────────────────────────────────────────────────

/**
 * Speak a phrase with an emotional tone.
 * Automatically stops any current speech before starting.
 */
export function speak(text: string, emotion: Emotion = 'happy'): void {
  const restore = () => { try { ambientService.unduck(); } catch {} };
  try {
    Speech.stop();
    const { pitch, rate } = EMOTION_MAP[emotion];
    ambientService.duck();
    Speech.speak(text, {
      pitch,
      rate,
      language:  'en-US',
      onDone:    restore,
      onStopped: restore,
      onError:   restore,
    });
  } catch { restore(); }
}

/** Stop any ongoing speech immediately. */
export function stopSpeaking(): void {
  try { Speech.stop(); } catch { /* silent */ }
}

/** Pick a random phrase from a legacy category. */
export function randomPhrase(type: keyof typeof PHRASES): string {
  const list = PHRASES[type];
  return list[Math.floor(Math.random() * list.length)];
}

// ── High-level game API ───────────────────────────────────────────────────────

/**
 * Speak a random context-aware robot personality phrase.
 *
 * Each PhraseType maps to an appropriate emotion so pitch and rate
 * automatically match the moment (excited for wins, calm for errors, etc.).
 *
 * @example
 *   speakPhrase('levelStart');   // "Ready? Let's go!" — happy tone
 *   speakPhrase('victory');      // "Fantastic! You did it!" — excited tone
 *   speakPhrase('wrongMove');    // "Oops! Try another way." — calm tone
 */
export function speakPhrase(type: PhraseType): void {
  const pool = GAME_PHRASES[type];
  const text = pool[Math.floor(Math.random() * pool.length)];

  const emotion: Emotion =
    type === 'levelStart'  ? 'happy'   :
    type === 'correctMove' ? 'excited' :
    type === 'wrongMove'   ? 'calm'    :
    type === 'victory'     ? 'excited' :
  /* encourage */             'happy';

  speak(text, emotion);
}
