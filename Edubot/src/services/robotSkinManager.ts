/**
 * src/services/robotSkinManager.ts
 *
 * Manages robot skin selection and AsyncStorage persistence.
 *
 * Skins unlock as the player earns total stars across ALL adventure levels:
 *
 *   🔵 Blue    →  default  (0 ⭐  — always available)
 *   🔴 Red     →  10 ⭐
 *   🟢 Green   →  20 ⭐
 *   🌈 Rainbow →  30 ⭐  (animated gradient cycling)
 *
 * Usage:
 *   const total    = await getTotalStars();
 *   const unlocked = getUnlockedSkins(total);      // ['blue', 'red']
 *   const current  = await getCurrentSkin();       // 'blue'
 *   await setCurrentSkin('red');
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAllProgress } from './levelManager';
import { LEVELS }          from './commandEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkinId = 'blue' | 'red' | 'green' | 'rainbow';

export interface SkinConfig {
  id:            SkinId;
  name:          string;
  emoji:         string;
  /** Hex colour used for the robot body, or 'rainbow' for the animated skin. */
  color:         string;
  /** Colour used for the drop-shadow (always a static hex). */
  shadowColor:   string;
  /** Minimum total stars needed to unlock this skin. */
  starsRequired: number;
  description:   string;
}

// ── Skin catalogue ────────────────────────────────────────────────────────────

export const SKINS: SkinConfig[] = [
  {
    id:            'blue',
    name:          'Blue Robot',
    emoji:         '🤖',
    color:         '#6C63FF',
    shadowColor:   '#6C63FF',
    starsRequired: 0,
    description:   'Your trusty starter robot!',
  },
  {
    id:            'red',
    name:          'Red Robot',
    emoji:         '🤖',
    color:         '#E53935',
    shadowColor:   '#C62828',
    starsRequired: 10,
    description:   'Blazing fast and bold!',
  },
  {
    id:            'green',
    name:          'Green Robot',
    emoji:         '🤖',
    color:         '#2E7D32',
    shadowColor:   '#1B5E20',
    starsRequired: 20,
    description:   'Nature-loving explorer!',
  },
  {
    id:            'rainbow',
    name:          'Rainbow Robot',
    emoji:         '🌈',
    color:         'rainbow',     // sentinel — component handles animation
    shadowColor:   '#9C27B0',
    starsRequired: 30,
    description:   'Master of all colours!',
  },
];

/**
 * Static body colours consumed by RobotCharacter and skin preview components.
 * The 'rainbow' entry is used only as a CSS fallback; the component replaces
 * it with an animated Animated.Value interpolation.
 */
export const SKIN_BODY_COLORS: Record<SkinId, string> = {
  blue:    '#6C63FF',
  red:     '#E53935',
  green:   '#2E7D32',
  rainbow: '#FF6B6B',   // fallback / starting hue
};

/**
 * The full rainbow hue cycle used by both RobotCharacter and preview widgets.
 * Animate a value 0 → 1 and interpolate into these stops.
 */
export const RAINBOW_COLORS = [
  '#FF6B6B', // red-orange
  '#FFD93D', // yellow
  '#6BCB77', // green
  '#4D96FF', // blue
  '#CC5DE8', // purple
  '#FF61A6', // pink
  '#FF6B6B', // back to start for seamless loop
];

// ── Storage ───────────────────────────────────────────────────────────────────

const SKIN_KEY = '@edubot:current_skin_v1';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the player's total stars by summing every level's best score.
 * Reads the progress map written by levelManager.
 */
export async function getTotalStars(): Promise<number> {
  const progress = await loadAllProgress();
  return LEVELS.reduce(
    (sum, l) => sum + (progress[String(l.id)]?.stars ?? 0),
    0,
  );
}

/**
 * Return all skin IDs the player has earned access to, given their
 * total star count.  Always includes 'blue'.
 */
export function getUnlockedSkins(totalStars: number): SkinId[] {
  return SKINS
    .filter(s => totalStars >= s.starsRequired)
    .map(s => s.id);
}

/**
 * Load the player's current skin choice from AsyncStorage.
 * Falls back to 'blue' if nothing is stored or the stored value is invalid.
 */
export async function getCurrentSkin(): Promise<SkinId> {
  try {
    const stored = await AsyncStorage.getItem(SKIN_KEY);
    if (stored && SKINS.some(s => s.id === stored)) return stored as SkinId;
  } catch { /* silent — always return default */ }
  return 'blue';
}

/**
 * Persist the player's chosen skin to AsyncStorage.
 * Call this whenever the player taps a skin in the customisation screen.
 */
export async function setCurrentSkin(skinId: SkinId): Promise<void> {
  try {
    await AsyncStorage.setItem(SKIN_KEY, skinId);
  } catch { /* silent */ }
}

/** Convenience: look up a SkinConfig by ID (falls back to blue). */
export function getSkinConfig(skinId: SkinId): SkinConfig {
  return SKINS.find(s => s.id === skinId) ?? SKINS[0];
}
