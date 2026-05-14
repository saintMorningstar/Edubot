/**
 * src/components/game/RobotCharacter.tsx
 *
 * Animated robot sprite rendered inside the GameBoard.
 * Position is driven by translateX / translateY Animated.Values so the
 * parent (robot-game.tsx) can spring/time-animate it to any grid cell.
 *
 * Animations (all use useNativeDriver: true — transforms only):
 *  • Continuous idle bounce  (±4 px vertical sine)
 *  • Move    → spring translateX / translateY from parent
 *  • Rotate  → smooth rotation from parent
 *  • Squish  → scale Animated.Value from parent (wall-hit / grab)
 *
 * Skin system (skinId prop):
 *  • blue    → solid #6C63FF         (default)
 *  • red     → solid #E53935
 *  • green   → solid #2E7D32
 *  • rainbow → animated color cycle  (useNativeDriver: FALSE for backgroundColor)
 *
 * NOTE: backgroundColor animation is driven on the JS thread independently of
 * the transform animations that run on the native thread.  React Native supports
 * this — each style property chooses its own driver.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  SkinId,
  SKIN_BODY_COLORS,
  RAINBOW_COLORS,
} from '../../services/robotSkinManager';

// ── Props ─────────────────────────────────────────────────────────────────────

interface RobotCharacterProps {
  /** Absolute X pixel offset from grid top-left corner (= col × cellSize). */
  posX:     Animated.Value;
  /** Absolute Y pixel offset from grid top-left corner (= row × cellSize). */
  posY:     Animated.Value;
  /**
   * Cumulative rotation in degrees.
   * Sprite faces UP at 0°; right = 90°, down = 180°, left = 270°.
   * Parent accumulates turns so shortest-path interpolation is always correct.
   */
  rotation: Animated.Value;
  /** Scale — normally 1.0; parent sets >1 for squish/bounce effects. */
  scale:    Animated.Value;
  /** Size of one grid cell in pixels. */
  cellSize: number;
  /** Which skin to render.  Defaults to 'blue'. */
  skinId?:  SkinId;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RobotCharacter({
  posX,
  posY,
  rotation,
  scale,
  cellSize,
  skinId = 'blue',
}: RobotCharacterProps) {
  const robotSize = Math.round(cellSize * 0.76);
  const padding   = (cellSize - robotSize) / 2;

  // ── Idle bounce (native driver) ──────────────────────────────────────────
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -4, duration: 480, useNativeDriver: true }),
        Animated.timing(bounce, { toValue:  0, duration: 480, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Rainbow color cycle (JS driver, backgroundColor only) ───────────────
  const rainbowAnim      = useRef(new Animated.Value(0)).current;
  const rainbowLoopRef   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (skinId === 'rainbow') {
      rainbowAnim.setValue(0);
      rainbowLoopRef.current = Animated.loop(
        Animated.timing(rainbowAnim, {
          toValue:         1,
          duration:        2200,
          useNativeDriver: false,   // backgroundColor MUST use JS thread
        }),
      );
      rainbowLoopRef.current.start();
    } else {
      rainbowLoopRef.current?.stop();
      rainbowAnim.setValue(0);
    }
    return () => {
      rainbowLoopRef.current?.stop();
    };
  }, [skinId]);

  // Interpolate 0→1 into the rainbow hue stops
  const rainbowBodyColor = rainbowAnim.interpolate({
    inputRange:  RAINBOW_COLORS.map((_, i) => i / (RAINBOW_COLORS.length - 1)),
    outputRange: RAINBOW_COLORS,
  });

  // ── Body colour: animated for rainbow, static for other skins ───────────
  const bodyBgColor: Animated.WithAnimatedValue<string> | string =
    skinId === 'rainbow'
      ? (rainbowBodyColor as unknown as string)
      : SKIN_BODY_COLORS[skinId];

  // ── Shadow colour matches skin ────────────────────────────────────────────
  const shadowColor =
    skinId === 'rainbow' ? '#9C27B0' : SKIN_BODY_COLORS[skinId];

  // ── Cumulative rotation string ───────────────────────────────────────────
  const rotateStr = rotation.interpolate({
    inputRange:  [-7200, 7200],
    outputRange: ['-7200deg', '7200deg'],
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    /*
     * Outer view: pinned to (0,0) inside the grid container.
     * translateX / translateY move it to the correct cell (native driver).
     */
    <Animated.View
      style={{
        position:  'absolute',
        top:       0,
        left:      0,
        width:     cellSize,
        height:    cellSize,
        zIndex:    20,
        transform: [{ translateX: posX }, { translateY: posY }],
      }}
    >
      {/*
       * Inner body:
       *   – rotation, scale, bounce  → native driver  (transforms)
       *   – backgroundColor          → JS driver       (animated only for rainbow)
       */}
      <Animated.View
        style={[
          styles.body,
          {
            width:        robotSize,
            height:       robotSize,
            borderRadius: robotSize / 2,
            margin:       padding,
            backgroundColor: bodyBgColor as any,
            shadowColor,
            transform: [
              { rotate:     rotateStr },
              { scale },
              { translateY: bounce },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="robot-happy"
          size={Math.round(robotSize * 0.70)}
          color="#FFFFFF"
        />

        {/* Gold direction-indicator dot at the top of the sprite */}
        <Animated.View
          style={[
            styles.dirDot,
            {
              width:        robotSize * 0.16,
              height:       robotSize * 0.16,
              borderRadius: robotSize * 0.08,
            },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  body: {
    alignItems:     'center',
    justifyContent: 'center',
    // backgroundColor is set dynamically above (skin-dependent)
    elevation:      10,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.55,
    shadowRadius:   8,
  },
  dirDot: {
    position:        'absolute',
    top:             6,
    backgroundColor: '#FFD700',
    elevation:       12,
  },
});
