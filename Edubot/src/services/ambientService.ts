/**
 * src/services/ambientService.ts
 *
 * Soft ambient background audio for Edubot — designed for preschool children.
 *
 * Features:
 *  • Four themed soundscapes: home, learning, coding, sleep
 *  • Seamless looping at low volume (default 0.25)
 *  • Auto-duck when Edubot speaks (duck/unduck API)
 *  • Screen-aware context switching without touching saved preferences
 *  • Settings persist via storage.ts (enabled, volume, theme)
 *
 * Placeholder WAV files live in assets/sounds/ambient/.
 * Replace each .wav with real ambient audio to hear actual sound.
 * See assets/sounds/ambient/README.md for format guidelines.
 *
 * API:
 *   ambientService.init()                 — call once in root layout
 *   ambientService.setContext('learning') — switch theme for a screen
 *   ambientService.clearContext()         — restore saved theme on unmount
 *   ambientService.duck()                 — reduce volume during speech
 *   ambientService.unduck()               — restore volume after speech
 *   ambientService.setEnabled(bool)       — master on/off, persisted
 *   ambientService.setVolume(0–1)         — user volume, persisted
 *   ambientService.setTheme(theme)        — saved theme, persisted
 *   ambientService.getSettings()          — read current state
 */

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { loadAmbientSettings, saveAmbientSettings, AmbientSettingsData } from './storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AmbientTheme = 'home' | 'learning' | 'coding' | 'sleep';

export interface AmbientSettings {
  enabled: boolean;
  volume:  number;       // 0.0 – 1.0 (user-facing max)
  theme:   AmbientTheme;
}

// ── Theme audio sources ───────────────────────────────────────────────────────

const THEME_SOURCES: Record<AmbientTheme, any> = {
  home:     require('../../assets/sounds/ambient/home.wav'),
  learning: require('../../assets/sounds/ambient/learning.wav'),
  coding:   require('../../assets/sounds/ambient/coding.wav'),
  sleep:    require('../../assets/sounds/ambient/sleep.wav'),
};

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AmbientSettings = {
  enabled: true,
  volume:  0.25,
  theme:   'home',
};

const DUCK_FACTOR = 0.12; // duck to 12 % of user volume during speech

const VALID_THEMES = new Set<string>(['home', 'learning', 'coding', 'sleep']);

function toSettings(data: AmbientSettingsData): AmbientSettings {
  return {
    enabled: data.enabled,
    volume:  data.volume,
    theme:   VALID_THEMES.has(data.theme) ? (data.theme as AmbientTheme) : 'home',
  };
}

// ── Service class ─────────────────────────────────────────────────────────────

class AmbientService {
  private player:       AudioPlayer | null = null;
  private settings:     AmbientSettings    = { ...DEFAULT_SETTINGS };
  private activeTheme:  AmbientTheme       = 'home'; // may differ from settings.theme during context switch
  private ducks         = 0;               // reference-counted so rapid duck/unduck stays stable
  private ready         = false;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  init(): void {
    if (this.ready) return;
    try {
      this.settings    = toSettings(loadAmbientSettings());
      this.activeTheme = this.settings.theme;
      // Allow sound even when device is in silent mode (iOS)
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      this.ready = true;
      if (this.settings.enabled) {
        this._loadTheme(this.settings.theme);
      }
    } catch { /* graceful degradation — ambient is optional */ }
  }

  dispose(): void {
    this._releasePlayer();
    this.ready = false;
  }

  // ── Context switching (per-screen, not persisted) ────────────────────────────

  /** Temporarily switch the ambient theme for the current screen. */
  setContext(theme: AmbientTheme): void {
    if (!this.ready) return;
    this.activeTheme = theme;
    if (this.settings.enabled) {
      this._loadTheme(theme);
    }
  }

  /** Restore the user's saved ambient theme (call in screen's cleanup). */
  clearContext(): void {
    if (!this.ready) return;
    this.activeTheme = this.settings.theme;
    if (this.settings.enabled) {
      this._loadTheme(this.settings.theme);
    }
  }

  // ── Ducking ──────────────────────────────────────────────────────────────────

  /** Reduce ambient volume when Edubot or TTS starts speaking. */
  duck(): void {
    this.ducks++;
    if (this.ducks === 1 && this.player) {
      try { this.player.volume = this.settings.volume * DUCK_FACTOR; } catch {}
    }
  }

  /** Restore ambient volume when speech ends. */
  unduck(): void {
    this.ducks = Math.max(0, this.ducks - 1);
    if (this.ducks === 0 && this.player) {
      try { this.player.volume = this.settings.volume; } catch {}
    }
  }

  // ── Settings (persisted) ─────────────────────────────────────────────────────

  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    saveAmbientSettings(this.settings);
    if (enabled) {
      this._loadTheme(this.activeTheme);
    } else {
      this._releasePlayer();
    }
  }

  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    saveAmbientSettings(this.settings);
    if (this.player && this.ducks === 0) {
      try { this.player.volume = this.settings.volume; } catch {}
    }
  }

  /** Change the user's saved theme and start playing it immediately. */
  setTheme(theme: AmbientTheme): void {
    this.settings.theme  = theme;
    this.activeTheme     = theme;
    saveAmbientSettings(this.settings);
    if (this.settings.enabled) {
      this._loadTheme(theme);
    }
  }

  getSettings(): AmbientSettings {
    return { ...this.settings };
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  private _loadTheme(theme: AmbientTheme): void {
    this._releasePlayer();
    try {
      const source     = THEME_SOURCES[theme];
      this.player      = createAudioPlayer(source);
      this.player.loop = true;
      this.player.volume =
        this.ducks > 0
          ? this.settings.volume * DUCK_FACTOR
          : this.settings.volume;
      this.player.play();
    } catch { /* file unreadable or device has no audio — silent fallback */ }
  }

  private _releasePlayer(): void {
    if (!this.player) return;
    try {
      this.player.pause();
      this.player.remove();
    } catch {}
    this.player = null;
  }
}

export const ambientService = new AmbientService();
