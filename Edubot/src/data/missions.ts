/**
 * src/data/missions.ts
 *
 * Mission Mode data for Edubot — story-driven puzzles for children aged 1–5.
 *
 * Each MissionConfig contains:
 *  • Story metadata  – title, emoji, description, narration strings
 *  • Grid config     – matches the LevelConfig shape so robot-game.tsx can
 *                      use it directly without any engine changes
 *
 * Mission unlock rule (enforced in missionManager.ts):
 *  Mission 1 is always unlocked; Mission N unlocks after completing Mission N−1.
 *
 * Grid conventions (shared with commandEngine.ts):
 *  • 5×5 grid (rows 0–4, cols 0–4)
 *  • Direction: 'up' | 'down' | 'left' | 'right'
 *  • robotDir facing right means Forward moves the robot +col
 *  • Obstacles are impassable cells; stars are collectible cells
 *
 * Verified solution paths are documented below each mission.
 */

import { Direction, StarPos, ObstaclePos } from '../services/commandEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Full mission definition.
 * The grid fields (robotStart → maxCommands) are intentionally identical
 * to LevelConfig so robot-game.tsx can build a LevelConfig from them
 * without any extra transformation beyond renaming id → 100+id.
 */
export interface MissionConfig {
  /** Unique mission identifier (1–N). */
  id: number;
  /** Short display title shown on cards and in the game header. */
  title: string;
  /** Single emoji representing the mission theme. */
  emoji: string;
  /** One-line teaser shown on the mission selection card. */
  description: string;
  /** Robot narration spoken at mission start (also shown in the story dialog). */
  story: string;
  /** Narration spoken when the player wins. */
  successNarration: string;
  /** Narration spoken when the program fails to reach the goal. */
  failNarration: string;
  /** Hint shown in the yellow hint bar inside the game. */
  hint: string;
  /** Accent colour for the mission card (hex string). */
  accentColor: string;

  // ── Grid config (mirrors LevelConfig) ──────────────────────────────────────
  robotStart:  { row: number; col: number };
  robotDir:    Direction;
  goal:        { row: number; col: number };
  stars:       StarPos[];
  obstacles:   ObstaclePos[];
  /** Maximum commands the player may queue. */
  maxCommands: number;
}

// ── Mission list ──────────────────────────────────────────────────────────────

export const MISSIONS: MissionConfig[] = [

  // ══════════════════════════════════════════════════════════════
  //  Mission 1 – Find the Star  ⭐
  //  Difficulty: Beginner (straight line, no obstacles)
  //
  //  Grid:
  //    [R][ ][★][ ][🏁]   row 0
  //    [ ][ ][ ][ ][ ]
  //    [ ][ ][ ][ ][ ]
  //    [ ][ ][ ][ ][ ]
  //    [ ][ ][ ][ ][ ]
  //
  //  Solution: forward × 4   (4 commands)
  // ══════════════════════════════════════════════════════════════
  {
    id:          1,
    title:       'Find the Star',
    emoji:       '⭐',
    description: 'Help the robot find a shiny star hiding in the forest!',
    story:       'Oh no! A shiny star fell in the forest. Can you help me reach it?',
    successNarration: 'You found the star! Thank you so much, my friend!',
    failNarration:    "Hmm, that path doesn't work. Let's try again!",
    hint:        'Move forward to collect the star and reach the flag!',
    accentColor: '#FFD700',

    robotStart:  { row: 0, col: 0 },
    robotDir:    'right',
    goal:        { row: 0, col: 4 },
    stars:       [{ row: 0, col: 2 }],
    obstacles:   [],
    maxCommands: 8,
  },

  // ══════════════════════════════════════════════════════════════
  //  Mission 2 – Rescue the Lost Toy  🧸
  //  Difficulty: Easy (turn required, one obstacle row)
  //
  //  Grid:
  //    [R][ ][★][ ][ ]   row 0
  //    [ ][🪨][🪨][🪨][ ]  row 1  (obstacles)
  //    [ ][ ][ ][ ][🏁]  row 2
  //    [ ][ ][ ][ ][ ]
  //    [ ][ ][ ][ ][ ]
  //
  //  Solution: forward × 4, turn_right, forward × 2   (7 commands)
  // ══════════════════════════════════════════════════════════════
  {
    id:          2,
    title:       'Rescue the Lost Toy',
    emoji:       '🧸',
    description: 'A teddy bear is lost! Help the robot bring it safely home.',
    story:       "Oh dear! My favourite toy is lost. Can you help me find it and bring it back?",
    successNarration: 'Hooray! You rescued the toy! You are so kind!',
    failNarration:    "The toy is still lost. Let's try a different path!",
    hint:        'Collect the toy, then turn down to reach the goal!',
    accentColor: '#FF6B6B',

    robotStart:  { row: 0, col: 0 },
    robotDir:    'right',
    goal:        { row: 2, col: 4 },
    stars:       [{ row: 0, col: 2 }],
    obstacles:   [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
    ],
    maxCommands: 10,
  },

  // ══════════════════════════════════════════════════════════════
  //  Mission 3 – Collect Energy Crystals  💎
  //  Difficulty: Easy (straight line, 3 crystals)
  //
  //  Grid:
  //    [ ][ ][ ][ ][ ]   row 0
  //    [ ][ ][ ][ ][ ]   row 1
  //    [R][💎][💎][💎][🏁]  row 2  ← robot collects all crystals
  //    [ ][ ][ ][ ][ ]   row 3
  //    [ ][ ][ ][ ][ ]   row 4
  //
  //  Solution: forward × 4   (4 commands, all 3 stars auto-collected)
  // ══════════════════════════════════════════════════════════════
  {
    id:          3,
    title:       'Collect Energy Crystals',
    emoji:       '💎',
    description: 'Three energy crystals need collecting to power up the robot!',
    story:       'My energy is running low! Three crystals are lined up in a row. Can you help me collect them all?',
    successNarration: 'All crystals collected! I am fully charged now! Amazing!',
    failNarration:    "I still need more energy! Let's find those crystals again!",
    hint:        'Move forward — the crystals are all in a row!',
    accentColor: '#4FC3F7',

    robotStart:  { row: 2, col: 0 },
    robotDir:    'right',
    goal:        { row: 2, col: 4 },
    stars:       [
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ],
    obstacles:   [],
    maxCommands: 6,
  },

  // ══════════════════════════════════════════════════════════════
  //  Mission 4 – Cross the Bridge  🌉
  //  Difficulty: Medium (corridor puzzle, obstacles on both sides)
  //
  //  Grid (X = obstacle, path goes straight down col 2):
  //    [ ][ ][R][ ][ ]   row 0  ← robot faces down
  //    [X][X][ ][X][X]   row 1
  //    [X][X][★][X][X]   row 2
  //    [X][X][ ][X][X]   row 3
  //    [ ][ ][🏁][ ][ ]  row 4
  //
  //  Solution: forward × 4   (4 commands, star collected mid-bridge)
  // ══════════════════════════════════════════════════════════════
  {
    id:          4,
    title:       'Cross the Bridge',
    emoji:       '🌉',
    description: 'There is a narrow bridge ahead — only one path leads across!',
    story:       'There is a narrow bridge ahead. Only one path leads safely across! Can you guide me?',
    successNarration: 'You crossed the bridge! What a brave little adventurer!',
    failNarration:    "Watch out for the edges! Let's try the bridge again!",
    hint:        'The bridge is straight — go forward all the way!',
    accentColor: '#81C784',

    robotStart:  { row: 0, col: 2 },
    robotDir:    'down',
    goal:        { row: 4, col: 2 },
    stars:       [{ row: 2, col: 2 }],
    obstacles:   [
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 3 }, { row: 1, col: 4 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 2, col: 4 },
      { row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 3 }, { row: 3, col: 4 },
    ],
    maxCommands: 6,
  },

  // ══════════════════════════════════════════════════════════════
  //  Mission 5 – Deliver the Gift  🎁
  //  Difficulty: Medium (multiple turns, star detour)
  //
  //  Grid (X = obstacle, ★ = gift/star):
  //    [ ][ ][ ][ ][🏁]  row 0
  //    [ ][X][ ][ ][ ]   row 1
  //    [ ][ ][★][ ][ ]   row 2  ← grab the gift here!
  //    [ ][ ][ ][X][ ]   row 3
  //    [R][ ][ ][ ][ ]   row 4  ← robot faces up
  //
  //  Solution (10 cmds):
  //    forward×2 → [2,0]
  //    turn_right → facing right
  //    forward×2 → [2,2] ★ collected
  //    turn_left  → facing up
  //    forward×2 → [0,2]
  //    turn_right → facing right
  //    forward×2 → [0,4] 🏁
  // ══════════════════════════════════════════════════════════════
  {
    id:          5,
    title:       'Deliver the Gift',
    emoji:       '🎁',
    description: "It's your friend's birthday! Navigate to deliver the gift in time!",
    story:       "It's your friend's birthday! I have a special gift to deliver. Can you help me find the way through the forest?",
    successNarration: 'Gift delivered! Your friend is so happy! You are a wonderful helper!',
    failNarration:    "The gift is not delivered yet! Let's try a different route!",
    hint:        'Pick up the gift, then find the path to your friend!',
    accentColor: '#FF8A65',

    robotStart:  { row: 4, col: 0 },
    robotDir:    'up',
    goal:        { row: 0, col: 4 },
    stars:       [{ row: 2, col: 2 }],
    obstacles:   [
      { row: 1, col: 1 },
      { row: 3, col: 3 },
    ],
    maxCommands: 12,
  },

];
