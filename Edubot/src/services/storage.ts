

import * as SQLite from 'expo-sqlite';


let _db: SQLite.SQLiteDatabase | null = null;

function getDB(): SQLite.SQLiteDatabase {
  if (_db) return _db;
  _db = SQLite.openDatabaseSync('edubot.db');
  
  _db.execSync(`
    CREATE TABLE IF NOT EXISTS kv (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  return _db;
}


function kvGet(key: string): string | null {
  try {
    const row = getDB().getFirstSync<{ value: string }>(
      'SELECT value FROM kv WHERE key = ?',
      key,
    );
    return row ? row.value : null;
  } catch (e) {
    console.error('[Storage] kvGet failed:', e);
    return null;
  }
}


function kvSet(key: string, value: string): void {
  try {
    getDB().runSync(
      'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)',
      key,
      value,
    );
  } catch (e) {
    console.error('[Storage] kvSet failed:', e);
  }
}



const KEYS = {
  ROBOT_IP: '@edubot:robot_ip',
  PROGRESS: '@edubot:progress',
  AMBIENT:  '@edubot:ambient',
} as const;



export interface ActivityRecord {
  completed: number;
  correct:   number;
  timeSpent: number;
}

export interface ProgressData {
  colors:  ActivityRecord;
  numbers: ActivityRecord;
  shapes:  ActivityRecord;
  coding:  ActivityRecord;
}

const DEFAULT_RECORD: ActivityRecord = { completed: 0, correct: 0, timeSpent: 0 };

const DEFAULT_PROGRESS: ProgressData = {
  colors:  { ...DEFAULT_RECORD },
  numbers: { ...DEFAULT_RECORD },
  shapes:  { ...DEFAULT_RECORD },
  coding:  { ...DEFAULT_RECORD },
};


export function saveRobotIP(ip: string): void {
  kvSet(KEYS.ROBOT_IP, ip);
}

export function loadRobotIP(): string | null {
  return kvGet(KEYS.ROBOT_IP);
}


export function loadProgress(): ProgressData {
  try {
    const raw = kvGet(KEYS.PROGRESS);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<ProgressData>;
      return { ...DEFAULT_PROGRESS, ...stored };
    }
    return { ...DEFAULT_PROGRESS };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}


export function saveProgress(progress: ProgressData): void {
  kvSet(KEYS.PROGRESS, JSON.stringify(progress));
}

/**
 * Record the result of one activity attempt and save immediately.
 *
 * @param activity  One of 'colors' | 'numbers' | 'shapes' | 'coding'
 * @param correct   Whether the child answered correctly
 * @param timeSpent Seconds spent on this attempt
 * @returns Updated ProgressData
 */
export function updateActivityProgress(
  activity: keyof ProgressData,
  correct:   boolean,
  timeSpent: number,
): ProgressData {
  const progress = loadProgress();
  const current  = progress[activity];

  progress[activity] = {
    completed: current.completed + 1,
    correct:   current.correct + (correct ? 1 : 0),
    timeSpent: current.timeSpent + timeSpent,
  };

  saveProgress(progress);
  return progress;
}


export function resetProgress(): void {
  saveProgress({
    colors:  { ...DEFAULT_RECORD },
    numbers: { ...DEFAULT_RECORD },
    shapes:  { ...DEFAULT_RECORD },
    coding:  { ...DEFAULT_RECORD },
  });
}

// ── Ambient settings ──────────────────────────────────────────────────────────

export interface AmbientSettingsData {
  enabled: boolean;
  volume:  number;   // 0.0 – 1.0
  theme:   string;   // AmbientTheme — typed as string to avoid circular import
}

const DEFAULT_AMBIENT: AmbientSettingsData = {
  enabled: true,
  volume:  0.25,
  theme:   'home',
};

export function loadAmbientSettings(): AmbientSettingsData {
  try {
    const raw = kvGet(KEYS.AMBIENT);
    if (raw) return { ...DEFAULT_AMBIENT, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_AMBIENT };
}

export function saveAmbientSettings(s: AmbientSettingsData): void {
  try { kvSet(KEYS.AMBIENT, JSON.stringify(s)); } catch {}
}
