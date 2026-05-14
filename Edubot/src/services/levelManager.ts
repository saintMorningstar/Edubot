/**
 * src/services/levelManager.ts
 *
 * Manages persistent Adventure Mode progress using AsyncStorage.
 *
 * Schema stored under key '@edubot:adventure_v1':
 *   { "1": { stars: 3, attempts: 4 }, "2": { stars: 2, attempts: 1 }, ... }
 *
 * Usage:
 *   import { loadAllProgress, saveLevelResult, getStars, isUnlocked }
 *     from '../services/levelManager';
 *
 *   const progress = await loadAllProgress();
 *   const stars    = getStars(2, progress);         // 0-3
 *   const ok       = isUnlocked(3, progress);       // true/false
 *   await saveLevelResult(2, 3);                     // levelId=2, 3 stars earned
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LevelProgress {
  /** Best star count achieved (0 = never completed, 1-3 = completed). */
  stars:    number;
  /** Total number of run attempts on this level. */
  attempts: number;
}

/** Map keyed by level ID (as string) for JSON compatibility. */
export type AdventureProgress = Record<string, LevelProgress>;

// ── Internal ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@edubot:adventure_v1';

// ── Load / Save ───────────────────────────────────────────────────────────────

/**
 * Load the full adventure progress from storage.
 * Returns an empty object when no data exists yet.
 */
export async function loadAllProgress(): Promise<AdventureProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AdventureProgress;
  } catch {
    return {};
  }
}

/**
 * Record the result of a level attempt.
 * Only updates if the new star count is higher (keeps personal best).
 *
 * @param levelId     The level that was played (1–6)
 * @param starsEarned Stars earned this run (1-3; use 0 only to record an attempt without a win)
 */
export async function saveLevelResult(
  levelId:     number,
  starsEarned: number,
): Promise<void> {
  try {
    const all = await loadAllProgress();
    const key = String(levelId);
    const cur = all[key] ?? { stars: 0, attempts: 0 };
    all[key] = {
      stars:    Math.max(cur.stars, starsEarned),
      attempts: cur.attempts + 1,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silent — missing storage never breaks the game */ }
}

// ── Query helpers (synchronous, need a pre-loaded progress map) ───────────────

/**
 * Return the best star count for a level (0-3).
 * 0 means the level has never been completed.
 */
export function getStars(levelId: number, progress: AdventureProgress): number {
  return progress[String(levelId)]?.stars ?? 0;
}

/**
 * A level is unlocked if:
 *  • It is level 1 (always open), or
 *  • The previous level has been completed with at least 1 star.
 */
export function isUnlocked(levelId: number, progress: AdventureProgress): boolean {
  if (levelId <= 1) return true;
  return (progress[String(levelId - 1)]?.stars ?? 0) >= 1;
}

/** Reset all adventure progress (useful for testing / parental reset). */
export async function resetAdventureProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch { /* silent */ }
}
