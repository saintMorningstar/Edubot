/**
 * src/services/soundService.ts
 *
 * Lightweight singleton that pre-loads five sounds and lets any screen play
 * them with a single call.  All errors are swallowed so the app keeps
 * working even if a device has no audio hardware.
 *
 * Migrated from expo-av (deprecated in SDK 54) → expo-audio.
 *
 * API differences from the old expo-av version:
 *  • createAudioPlayer(source)  replaces  Audio.Sound.createAsync()
 *  • player.play()              replaces  sound.playAsync()
 *  • player.seekTo(seconds)     replaces  sound.setPositionAsync(ms)   ← note: seconds, not ms
 *  • player.remove()            replaces  sound.unloadAsync()
 *  • setAudioModeAsync()        replaces  Audio.setAudioModeAsync()
 *    option: playsInSilentMode  replaces  playsInSilentModeIOS
 *
 * Usage (unchanged from callers' perspective):
 *   import { soundService } from '../services/soundService';
 *   soundService.init();          // call once in root layout
 *   await soundService.play('correct');
 */

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

export type SoundName = 'correct' | 'wrong' | 'success' | 'tap' | 'celebration';

const SOUND_FILES: Record<SoundName, any> = {
  correct:     require('../../assets/sounds/correct.wav'),
  wrong:       require('../../assets/sounds/wrong.wav'),
  success:     require('../../assets/sounds/success.wav'),
  tap:         require('../../assets/sounds/tap.wav'),
  celebration: require('../../assets/sounds/celebration.wav'),
};

class SoundService {
  private players: Partial<Record<SoundName, AudioPlayer>> = {};
  private ready   = false;
  private loading = false;

  async init(): Promise<void> {
    if (this.ready || this.loading) return;
    this.loading = true;
    try {
      // Allow sounds to play while the device is on silent mode (iOS)
      await setAudioModeAsync({ playsInSilentMode: true });

      for (const [key, src] of Object.entries(SOUND_FILES) as [SoundName, any][]) {
        try {
          // createAudioPlayer is synchronous and starts buffering immediately
          const player  = createAudioPlayer(src);
          player.volume = 1;
          this.players[key] = player;
        } catch {
          // Individual file missing or unreadable – skip silently
        }
      }
      this.ready = true;
    } catch {
      // expo-audio unavailable on this device – silently degrade
    } finally {
      this.loading = false;
    }
  }

  async play(name: SoundName): Promise<void> {
    if (!this.ready) await this.init();
    try {
      const p = this.players[name];
      if (!p) return;
      // Seek back to the start before playing so rapid re-plays work correctly.
      // seekTo() takes seconds (not milliseconds) in expo-audio.
      await p.seekTo(0);
      p.play();
    } catch { /* silent */ }
  }

  dispose(): void {
    for (const p of Object.values(this.players)) {
      try { p?.remove(); } catch { /* silent */ }
    }
    this.players = {};
    this.ready   = false;
    this.loading = false;
  }
}

export const soundService = new SoundService();
