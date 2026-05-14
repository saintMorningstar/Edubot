import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRobot } from '../src/context/RobotContext';
import { THEME } from '../src/utils/theme';
import AnimatedBackground from '../src/components/ui/AnimatedBackground';
import KidButton from '../src/components/ui/KidButton';
import RobotSVG from '../src/components/icons/RobotSVG';

const S = THEME;


function PulsingRing({ active }: { active: boolean }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    if (active) {
      scale.value   = withRepeat(withTiming(1.35, { duration: 900, easing: Easing.out(Easing.ease) }), -1, true);
      opacity.value = withRepeat(withTiming(0.2,  { duration: 900 }), -1, true);
    } else {
      scale.value   = 1;
      opacity.value = 0.7;
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View style={[styles.pulseRing, style,
      { borderColor: active ? S.colors.primary : 'transparent' }
    ]} />
  );
}

export default function ConnectionScreen() {
  const { connectionState, scan, disconnect } = useRobot();
  const isScanning   = connectionState === 'scanning';
  const isConnecting = connectionState === 'connecting';
  const isConnected  = connectionState === 'connected';
  const isError      = connectionState === 'error';
  const busy         = isScanning || isConnecting;

  // Navigate to dashboard once connected
  useEffect(() => {
    if (isConnected) router.replace('/dashboard');
  }, [isConnected]);

  const handleScan = () => {
    if (busy) {
      disconnect();
    } else {
      scan();
    }
  };

  const statusColor = isError ? S.colors.danger
    : (isConnected || isScanning || isConnecting) ? S.colors.primary
    : S.colors.textMuted;

  const statusText = {
    disconnected: 'Not connected',
    scanning:     'Scanning for Edubot...',
    connecting:   'Found Edubot — connecting...',
    connected:    'Connected!',
    error:        'No Edubot found nearby. Try again.',
  }[connectionState];

  return (
    <View style={styles.flex}>
      <AnimatedBackground />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.robotWrap}>
            <PulsingRing active={busy} />
            <RobotSVG size={118} primaryColor={S.colors.primary} />
          </View>
          <Text style={styles.title}>Welcome to Edubot</Text>
          <Text style={styles.subtitle}>Bluetooth Low Energy Control</Text>
        </View>

        {/* Status card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            {busy ? (
              <ActivityIndicator size="small" color={S.colors.primary} />
            ) : (
              <Ionicons
                name={isConnected ? 'bluetooth' : isError ? 'alert-circle' : 'bluetooth-outline'}
                size={22}
                color={statusColor}
              />
            )}
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>

          <KidButton
            label={busy ? 'Cancel Scan' : 'Scan for Edubot'}
            onPress={handleScan}
            loading={isConnecting}
            size="lg"
            fullWidth
            icon={
              <Ionicons
                name={busy ? 'close-circle' : 'bluetooth'}
                size={22}
                color="#fff"
              />
            }
            style={{ marginTop: S.spacing.md }}
          />

          <TouchableOpacity style={styles.skipRow} onPress={() => router.replace('/dashboard')}>
            <Text style={styles.skipText}>Skip — explore without a robot</Text>
            <Ionicons name="chevron-forward" size={15} color={S.colors.textMuted} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: S.colors.background },
  scroll: { padding: S.spacing.lg, alignItems: 'center', paddingBottom: S.spacing.xxl },

  hero:      { alignItems: 'center', marginBottom: S.spacing.xl, marginTop: S.spacing.sm },
  robotWrap: {
    width: 160, height: 160,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: S.spacing.lg,
  },
  pulseRing: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 3,
  },
  title:    { fontSize: S.fontSize.xxl, fontWeight: '800', color: S.colors.text, textAlign: 'center' },
  subtitle: { fontSize: S.fontSize.lg, color: S.colors.textMuted, textAlign: 'center', marginTop: S.spacing.sm },

  card: {
    backgroundColor: S.colors.card, borderRadius: S.radius.lg,
    padding: S.spacing.lg, width: '100%',
    marginBottom: S.spacing.md, ...S.shadow.md,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: S.spacing.sm,
    marginBottom: S.spacing.sm,
  },
  statusText: { fontSize: S.fontSize.md, fontWeight: '600', flex: 1 },

  skipRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: S.spacing.md, marginTop: S.spacing.sm,
  },
  skipText: { fontSize: S.fontSize.sm, color: S.colors.textMuted },

});
