/**
 * src/components/game/CommandBlock.tsx
 *
 * A single tappable command block — used in both the palette (large)
 * and the program queue (small).  The currently-executing step is
 * highlighted with a gold border and glow.
 */

import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { CommandType, COMMAND_CONFIGS } from '../../services/commandEngine';

interface CommandBlockProps {
  type:      CommandType;
  size:      number;        // width = height of the square block
  onPress:   () => void;
  isActive?: boolean;       // true when this step is being executed
  inQueue?:  boolean;       // smaller label treatment inside the queue
  disabled?: boolean;
}

export default function CommandBlock({
  type,
  size,
  onPress,
  isActive  = false,
  inQueue   = false,
  disabled  = false,
}: CommandBlockProps) {
  const cfg   = COMMAND_CONFIGS[type];
  const pulse = useRef(new Animated.Value(1)).current;

  // Pulse scale when this step is actively executing
  useEffect(() => {
    if (!isActive) { pulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 220, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 220, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive]);

  const radius     = size * 0.22;
  const emojiFontSize  = inQueue ? size * 0.46 : size * 0.44;
  const labelFontSize  = size * 0.17;

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.72}>
      <Animated.View
        style={[
          styles.block,
          {
            width:           size,
            height:          inQueue ? size : size * 0.92,
            backgroundColor: cfg.color,
            borderRadius:    radius,
            opacity:         disabled ? 0.48 : 1,
            transform:       [{ scale: pulse }],
          },
          isActive && styles.activeBlock,
        ]}
      >
        <Text style={{ fontSize: emojiFontSize, lineHeight: emojiFontSize * 1.1 }}>
          {cfg.emoji}
        </Text>
        {!inQueue && (
          <Text style={[styles.label, { fontSize: labelFontSize }]}>
            {cfg.label}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems:     'center',
    justifyContent: 'center',
    elevation:      5,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 3 },
    shadowOpacity:  0.25,
    shadowRadius:   5,
  },
  activeBlock: {
    borderWidth:  3,
    borderColor:  '#FFD700',
    elevation:    10,
    shadowColor:  '#FFD700',
    shadowOpacity: 0.6,
    shadowRadius:  8,
  },
  label: {
    color:      '#fff',
    fontWeight: 'bold',
    marginTop:  2,
    textAlign:  'center',
    paddingHorizontal: 2,
  },
});
