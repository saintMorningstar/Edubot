/**
 * helpers.ts
 * Reusable utility functions for Edubot.
 */

/**
 * Returns a random element from an array.
 */
export function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns a new shuffled copy of an array (Fisher–Yates).
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Formats a duration in seconds to a human-readable string.
 * e.g. 150 → "2m 30s"
 */
export function formatTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 1) return '0s';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Basic IPv4 address format validation.
 */
export function isValidIP(ip: string): boolean {
  if (!ip) return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && String(num) === part;
  });
}

/**
 * Builds a quiz choice array: 1 correct answer + 3 random wrong answers, shuffled.
 */
export function generateChoices<T>(correct: T, pool: readonly T[]): T[] {
  const wrongs = shuffle(pool.filter((item) => item !== correct)).slice(0, 3);
  return shuffle([correct, ...wrongs]);
}

/**
 * Calculates accuracy percentage (0–100) given completed and correct counts.
 */
export function calcAccuracy(completed: number, correct: number): number {
  if (completed === 0) return 0;
  return Math.round((correct / completed) * 100);
}
