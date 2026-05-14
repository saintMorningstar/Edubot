import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { THEME } from '../../utils/theme';

interface Props {
  children: React.ReactNode;
  style?:   ViewStyle;
  accent?:  string;
  padding?: number;
}

export default function KidCard({
  children,
  style,
  accent,
  padding = THEME.spacing.lg,
}: Props) {
  return (
    <View
      style={[
        styles.card,
        { padding },
        accent && { borderTopWidth: 4, borderTopColor: accent },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius:    THEME.radius.lg,
    ...THEME.shadow.md,
  },
});
