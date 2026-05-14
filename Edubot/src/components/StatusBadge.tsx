

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../utils/constants';

interface StatusBadgeProps {
  connected: boolean;
  label?:    string; 
}

export default function StatusBadge({ connected, label }: StatusBadgeProps) {
  const color = connected ? COLORS.success : COLORS.danger;
  const text  = label ?? (connected ? '● Connected' : '● Disconnected');

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: color + '22' }]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical:   SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius:      BORDER_RADIUS.pill,
    borderWidth:       2,
    alignSelf:         'center',
  },
  text: {
    fontSize:   FONT_SIZES.medium,
    fontWeight: 'bold',
  },
});
