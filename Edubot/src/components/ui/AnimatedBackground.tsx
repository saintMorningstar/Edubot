import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { THEME } from '../../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

type Bubble = {
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  amplitude: number;
};

const BUBBLES: Bubble[] = [
  { x: -W * 0.12, y: H * 0.00,  size: 200, color: THEME.colors.primary,       duration: 7000,  delay: 0,    amplitude: 28 },
  { x:  W * 0.72, y: -H * 0.05, size: 150, color: THEME.colors.secondary,     duration: 9000,  delay: 1200, amplitude: 22 },
  { x:  W * 0.44, y:  H * 0.16, size:  90, color: THEME.colors.accent,        duration: 11000, delay: 600,  amplitude: 18 },
  { x: -W * 0.06, y:  H * 0.48, size: 140, color: THEME.colors.primaryLight,  duration: 8500,  delay: 2400, amplitude: 32 },
  { x:  W * 0.78, y:  H * 0.44, size: 100, color: THEME.colors.secondary,     duration: 7500,  delay: 1800, amplitude: 26 },
  { x:  W * 0.28, y:  H * 0.68, size: 120, color: THEME.colors.primary,       duration: 10000, delay: 900,  amplitude: 20 },
  { x:  W * 0.82, y:  H * 0.76, size:  75, color: THEME.colors.accent,        duration: 12000, delay: 3200, amplitude: 16 },
  { x:  W * 0.10, y:  H * 0.83, size: 110, color: THEME.colors.primaryLight,  duration: 9500,  delay: 1500, amplitude: 30 },
];

function FloatingBubble({ b }: { b: Bubble }) {
  const ty = useSharedValue(0);

  useEffect(() => {
    ty.value = withDelay(
      b.delay,
      withRepeat(
        withTiming(-b.amplitude, {
          duration: b.duration,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position:        'absolute',
          left:            b.x,
          top:             b.y,
          width:           b.size,
          height:          b.size,
          borderRadius:    b.size / 2,
          backgroundColor: b.color,
          opacity:         0.07,
        },
      ]}
    />
  );
}

export default function AnimatedBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {BUBBLES.map((b, i) => (
        <FloatingBubble key={i} b={b} />
      ))}
    </View>
  );
}
