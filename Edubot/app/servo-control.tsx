import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useRobot } from '../src/context/RobotContext';
import { THEME } from '../src/utils/theme';
import AnimatedBackground from '../src/components/ui/AnimatedBackground';
import KidButton from '../src/components/ui/KidButton';

const S = THEME;

// Must match firmware channel order in system/config.h:
// CH0=Left Hip  CH1=Left Foot  CH2=Left Hand
// CH3=Right Hip CH4=Right Foot CH5=Right Hand
const SERVO_LABELS = [
  'Left Hip',
  'Left Foot',
  'Left Hand',
  'Right Hip',
  'Right Foot',
  'Right Hand',
];

const PRESETS: Record<string, number[]> = {
  Home:    [90, 90, 90, 90, 90, 90],
  Stand:   [90, 90, 80, 80, 90, 90],
  Wave:    [90, 90, 90, 90, 45, 135],
  Lean:    [80, 100, 90, 90, 90, 90],
  Arms_Up: [90, 90, 90, 90, 45, 45],
};

export default function ServoControlScreen() {
  const { sendServo, sendWave, sendDance, isConnected } = useRobot();
  const [angles, setAngles] = useState([90, 90, 90, 90, 90, 90]);

  const setServo = (idx: number, angle: number) => {
    const rounded = Math.round(angle);
    const next = [...angles];
    next[idx] = rounded;
    setAngles(next);
    sendServo(idx, rounded);
  };

  const applyPreset = (name: string) => {
    const vals = PRESETS[name];
    setAngles(vals);
    vals.forEach((angle, idx) => {
      setTimeout(() => sendServo(idx, angle), idx * 60);
    });
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="settings-sharp" size={28} color={S.colors.primary} />
          <Text style={styles.title}>Servo Control</Text>
          {!isConnected && (
            <Text style={styles.offline}>Robot offline</Text>
          )}
        </View>

        {/* Presets */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Presets</Text>
          <View style={styles.presetRow}>
            {Object.keys(PRESETS).map(name => (
              <TouchableOpacity
                key={name}
                style={styles.presetBtn}
                onPress={() => applyPreset(name)}
              >
                <Text style={styles.presetLabel}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Individual sliders */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Individual Servos</Text>
          {SERVO_LABELS.map((label, idx) => (
            <View key={idx} style={styles.sliderRow}>
              <View style={styles.sliderMeta}>
                <Text style={styles.sliderLabel}>{label}</Text>
                <View style={styles.angleBadge}>
                  <Text style={styles.angleText}>{angles[idx]}°</Text>
                </View>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={180}
                value={angles[idx]}
                step={1}
                minimumTrackTintColor={S.colors.primary}
                maximumTrackTintColor={S.colors.border}
                thumbTintColor={S.colors.primary}
                onValueChange={val => setServo(idx, val)}
              />
              <View style={styles.sliderTicks}>
                <Text style={styles.tickLabel}>0°</Text>
                <Text style={styles.tickLabel}>90°</Text>
                <Text style={styles.tickLabel}>180°</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionRow}>
            <KidButton
              label="Wave"
              onPress={sendWave}
              icon={<Ionicons name="hand-right" size={20} color="#fff" />}
              style={styles.actionBtn}
            />
            <KidButton
              label="Dance"
              onPress={sendDance}
              icon={<Ionicons name="musical-notes" size={20} color="#fff" />}
              style={[styles.actionBtn, { backgroundColor: S.colors.secondary }]}
            />
          </View>
          <KidButton
            label="Return to Home"
            onPress={() => applyPreset('Home')}
            icon={<Ionicons name="home" size={20} color="#fff" />}
            fullWidth
            style={{ marginTop: S.spacing.sm, backgroundColor: S.colors.textMuted }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: S.colors.background },
  scroll:    { padding: S.spacing.lg, paddingBottom: S.spacing.xxl },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: S.spacing.sm,
    marginBottom: S.spacing.lg,
  },
  title:   { fontSize: S.fontSize.xxl, fontWeight: '800', color: S.colors.text, flex: 1 },
  offline: { fontSize: S.fontSize.sm, color: S.colors.danger, fontWeight: '600' },

  card: {
    backgroundColor: S.colors.card, borderRadius: S.radius.lg,
    padding: S.spacing.lg, marginBottom: S.spacing.md, ...S.shadow.sm,
  },
  sectionTitle: { fontSize: S.fontSize.lg, fontWeight: '700', color: S.colors.text, marginBottom: S.spacing.md },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.spacing.sm },
  presetBtn: {
    backgroundColor: S.colors.primary + '18',
    borderRadius: S.radius.sm, borderWidth: 1, borderColor: S.colors.primary + '40',
    paddingHorizontal: S.spacing.md, paddingVertical: S.spacing.sm,
  },
  presetLabel: { fontSize: S.fontSize.sm, fontWeight: '600', color: S.colors.primary },

  sliderRow:  { marginBottom: S.spacing.md },
  sliderMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sliderLabel:{ fontSize: S.fontSize.md, fontWeight: '600', color: S.colors.text },
  angleBadge: {
    backgroundColor: S.colors.primary, borderRadius: S.radius.sm,
    paddingHorizontal: S.spacing.sm, paddingVertical: 2,
  },
  angleText: { fontSize: S.fontSize.sm, fontWeight: '700', color: '#fff' },
  slider:    { width: '100%', height: 40 },
  sliderTicks:{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  tickLabel:  { fontSize: 10, color: S.colors.textMuted },

  actionRow: { flexDirection: 'row', gap: S.spacing.sm },
  actionBtn: { flex: 1 },
});
