/**
 * src/components/game/CommandQueue.tsx
 *
 * Horizontal scrollable strip showing the child's program.
 * Tap any block to remove it (disabled while running).
 * The currently-executing step is highlighted via CommandBlock's isActive prop.
 */

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { CommandType } from '../../services/commandEngine';
import CommandBlock from './CommandBlock';

const ITEM_SIZE  = 54;   // px — queue block size
const ARROW_GAP  = 4;    // px — gap on each side of the arrow

interface CommandQueueProps {
  commands:   CommandType[];
  activeStep: number;        // index of step being executed, -1 when idle
  onRemove:   (index: number) => void;
  isRunning:  boolean;
  maxLength:  number;
}

export default function CommandQueue({
  commands,
  activeStep,
  onRemove,
  isRunning,
  maxLength,
}: CommandQueueProps) {
  return (
    <View style={styles.wrapper}>
      {/* ── Header row ── */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>
          {commands.length === 0
            ? 'My Program  (empty)'
            : `My Program  ${commands.length} / ${maxLength}`}
        </Text>
        {!isRunning && commands.length > 0 && (
          <Text style={styles.removeHint}>tap a block to remove it</Text>
        )}
      </View>

      {/* ── Scroll area ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces={false}
      >
        {commands.length === 0 ? (
          /* Empty-state placeholder */
          <View style={styles.emptySlot}>
            <Text style={styles.emptyText}>👆 Tap a block above to start!</Text>
          </View>
        ) : (
          commands.map((cmd, i) => (
            <View key={`${cmd}-${i}`} style={styles.itemRow}>
              <CommandBlock
                type={cmd}
                size={ITEM_SIZE}
                inQueue
                isActive={activeStep === i}
                disabled={isRunning}
                onPress={() => !isRunning && onRemove(i)}
              />
              {/* Step arrow between blocks */}
              {i < commands.length - 1 && (
                <Text style={styles.arrow}>›</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#12122A',
    paddingTop:      6,
    paddingBottom:   8,
  },

  headerRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 14,
    marginBottom:      4,
  },
  headerLabel: {
    color:     'rgba(255,255,255,0.55)',
    fontSize:  11,
    fontWeight:'bold',
    letterSpacing: 0.4,
  },
  removeHint: {
    color:    'rgba(255,255,255,0.28)',
    fontSize: 10,
    fontStyle:'italic',
  },

  scroll: {
    paddingHorizontal: 12,
    alignItems:        'center',
    gap:               ARROW_GAP,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           ARROW_GAP,
  },
  arrow: {
    color:    'rgba(255,255,255,0.35)',
    fontSize: 20,
    lineHeight: 24,
  },

  emptySlot: {
    height:           ITEM_SIZE,
    paddingHorizontal: 20,
    alignItems:       'center',
    justifyContent:   'center',
    borderWidth:      1.5,
    borderColor:      'rgba(255,255,255,0.18)',
    borderStyle:      'dashed',
    borderRadius:     12,
    minWidth:         240,
  },
  emptyText: {
    color:    'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
});
