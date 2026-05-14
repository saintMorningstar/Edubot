
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRobot } from '../src/context/RobotContext';
import { sendHeartMode, fetchHeartRate } from '../src/services/heartModeService';
import { COLORS, BORDER_RADIUS, SPACING, FONT_SIZES } from '../src/utils/constants';

const { width: SW } = Dimensions.get('window');

// ─── Mode definitions ─────────────────────────────────────────────────────────

interface HeartMode {
  id:          string;
  name:        string;
  iconLib:     'ion' | 'mci';
  iconName:    string;
  color:       string;
  description: string;
}

const HEART_MODES: HeartMode[] = [
  { id: 'beating_heart', name: 'Beating Heart', iconLib: 'ion', iconName: 'heart',           color: '#E91E63', description: 'Watch your heart pulse!' },
  { id: 'bar_graph',     name: 'Bar Graph',     iconLib: 'mci', iconName: 'chart-bar',        color: '#2196F3', description: 'Your beat as bouncing bars' },
  { id: 'color_pulse',   name: 'Color Pulse',   iconLib: 'mci', iconName: 'rainbow',          color: '#9C27B0', description: 'Colors dance with every beat' },
  { id: 'game_meter',    name: 'Game Meter',    iconLib: 'mci', iconName: 'gamepad-variant',  color: '#FF9800', description: 'Speedometer your heartbeat!' },
  { id: 'energy',        name: 'Energy Meter',  iconLib: 'mci', iconName: 'lightning-bolt',   color: '#FFC107', description: 'Power up with every beat!' },
  { id: 'power_level',   name: 'Power Level',   iconLib: 'mci', iconName: 'fire',             color: '#FF5722', description: "What's your power level?!" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const beatMs = (bpm: number) => Math.round(60_000 / Math.max(30, Math.min(220, bpm)));

const bpmColor = (bpm: number) =>
  bpm < 60 ? '#2196F3' : bpm < 100 ? '#4CAF50' : bpm < 140 ? '#FF9800' : '#F44336';

const bpmLabel = (bpm: number) =>
  bpm < 60 ? 'LOW' : bpm < 100 ? 'NORMAL' : bpm < 140 ? 'HIGH' : 'MAX';

// ─── Beating Heart ────────────────────────────────────────────────────────────

function BeatingHeartPreview({ bpm }: { bpm: number }) {
  const scale  = useRef(new Animated.Value(1)).current;
  const glow   = useRef(new Animated.Value(0.6)).current;
  const ms     = beatMs(bpm);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.35, duration: ms * 0.18, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 1.0,  duration: ms * 0.18, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.0,  duration: ms * 0.82, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0.6,  duration: ms * 0.82, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [bpm]);

  return (
    <View style={styles.previewBox}>
      <Animated.View style={[styles.heartGlow, { opacity: glow }]} />
      <Animated.View style={[styles.heartEmoji, { transform: [{ scale }] }]}>
        <Ionicons name="heart" size={72} color="#E91E63" />
      </Animated.View>
      <Text style={[styles.previewBpm, { color: '#E91E63' }]}>{bpm} BPM</Text>
      <Text style={styles.previewSub}>{bpmLabel(bpm)}</Text>
    </View>
  );
}

// ─── Bar Graph ────────────────────────────────────────────────────────────────

const BAR_CFG = [
  { base: 24, peak: 64,  delay: 0   },
  { base: 38, peak: 82,  delay: 70  },
  { base: 52, peak: 100, delay: 140 },
  { base: 44, peak: 96,  delay: 70  },
  { base: 30, peak: 72,  delay: 210 },
  { base: 48, peak: 88,  delay: 105 },
  { base: 36, peak: 60,  delay: 35  },
];

function AnimatedBar({ base, peak, delay: d, ms, color }: {
  base: number; peak: number; delay: number; ms: number; color: string;
}) {
  const h = useRef(new Animated.Value(base)).current;

  useEffect(() => {
    h.setValue(base);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(d),
        Animated.timing(h, { toValue: peak, duration: Math.max(60, ms * 0.22), useNativeDriver: false }),
        Animated.timing(h, { toValue: base, duration: Math.max(100, ms * 0.68), useNativeDriver: false }),
        Animated.delay(Math.max(0, ms * 0.10)),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [ms]);

  return (
    <Animated.View style={{
      width: 26, height: h,
      backgroundColor: color,
      borderRadius: 8,
      marginHorizontal: 3,
    }} />
  );
}

const BAR_COLORS = ['#2196F3','#42A5F5','#1976D2','#64B5F6','#0D47A1','#29B6F6','#1565C0'];

function BarGraphPreview({ bpm }: { bpm: number }) {
  const ms = beatMs(bpm);
  return (
    <View style={styles.previewBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialCommunityIcons name="chart-bar" size={18} color="#2196F3" />
        <Text style={styles.previewLabel}>BAR GRAPH</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 108, marginVertical: 12 }}>
        {BAR_CFG.map((cfg, i) => (
          <AnimatedBar key={i} {...cfg} ms={ms} color={BAR_COLORS[i]} />
        ))}
      </View>
      <Text style={[styles.previewBpm, { color: '#2196F3' }]}>{bpm} BPM</Text>
    </View>
  );
}

// ─── Color Pulse ──────────────────────────────────────────────────────────────

function ColorPulsePreview({ bpm }: { bpm: number }) {
  const opacity = useRef(new Animated.Value(0.25)).current;
  const ms      = beatMs(bpm);
  const col     = bpmColor(bpm);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.92, duration: ms * 0.18, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: ms * 0.82, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [bpm]);

  return (
    <View style={[styles.previewBox, { overflow: 'hidden' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: col, opacity }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialCommunityIcons name="palette" size={18} color="#9C27B0" />
        <Text style={styles.previewLabel}>COLOR PULSE</Text>
      </View>
      <Text style={[styles.previewBigNum, { color: col }]}>{bpm}</Text>
      <Text style={styles.previewBpm}>BEATS PER MINUTE</Text>
      <View style={[styles.pulseChip, { backgroundColor: col }]}>
        <Text style={styles.pulseChipText}>{bpmLabel(bpm)}</Text>
      </View>
    </View>
  );
}

// ─── Game Meter ───────────────────────────────────────────────────────────────

const METER_W = Math.min(SW - 80, 280);

function GameMeterPreview({ bpm }: { bpm: number }) {
  const pct  = Math.max(0.02, Math.min(0.98, (bpm - 40) / 160));
  const pos  = useRef(new Animated.Value(pct)).current;
  const ms   = beatMs(bpm);

  useEffect(() => {
    Animated.spring(pos, { toValue: pct, useNativeDriver: false, tension: 60 }).start();
    const flicker = Animated.loop(
      Animated.sequence([
        Animated.timing(pos, { toValue: Math.min(0.98, pct + 0.06), duration: ms * 0.15, useNativeDriver: false }),
        Animated.timing(pos, { toValue: pct, duration: ms * 0.85, useNativeDriver: false }),
      ])
    );
    flicker.start();
    return () => flicker.stop();
  }, [bpm]);

  return (
    <View style={styles.previewBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialCommunityIcons name="gamepad-variant" size={18} color="#FF9800" />
        <Text style={styles.previewLabel}>GAME METER</Text>
      </View>

      {/* Colour track */}
      <View style={{ width: METER_W, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', height: 30, borderRadius: 15, overflow: 'hidden' }}>
          <View style={{ flex: 1, backgroundColor: '#4CAF50' }} />
          <View style={{ flex: 1, backgroundColor: '#FFC107' }} />
          <View style={{ flex: 1, backgroundColor: '#FF9800' }} />
          <View style={{ flex: 1, backgroundColor: '#F44336' }} />
        </View>
        {/* Zone labels */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          {['Low','Normal','High','Max'].map(l => (
            <Text key={l} style={{ fontSize: 10, color: '#999' }}>{l}</Text>
          ))}
        </View>
        {/* Needle */}
        <Animated.View style={{
          position: 'absolute',
          top: -5,
          left: pos.interpolate({ inputRange: [0, 1], outputRange: [0, METER_W - 12] }),
          width: 12, height: 40,
          backgroundColor: 'white',
          borderRadius: 6,
          borderWidth: 2.5,
          borderColor: '#222',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 3,
        }} />
      </View>

      <Text style={[styles.previewBigNum, { color: '#FF9800', marginTop: 20 }]}>{bpm}</Text>
      <Text style={styles.previewBpm}>BEATS PER MINUTE</Text>
    </View>
  );
}

// ─── Energy Meter ─────────────────────────────────────────────────────────────

const ENERGY_H = 130;

function EnergyMeterPreview({ bpm }: { bpm: number }) {
  const fillPct = Math.max(0.15, Math.min(1, (bpm - 40) / 160));
  const fill    = useRef(new Animated.Value(fillPct)).current;
  const glow    = useRef(new Animated.Value(0.5)).current;
  const ms      = beatMs(bpm);

  useEffect(() => {
    Animated.spring(fill, { toValue: fillPct, useNativeDriver: false, tension: 50 }).start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fill, { toValue: Math.min(1, fillPct + 0.12), duration: ms * 0.2,  useNativeDriver: false }),
          Animated.timing(glow, { toValue: 1,                            duration: ms * 0.2,  useNativeDriver: true  }),
        ]),
        Animated.parallel([
          Animated.timing(fill, { toValue: fillPct, duration: ms * 0.8, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0.5,     duration: ms * 0.8, useNativeDriver: true  }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [bpm]);

  const barColor = bpm < 80 ? '#FFC107' : bpm < 120 ? '#FF9800' : '#FF5722';

  return (
    <View style={styles.previewBox}>
      <Text style={styles.previewLabel}>⚡ ENERGY METER</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 20, marginTop: 12 }}>

        {/* Vertical bar */}
        <View style={styles.energyTrack}>
          {/* Segment marks */}
          {[0.25, 0.5, 0.75].map(p => (
            <View key={p} style={[styles.energyMark, { bottom: p * ENERGY_H }]} />
          ))}
          <Animated.View style={[
            styles.energyFill,
            {
              height: fill.interpolate({ inputRange: [0, 1], outputRange: [0, ENERGY_H] }),
              backgroundColor: barColor,
            },
          ]} />
          {/* Glow overlay */}
          <Animated.View style={[
            StyleSheet.absoluteFill,
            { borderRadius: 18, backgroundColor: barColor, opacity: glow },
          ]} />
        </View>

        {/* Labels */}
        <View style={{ gap: 8 }}>
          {['MAX','HIGH','MID','LOW'].map((l, i) => (
            <Text key={l} style={{ fontSize: 12, color: '#999', fontWeight: '600' }}>{l}</Text>
          ))}
        </View>
      </View>

      <Text style={[styles.previewBigNum, { color: barColor }]}>{bpm}</Text>
      <Text style={styles.previewBpm}>BPM</Text>
    </View>
  );
}

// ─── Power Level ──────────────────────────────────────────────────────────────

const SEGS   = 10;
const SEG_W  = Math.floor((Math.min(SW - 80, 280) - SEGS * 4) / SEGS);
const SEG_COLORS = [
  '#4CAF50','#66BB6A','#8BC34A','#CDDC39',
  '#FFEB3B','#FFC107','#FF9800','#FF5722','#F44336','#E91E63',
];

function PowerLevelPreview({ bpm }: { bpm: number }) {
  const filled = Math.round((bpm / 200) * SEGS);
  const scale  = useRef(new Animated.Value(1)).current;
  const ms     = beatMs(bpm);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: ms * 0.15, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,  duration: ms * 0.85, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [bpm]);

  return (
    <View style={styles.previewBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialCommunityIcons name="fire" size={18} color="#FF5722" />
        <Text style={styles.previewLabel}>POWER LEVEL</Text>
      </View>

      <Animated.Text style={[styles.powerNumber, { transform: [{ scale }] }]}>
        {bpm}
      </Animated.Text>

      {/* Segmented bar */}
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
        {Array.from({ length: SEGS }).map((_, i) => (
          <View
            key={i}
            style={{
              width: SEG_W,
              height: 20 + i * 3,
              backgroundColor: i < filled ? SEG_COLORS[i] : '#DDD',
              borderRadius: 4,
            }}
          />
        ))}
      </View>

      <Text style={styles.previewBpm}>POWER LEVEL · {bpmLabel(bpm)}</Text>
    </View>
  );
}

// ─── Mode preview switcher ────────────────────────────────────────────────────

function ModePreview({ modeId, bpm }: { modeId: string; bpm: number }) {
  switch (modeId) {
    case 'beating_heart': return <BeatingHeartPreview bpm={bpm} />;
    case 'bar_graph':     return <BarGraphPreview     bpm={bpm} />;
    case 'color_pulse':   return <ColorPulsePreview   bpm={bpm} />;
    case 'game_meter':    return <GameMeterPreview    bpm={bpm} />;
    case 'energy':        return <EnergyMeterPreview  bpm={bpm} />;
    case 'power_level':   return <PowerLevelPreview   bpm={bpm} />;
    default:              return <BeatingHeartPreview bpm={bpm} />;
  }
}

// ─── Mode card ────────────────────────────────────────────────────────────────

function ModeCard({ mode, selected, onPress }: {
  mode: HeartMode; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.modeCard,
        selected && { borderColor: mode.color, borderWidth: 3, backgroundColor: mode.color + '12' },
      ]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={styles.modeEmoji}>
        {mode.iconLib === 'ion'
          ? <Ionicons name={mode.iconName as any} size={28} color={mode.color} />
          : <MaterialCommunityIcons name={mode.iconName as any} size={28} color={mode.color} />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.modeName, selected && { color: mode.color }]}>{mode.name}</Text>
        <Text style={styles.modeDesc} numberOfLines={1}>{mode.description}</Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={22} color={mode.color} />
      )}
    </TouchableOpacity>
  );
}

// ─── BPM header card ──────────────────────────────────────────────────────────

function BpmCard({ bpm, loading, calibrating, onRefresh }: {
  bpm: number | null; loading: boolean; calibrating: boolean; onRefresh: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!bpm) return;
    const ms   = beatMs(bpm);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.25, duration: ms * 0.18, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0,  duration: ms * 0.82, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [bpm]);

  const col = bpm ? bpmColor(bpm) : COLORS.textLight;

  return (
    <View style={styles.bpmCard}>
      <Animated.Text style={[styles.bpmHeart, { transform: [{ scale: pulse }] }]}>❤️</Animated.Text>

      <View style={{ flex: 1 }}>
        <Text style={styles.bpmLabel}>Heart Rate</Text>
        <Text style={[styles.bpmValue, { color: calibrating ? '#FF9800' : col }]}>
          {bpm ? `${bpm} BPM` : (calibrating ? 'Calibrating…' : '--- BPM')}
        </Text>
        {bpm && <Text style={[styles.bpmZone, { color: col }]}>{bpmLabel(bpm)}</Text>}
        {calibrating && !bpm && (
          <Text style={styles.calibratingHint}>Place finger on sensor</Text>
        )}
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={loading}>
        <MaterialCommunityIcons
          name={loading ? 'loading' : 'refresh'}
          size={28}
          color={loading ? COLORS.textLight : COLORS.primary}
        />
        <Text style={styles.refreshLabel}>{loading ? 'Reading…' : 'Refresh'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const DEMO_BPM = 72;

const POLL_INTERVAL_MS = 3000;   // re-check sensor every 3 s while calibrating

export default function HeartDisplayScreen() {
  const { robotIP, isConnected } = useRobot();

  const [bpm,      setBpm]      = useState<number | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);
  const [mode,     setMode]     = useState<HeartMode>(HEART_MODES[0]);
  const pollRef                 = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const loadBpm = useCallback(async () => {
    setLoading(true);
    if (isConnected) {
      const reading = await fetchHeartRate(robotIP);
      setBpm(reading?.bpm ?? null);
    } else {
      setBpm(DEMO_BPM + Math.round((Math.random() - 0.5) * 8));
    }
    setLoading(false);
  }, [isConnected, robotIP]);

  // Initial fetch on mount
  useEffect(() => {
    void loadBpm();
  }, []);

  // Auto-poll every 3 s while connected and sensor is still calibrating (bpm === null)
  useEffect(() => {
    if (!isConnected || bpm !== null) {
      clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => { void loadBpm(); }, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [isConnected, bpm, loadBpm]);

  const handleSend = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Connect to your robot first!');
      return;
    }
    setSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const res = await sendHeartMode(robotIP, mode.id);
    setSending(false);
    if (!res.success) {
      Alert.alert('Send Failed', `Could not reach robot.\n${res.error ?? ''}`);
    }
  }, [isConnected, robotIP, mode]);

  const pickMode = useCallback((m: HeartMode) => {
    setMode(m);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const displayBpm = bpm ?? DEMO_BPM;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* BPM header */}
      <BpmCard bpm={bpm} loading={loading} calibrating={isConnected && bpm === null} onRefresh={loadBpm} />

      {!isConnected && (
        <View style={styles.demoBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#FF9800" />
          <Text style={styles.demoText}>Demo mode — connect robot to read live heart rate</Text>
        </View>
      )}

      {/* Live preview */}
      <View style={styles.previewContainer}>
        <ModePreview modeId={mode.id} bpm={displayBpm} />
      </View>

      {/* Mode selector */}
      <Text style={styles.sectionTitle}>Choose Display Style</Text>
      {HEART_MODES.map(m => (
        <ModeCard
          key={m.id}
          mode={m}
          selected={mode.id === m.id}
          onPress={() => pickMode(m)}
        />
      ))}

      {/* Send button */}
      <TouchableOpacity
        style={[styles.sendBtn, { backgroundColor: mode.color }, sending && { opacity: 0.55 }]}
        onPress={handleSend}
        disabled={sending}
        activeOpacity={0.82}
      >
        <Ionicons name={sending ? 'hourglass-outline' : 'send'} size={22} color="white" />
        <Text style={styles.sendBtnText}>
          {sending ? 'Sending to Robot…' : `Set ${mode.name} on Robot`}
        </Text>
      </TouchableOpacity>

      <Text style={styles.apiHint}>
        ESP32 API: GET /heartMode?mode={mode.id}
      </Text>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  bpmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    gap: SPACING.md,
  },
  bpmHeart:  { fontSize: 42 },
  bpmLabel:  { fontSize: 13, color: COLORS.textLight, fontWeight: '600' },
  bpmValue:  { fontSize: 28, fontWeight: '900' },
  bpmZone:   { fontSize: 13, fontWeight: '700', letterSpacing: 1 },

  refreshBtn:      { alignItems: 'center', gap: 2 },
  refreshLabel:    { fontSize: 11, color: COLORS.textLight },
  calibratingHint: { fontSize: 11, color: '#FF9800', marginTop: 2 },

  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E1',
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  demoText: { fontSize: 12, color: '#E65100', flex: 1 },

  previewContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.large,
    marginBottom: SPACING.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    minHeight: 230,
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewBox: {
    width: '100%',
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: 6,
  },
  previewLabel:  { fontSize: 13, fontWeight: '700', color: COLORS.textLight, letterSpacing: 1 },
  previewBigNum: { fontSize: 58, fontWeight: '900', lineHeight: 64 },
  previewBpm:    { fontSize: 13, color: COLORS.textLight, fontWeight: '600', letterSpacing: 1 },
  previewSub:    { fontSize: 13, fontWeight: '700', color: COLORS.textLight, letterSpacing: 2 },

  heartEmoji: { width: 100, height: 100, alignItems: 'center' as const, justifyContent: 'center' as const },
  heartGlow: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#E91E63',
    opacity: 0.15,
  },

  pulseChip: {
    paddingHorizontal: 16, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill,
    marginTop: 4,
  },
  pulseChipText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },

  energyTrack: {
    width: 50, height: ENERGY_H,
    backgroundColor: '#EEE',
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  energyFill: { width: '100%', borderRadius: 18 },
  energyMark: {
    position: 'absolute', left: 0, right: 0,
    height: 2, backgroundColor: 'rgba(255,255,255,0.6)',
  },

  powerNumber: {
    fontSize: 64, fontWeight: '900',
    color: '#FF5722', lineHeight: 72,
    textShadowColor: 'rgba(255,87,34,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  sectionTitle: {
    fontSize: FONT_SIZES.large, fontWeight: 'bold',
    color: COLORS.text, marginBottom: SPACING.sm,
  },

  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeEmoji: { width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const },
  modeName:  { fontSize: FONT_SIZES.medium, fontWeight: 'bold', color: COLORS.text },
  modeDesc:  { fontSize: 13, color: COLORS.textLight, marginTop: 2 },

  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: SPACING.md + 2,
    marginTop: SPACING.md,
    gap: SPACING.sm,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  sendBtnText: { color: 'white', fontSize: FONT_SIZES.medium, fontWeight: 'bold' },

  apiHint: {
    fontSize: 11, color: COLORS.textLight,
    textAlign: 'center', marginTop: SPACING.md,
    fontFamily: 'monospace',
  },
});
