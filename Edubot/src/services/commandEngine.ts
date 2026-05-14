/**
 * src/services/commandEngine.ts
 *
 * Pure game logic for the Robot Programming Game — no UI, no side-effects.
 *
 * Exports:
 *  • LevelConfig  – grid layout, robot start, goal, stars, obstacles
 *  • LEVELS       – all 6 built-in levels (2 worlds, 3 levels each)
 *  • FREE_PLAY_LEVEL – special open-ended level for Free Play Mode
 *  • COMMAND_CONFIGS – visual metadata consumed by CommandBlock / Queue
 *  • executeCommand  – pure step logic (handles grid bounds + obstacles)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type Direction   = 'up' | 'down' | 'left' | 'right';
export type CommandType = 'forward' | 'turn_left' | 'turn_right' | 'grab';

export interface RobotState {
  row:       number;
  col:       number;
  direction: Direction;
}

export interface StarPos {
  row: number;
  col: number;
}

export interface ObstaclePos {
  row: number;
  col: number;
}

export interface LevelConfig {
  id:          number;
  /** 1 = Forest World, 2 = Desert World, 0 = Free Play */
  worldId:     number;
  title:       string;
  emoji:       string;
  hint:        string;
  robotStart:  { row: number; col: number };
  robotDir:    Direction;
  /** Destination cell the robot must reach to win */
  goal:        { row: number; col: number };
  /** Collectible star cells */
  stars:       StarPos[];
  /** Blocked cells — robot cannot enter these */
  obstacles:   ObstaclePos[];
  /** Maximum allowed commands (shown as queue capacity) */
  maxCommands: number;
}

export interface CommandConfig {
  label: string;
  emoji: string;
  color: string;   // block background colour
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const GRID_SIZE = 5;

/** Visual config consumed by CommandBlock and CommandQueue. */
export const COMMAND_CONFIGS: Record<CommandType, CommandConfig> = {
  forward:    { label: 'Forward',    emoji: '⬆️', color: '#1E88E5' },
  turn_left:  { label: 'Turn Left',  emoji: '↰',  color: '#43A047' },
  turn_right: { label: 'Turn Right', emoji: '↱',  color: '#FB8C00' },
  grab:       { label: 'Grab',       emoji: '🤏', color: '#8E24AA' },
};

/** Maps a direction to its cumulative rotation degrees (sprite faces UP at 0°). */
export const DIRECTION_DEGREES: Record<Direction, number> = {
  up:    0,
  right: 90,
  down:  180,
  left:  270,
};

// ── Built-in levels ───────────────────────────────────────────────────────────

export const LEVELS: LevelConfig[] = [

  // ════════════════════════════════
  //  WORLD 1 — Forest World  🌲
  // ════════════════════════════════

  {
    id:          1,
    worldId:     1,
    title:       'Go Straight!',
    emoji:       '🚀',
    hint:        'Press ⬆️ Forward 3 times to reach the flag!',
    robotStart:  { row: 2, col: 0 },
    robotDir:    'right',
    goal:        { row: 2, col: 3 },
    stars:       [{ row: 2, col: 1 }, { row: 2, col: 2 }],
    obstacles:   [],
    maxCommands: 6,
  },

  {
    id:          2,
    worldId:     1,
    title:       'Make a Turn!',
    emoji:       '🔄',
    hint:        'Go forward, turn up, then go to the flag!',
    robotStart:  { row: 4, col: 0 },
    robotDir:    'right',
    goal:        { row: 2, col: 2 },
    stars:       [{ row: 4, col: 2 }],
    obstacles:   [],
    maxCommands: 8,
  },

  {
    id:          3,
    worldId:     1,
    title:       'Zig Zag!',
    emoji:       '⚡',
    hint:        'Go forward, then turn, then forward again!',
    robotStart:  { row: 0, col: 0 },
    robotDir:    'right',
    goal:        { row: 4, col: 4 },
    stars:       [{ row: 0, col: 2 }, { row: 2, col: 4 }],
    obstacles:   [],
    maxCommands: 12,
  },

  // ════════════════════════════════
  //  WORLD 2 — Desert World  🏜️
  // ════════════════════════════════

  {
    id:          4,
    worldId:     2,
    title:       'Star Hunter!',
    emoji:       '⭐',
    hint:        'Collect all the stars, then reach the flag!',
    robotStart:  { row: 0, col: 0 },
    robotDir:    'right',
    goal:        { row: 4, col: 4 },
    stars:       [
      { row: 0, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 4 },
      { row: 4, col: 2 },
    ],
    obstacles:   [],
    maxCommands: 18,
  },

  {
    id:          5,
    worldId:     2,
    title:       'Dodge It!',
    emoji:       '🚧',
    hint:        'Rocks ahead! Go around them to the flag.',
    robotStart:  { row: 0, col: 0 },
    robotDir:    'right',
    goal:        { row: 4, col: 4 },
    stars:       [{ row: 0, col: 4 }, { row: 4, col: 0 }],
    obstacles:   [
      { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
      { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 },
    ],
    maxCommands: 20,
  },

  {
    id:          6,
    worldId:     2,
    title:       'Grab & Go!',
    emoji:       '🤏',
    hint:        'Grab the treasure ⭐, then go to the flag!',
    robotStart:  { row: 2, col: 0 },
    robotDir:    'right',
    goal:        { row: 2, col: 4 },
    stars:       [{ row: 2, col: 2 }],
    obstacles:   [
      { row: 0, col: 2 }, { row: 1, col: 2 },
      { row: 3, col: 2 }, { row: 4, col: 2 },
    ],
    maxCommands: 10,
  },
];

/**
 * Special level used when Free Play Mode is active.
 * Has no goal, no obstacles, unlimited commands — just exploration.
 */
export const FREE_PLAY_LEVEL: LevelConfig = {
  id:          0,
  worldId:     0,
  title:       'Free Play',
  emoji:       '🎮',
  hint:        'Explore freely! No rules, just fun!',
  robotStart:  { row: 2, col: 2 },
  robotDir:    'up',
  goal:        { row: -1, col: -1 },  // sentinel — no win condition
  stars:       [],
  obstacles:   [],
  maxCommands: 99,
};

// ── Movement tables ───────────────────────────────────────────────────────────

const DELTA: Record<Direction, { dr: number; dc: number }> = {
  up:    { dr: -1, dc:  0 },
  down:  { dr:  1, dc:  0 },
  left:  { dr:  0, dc: -1 },
  right: { dr:  0, dc:  1 },
};

const TURN_L: Record<Direction, Direction> = {
  up: 'left', left: 'down', down: 'right', right: 'up',
};

const TURN_R: Record<Direction, Direction> = {
  up: 'right', right: 'down', down: 'left', left: 'up',
};

// ── Core logic ────────────────────────────────────────────────────────────────

/**
 * Execute one command and return the resulting robot state.
 *
 * `hitWall` is true when a forward move would leave the grid boundary
 * OR enter an obstacle cell.  In that case the robot stays in place.
 */
export function executeCommand(
  state:     RobotState,
  cmd:       CommandType,
  gridSize:  number        = GRID_SIZE,
  obstacles: ObstaclePos[] = [],
): { newState: RobotState; hitWall: boolean } {
  switch (cmd) {
    case 'forward': {
      const { dr, dc } = DELTA[state.direction];
      const r = state.row + dr;
      const c = state.col + dc;
      const outOfBounds  = r < 0 || r >= gridSize || c < 0 || c >= gridSize;
      const hitsObstacle = obstacles.some(o => o.row === r && o.col === c);
      const hitWall      = outOfBounds || hitsObstacle;
      return {
        newState: hitWall ? state : { ...state, row: r, col: c },
        hitWall,
      };
    }
    case 'turn_left':
      return { newState: { ...state, direction: TURN_L[state.direction] }, hitWall: false };
    case 'turn_right':
      return { newState: { ...state, direction: TURN_R[state.direction] }, hitWall: false };
    case 'grab':
      // Position unchanged — robot-game.tsx checks the cell for collectibles.
      return { newState: state, hitWall: false };
  }
}
