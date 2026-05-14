

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import AppIcon, { IconFamily } from './AppIcon';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../utils/constants';

interface BigButtonProps {
  label:       string;
  onPress:     () => void;
  color?:      string;
  textColor?:  string;
  
  iconName?:   string;
  iconFamily?: IconFamily;
  iconSize?:   number;
  disabled?:   boolean;
  loading?:    boolean;
  style?:      ViewStyle;
}

export default function BigButton({
  label,
  onPress,
  color      = COLORS.primary,
  textColor  = COLORS.white,
  iconName,
  iconFamily = 'Ionicons',
  iconSize   = 26,
  disabled   = false,
  loading    = false,
  style,
}: BigButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: disabled ? COLORS.textLight : color },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.inner}>
          {iconName && (
            <View style={styles.iconWrap}>
              <AppIcon
                family={iconFamily}
                name={iconName}
                size={iconSize}
                color={textColor}
              />
            </View>
          )}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical:   SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius:      BORDER_RADIUS.large,
    alignItems:        'center',
    justifyContent:    'center',
    elevation:         4,
    shadowColor:       COLORS.black,
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.2,
    shadowRadius:      4,
    minWidth:          140,
  },
  inner: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  iconWrap: {
    marginRight: SPACING.sm,
  },
  label: {
    fontSize:   FONT_SIZES.large,
    fontWeight: 'bold',
    textAlign:  'center',
  },
});
