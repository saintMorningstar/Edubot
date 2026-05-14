import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { THEME } from '../../utils/theme';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface Props {
  label:      string;
  onPress:    () => void;
  variant?:   Variant;
  size?:      Size;
  icon?:      React.ReactNode;
  loading?:   boolean;
  disabled?:  boolean;
  style?:     StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

const BG_COLOR: Record<Variant, string> = {
  primary:   THEME.colors.primary,
  secondary: THEME.colors.secondary,
  accent:    THEME.colors.accent,
  ghost:     'transparent',
  danger:    THEME.colors.danger,
};

const TEXT_COLOR: Record<Variant, string> = {
  primary:   '#FFFFFF',
  secondary: THEME.colors.text,
  accent:    '#FFFFFF',
  ghost:     THEME.colors.primary,
  danger:    '#FFFFFF',
};

const HEIGHTS: Record<Size, number> = { sm: 44, md: 58, lg: 70 };
const F_SIZE:  Record<Size, number> = {
  sm: THEME.fontSize.sm,
  md: THEME.fontSize.lg,
  lg: THEME.fontSize.xl,
};

export default function KidButton({
  label,
  onPress,
  variant   = 'primary',
  size      = 'md',
  icon,
  loading   = false,
  disabled  = false,
  style,
  fullWidth = false,
}: Props) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn  = () => { scale.value = withSpring(0.93, { damping: 15, stiffness: 450 }); };
  const onPressOut = () => { scale.value = withSpring(1.00, { damping: 12, stiffness: 350 }); };

  const bg = disabled ? THEME.colors.textLight : BG_COLOR[variant];

  return (
    <Animated.View style={[anim, fullWidth && styles.fullWidth, style]}>
      <TouchableOpacity
        style={[
          styles.base,
          {
            backgroundColor: bg,
            height:          HEIGHTS[size],
            borderWidth:     variant === 'ghost' ? 2.5 : 0,
            borderColor:     THEME.colors.primary,
          },
          fullWidth && styles.fullWidth,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        {loading ? (
          <ActivityIndicator color={TEXT_COLOR[variant]} size="small" />
        ) : (
          <View style={styles.inner}>
            {icon && <View>{icon}</View>}
            <Text style={[styles.label, { color: TEXT_COLOR[variant], fontSize: F_SIZE[size] }]}>
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  base: {
    borderRadius:      THEME.radius.full,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: THEME.spacing.xl,
    shadowColor:       '#1A2340',
    shadowOffset:      { width: 0, height: 3 },
    shadowOpacity:     0.12,
    shadowRadius:      8,
    elevation:         4,
  },
  inner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           THEME.spacing.sm,
  },
  label: {
    fontWeight:    '700',
    letterSpacing: 0.3,
  },
});
