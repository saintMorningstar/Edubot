/**
 * src/components/game/GameBoard.tsx
 *
 * 5×5 grid rendered with flexbox.
 * The animated robot is overlaid using absolute positioning so it can
 * spring smoothly between cells without re-mounting.
 *
 * Cell types:
 *   empty    – plain light tile
 *   start    – green-tinted starting position
 *   goal     – yellow-tinted finish (🏁)
 *   star     – collectible star (⭐), hidden once collected
 *   obstacle – blocked rock tile (🚧), robot cannot enter
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LevelConfig, GRID_SIZE } from '../../services/commandEngine';
import { SkinId }                 from '../../services/robotSkinManager';
import RobotCharacter             from './RobotCharacter';

// ── Types ─────────────────────────────────────────────────────────────────────

type CellType = 'empty' | 'start' | 'goal' | 'star' | 'obstacle';

interface GameBoardProps {
  level:          LevelConfig;
  boardSize:      number;
  cellSize:       number;
  collectedStars: Set<string>;   // keys "row,col"
  robotPosX:      Animated.Value;
  robotPosY:      Animated.Value;
  robotRotation:  Animated.Value;
  robotScale:     Animated.Value;
  /** Which robot skin to display.  Defaults to 'blue'. */
  skinId?:        SkinId;
}

// ── Cell helpers ──────────────────────────────────────────────────────────────

function getCellType(
  row:       number,
  col:       number,
  level:     LevelConfig,
  collected: Set<string>,
): CellType {
  // Obstacles take precedence over everything else visually
  if (level.obstacles.some(o => o.row === row && o.col === col))      return 'obstacle';
  if (row === level.goal.row && col === level.goal.col)                return 'goal';
  if (row === level.robotStart.row && col === level.robotStart.col)    return 'start';
  if (
    level.stars.some(s => s.row === row && s.col === col) &&
    !collected.has(`${row},${col}`)
  )                                                                    return 'star';
  return 'empty';
}

const CELL_BG: Record<CellType, string> = {
  empty:    '#E8EAF6',
  start:    '#DCEDC8',
  goal:     '#FFF9C4',
  star:     '#EDE7F6',
  obstacle: '#90A4AE',   // slate-grey rock
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function GameBoard({
  level,
  boardSize,
  cellSize,
  collectedStars,
  robotPosX,
  robotPosY,
  robotRotation,
  robotScale,
  skinId = 'blue',
}: GameBoardProps) {
  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>

      {/* ── Grid rows ── */}
      {Array.from({ length: GRID_SIZE }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: GRID_SIZE }, (_, col) => {
            const type       = getCellType(row, col, level, collectedStars);
            const isGoal     = type === 'goal';
            const isStar     = type === 'star';
            const isStart    = type === 'start';
            const isObstacle = type === 'obstacle';

            return (
              <View
                key={col}
                style={[
                  styles.cell,
                  {
                    width:           cellSize,
                    height:          cellSize,
                    backgroundColor: CELL_BG[type],
                  },
                  // Subtle checkerboard tint on non-obstacle empty cells
                  type === 'empty' && (row + col) % 2 === 0 && styles.cellAlt,
                  // Extra shadow / inset for obstacle cells
                  isObstacle && styles.cellObstacle,
                ]}
              >
                {isGoal && (
                  <MaterialCommunityIcons name="flag-checkered" size={cellSize * 0.46} color="#1A2340" />
                )}
                {isStar && (
                  <Ionicons name="star" size={cellSize * 0.40} color="#FFD700" />
                )}
                {isStart && !isGoal && (
                  <Ionicons
                    name="location"
                    size={cellSize * 0.28}
                    color="rgba(76,175,80,0.45)"
                  />
                )}
                {isObstacle && (
                  <MaterialCommunityIcons name="alert-octagon-outline" size={cellSize * 0.38} color="#FF6B35" />
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* ── Animated robot overlay ── */}
      <RobotCharacter
        posX={robotPosX}
        posY={robotPosY}
        rotation={robotRotation}
        scale={robotScale}
        cellSize={cellSize}
        skinId={skinId}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  board: {
    overflow:        'hidden',
    borderRadius:    14,
    borderWidth:     3,
    borderColor:     '#9FA8DA',
    elevation:       6,
    shadowColor:     '#3F51B5',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.28,
    shadowRadius:    8,
    backgroundColor: '#E8EAF6',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    0.5,
    borderColor:    '#C5CAE9',
  },
  cellAlt: {
    backgroundColor: '#EEF0FA',
  },
  cellObstacle: {
    borderWidth:  1,
    borderColor:  '#607D8B',
    elevation:    2,
  },
});
