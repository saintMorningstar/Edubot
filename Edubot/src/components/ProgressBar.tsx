

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../utils/constants';

interface ProgressBarProps {
  label:      string;
  percent:    number; 
  color?:     string;
  completed?: number; 
}

export default function ProgressBar({
  label,
  percent   = 0,
  color     = COLORS.primary,
  completed = 0,
}: ProgressBarProps) {
  const safe = Math.min(100, Math.max(0, percent));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.percent, { color }]}>{safe}%</Text>
      </View>

      
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${safe}%`, backgroundColor: color }]} />
      </View>

      <Text style={styles.sub}>{completed} activit{completed === 1 ? 'y' : 'ies'} completed</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },

  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   4,
  },
  label: {
    fontSize:   FONT_SIZES.medium,
    fontWeight: 'bold',
    color:      COLORS.text,
  },
  percent: {
    fontSize:   FONT_SIZES.medium,
    fontWeight: 'bold',
  },

  track: {
    height:          16,
    backgroundColor: '#E0E0E0',
    borderRadius:    BORDER_RADIUS.pill,
    overflow:        'hidden',
  },
  fill: {
    height:       '100%',
    borderRadius: BORDER_RADIUS.pill,
  },

  sub: {
    fontSize:   FONT_SIZES.small,
    color:      COLORS.textLight,
    marginTop:  4,
  },
});
