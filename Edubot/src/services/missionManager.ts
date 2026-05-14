/**
 * src/services/missionManager.ts
 *
 * Manages persistent Mission Mode progress using AsyncStorage.
 *
 * Mirrors the API of levelManager.ts so the two systems are consistent.
 *
 * Storage key:  '@edubot:missions_v1'
 * Schema:
 *   {
 *     "1": { completed: true,  stars: 3, attempts: 2 },
 *     "2": { completed: false, stars: 0, attempts: 1 },
 *     ...
 *   }
 *
 * Unlock rule:
 *   Mission 1 is always unlocked.
 *   Mission N unlocks once Mission N-1 has been completed (stars ≥ 1).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MISSIONS }  from '../data/missions';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MissionProgress {
  /** Whether the mission has been completed at least once. */
  completed: boolean;
  /** Best star count achieved (0 = never completed, 1–3 = completed). */
  stars:     number;
  /** Total number of run attempts. */
  attempts:  number;
}

/** Full progress map keyed by mission id (as string) for JSON compatibility. */
export type MissionsProgress = Record<string, MissionProgress>;

// ── Internal ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@edubot:missions_v1';

// ── Load / Save ───────────────────────────────────────────────────────────────

/**
 * Load the full mission progress from AsyncStorage.
 * Returns an empty object when no data exists yet.
 */
export async function loadAllMissionProgress(): Promise<MissionsProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MissionsProgress;
  } catch {
    return {};
  }
}

/**
 * Record the result of a mission attempt.
 * Only updates the star count if the new result is higher (keeps personal best).
 *
 * @param missionId   The mission that was played (1–N)
 * @param starsEarned Stars earned this run (0 = failed attempt, 1–3 = win)
 */
export async function saveMissionResult(
  missionId:   number,
  starsEarned: number,
): Promise<void> {
  try {
    const all = await loadAllMissionProgress();
    const key = String(missionId);
    const cur = all[key] ?? { completed: false, stars: 0, attempts: 0 };
    all[key] = {
      completed: cur.completed || starsEarned >= 1,
      stars:     Math.max(cur.stars, starsEarned),
      attempts:  cur.attempts + 1,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silent — never break the game */ }
}

// ── Query helpers (synchronous after pre-loading the progress map) ────────────

/**
 * Return the best star count for a mission (0–3).
 * 0 means the mission has never been completed.
 */
export function getMissionStars(
  missionId: number,
  progress:  MissionsProgress,
): number {
  return progress[String(missionId)]?.stars ?? 0;
}

/**
 * Returns true if the mission was completed at least once.
 */
export function isMissionCompleted(
  missionId: number,
  progress:  MissionsProgress,
): boolean {
  return progress[String(missionId)]?.completed ?? false;
}

/**
 * A mission is unlocked if:
 *  • It is Mission 1 (always open), or
 *  • The previous mission has been completed (stars ≥ 1).
 */
export function isMissionUnlocked(
  missionId: number,
  progress:  MissionsProgress,
): boolean {
  if (missionId <= 1) return true;
  return isMissionCompleted(missionId - 1, progress);
}

/**
 * Total stars earned across all missions.
 * Useful for driving skin unlocks or badges.
 */
export function getTotalMissionStars(progress: MissionsProgress): number {
  return MISSIONS.reduce(
    (sum, m) => sum + getMissionStars(m.id, progress),
    0,
  );
}

/** Reset all mission progress (useful for testing / parental reset). */
export async function resetMissionProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch { /* silent */ }
}
