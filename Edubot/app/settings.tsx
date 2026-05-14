/**
 * app/settings.tsx — Sound & Ambient Settings
 *
 * Lets parents/carers configure the background ambient audio:
 *   • Enable / disable background sounds
 *   • Adjust ambient volume (5-step tappable bar)
 *   • Choose an ambient theme (Home / Learning / Coding / Sleep)
 *
 * Changes take effect immediately and persist across app restarts.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ambientService, AmbientTheme, AmbientSettings } from '../src/services/ambientService';
import { THEME } from '../src/utils/theme';
import AnimatedBackground from '../src/components/ui/AnimatedBackground';

const S = THEME;

// ── Volume steps ──────────────────────────────────────────────────────────────

const VOLUME_STEPS = [0.10, 0.25, 0.40, 0.55, 0.70];

function volumeToStep(volume: number): number {
  let closest = 0;
  let minDiff = Infinity;
  VOLUME_STEPS.forEach((v, i) => {
    const diff = Math.abs(volume - v);
    if (diff < minDiff) { minDiff = diff; closest = i; }
  });
  return closest;
}

// ── Theme definitions ─────────────────────────────────────────────────────────

interface ThemeDef {
  key:     AmbientTheme;
  label:   string;
  desc:    string;
  color:   string;
  icon:    string;
  iconFam: 'Ionicons' | 'MaterialCommunityIcons';
}

const THEMES: ThemeDef[] = [
  {
    key:     'home',
    label:   'Home',
    desc:    'Soft synth pads & gentle chimes',
    color:   '#4ECDC4',
    icon:    'home',
    iconFam: 'Ionicons',
  },
  {
    key:     'learning',
    label:   'Learning',
    desc:    'Light nature sounds & wind',
    color:   '#FFD166',
    icon:    'school',
    iconFam: 'Ionicons',
  },
  {
    key:     'coding',
    label:   'Coding',
    desc:    'Subtle futuristic robot hum',
    color:   '#A78BFA',
    icon:    'code-slash',
    iconFam: 'Ionicons',
  },
  {
    key:     'sleep',
    label:   'Sleep',
    desc:    'Calm piano & slow wind',
    color:   '#6B8EFF',
    icon:    'moon',
    iconFam: 'Ionicons',
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

interface VolumeBarProps {
  step:     number;
  onChange: (step: number) => void;
  enabled:  boolean;
}

function VolumeBar({ step, onChange, enabled }: VolumeBarProps) {
  return (
    <View style={styles.volumeRow}>
      <Ionicons
        name="volume-low"
        size={22}
        color={enabled ? S.colors.textMuted : S.colors.textLight}
      />
      <View style={styles.volumeSegments}>
        {VOLUME_STEPS.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => enabled && onChange(i)}
            style={[
              styles.segment,
              {
                backgroundColor:
                  i <= step && enabled
                    ? S.colors.primary
                    : S.colors.border ?? '#E2E8F0',
                opacity: enabled ? 1 : 0.4,
              },
            ]}
          />
        ))}
      </View>
      <Ionicons
        name="volume-high"
        size={22}
        color={enabled ? S.colors.textMuted : S.colors.textLight}
      />
    </View>
  );
}

interface ThemeCardProps {
  def:      ThemeDef;
  selected: boolean;
  enabled:  boolean;
  onPress:  () => void;
}

function ThemeCard({ def, selected, enabled, onPress }: ThemeCardProps) {
  const Icon = def.iconFam === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={enabled ? 0.75 : 1}
      style={[
        styles.themeCard,
        selected && enabled && { borderColor: def.color, borderWidth: 3 },
        !enabled && { opacity: 0.4 },
      ]}
    >
      <View style={[styles.themeIconCircle, { backgroundColor: def.color + '22' }]}>
        <Icon name={def.icon as any} size={28} color={def.color} />
      </View>
      <Text style={styles.themeLabel}>{def.label}</Text>
      <Text style={styles.themeDesc} numberOfLines={2}>{def.desc}</Text>
      {selected && enabled && (
        <View style={[styles.selectedBadge, { backgroundColor: def.color }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const [cfg, setCfg] = useState<AmbientSettings>(() => ambientService.getSettings());

  const currentStep = volumeToStep(cfg.volume);

  const toggleEnabled = useCallback((val: boolean) => {
    ambientService.setEnabled(val);
    setCfg(s => ({ ...s, enabled: val }));
  }, []);

  const handleVolumeStep = useCallback((step: number) => {
    const vol = VOLUME_STEPS[step];
    ambientService.setVolume(vol);
    setCfg(s => ({ ...s, volume: vol }));
  }, []);

  const handleTheme = useCallback((theme: AmbientTheme) => {
    if (!cfg.enabled) return;
    ambientService.setTheme(theme);
    setCfg(s => ({ ...s, theme }));
  }, [cfg.enabled]);

  return (
    <View style={styles.bg}>
      <AnimatedBackground />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Background Sounds card ── */}
        <View style={styles.card}>
          <SectionHeader label="Background Sounds" />
          <Text style={styles.sectionDesc}>
            Gentle ambient audio plays softly while your child uses Edubot.
            It automatically quiets when the robot speaks.
          </Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <MaterialCommunityIcons
                name="music-note-eighth"
                size={26}
                color={cfg.enabled ? S.colors.primary : S.colors.textLight}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>
                  {cfg.enabled ? 'Background sounds on' : 'Background sounds off'}
                </Text>
                <Text style={styles.toggleSub}>
                  {cfg.enabled
                    ? 'Soft ambient audio is playing'
                    : 'Tap to enable calming background sounds'}
                </Text>
              </View>
            </View>
            <Switch
              value={cfg.enabled}
              onValueChange={toggleEnabled}
              trackColor={{ false: '#CBD5E1', true: S.colors.primary + 'AA' }}
              thumbColor={cfg.enabled ? S.colors.primary : '#94A3B8'}
            />
          </View>
        </View>

        {/* ── Volume card ── */}
        <View style={styles.card}>
          <SectionHeader label="Ambient Volume" />
          <Text style={styles.sectionDesc}>
            Keep it gentle — this is a background layer, not the main audio.
          </Text>
          <VolumeBar
            step={currentStep}
            onChange={handleVolumeStep}
            enabled={cfg.enabled}
          />
          <Text style={styles.volumeHint}>
            {cfg.enabled
              ? `Level ${currentStep + 1} of ${VOLUME_STEPS.length}`
              : 'Enable background sounds to adjust volume'}
          </Text>
        </View>

        {/* ── Theme card ── */}
        <View style={styles.card}>
          <SectionHeader label="Sound Theme" />
          <Text style={styles.sectionDesc}>
            Choose the atmosphere that suits the current activity.
          </Text>
          <View style={styles.themeGrid}>
            {THEMES.map(t => (
              <ThemeCard
                key={t.key}
                def={t}
                selected={cfg.theme === t.key}
                enabled={cfg.enabled}
                onPress={() => handleTheme(t.key)}
              />
            ))}
          </View>
        </View>

        {/* ── Developer tools card ── */}
        <View style={styles.card}>
          <SectionHeader label="Robot Calibration" />
          <Text style={styles.sectionDesc}>
            Fine-tune individual servo positions for your robot.
          </Text>
          <TouchableOpacity
            style={styles.devRow}
            onPress={() => router.push('/servo-control')}
          >
            <Ionicons name="hardware-chip-outline" size={22} color={S.colors.primary} />
            <Text style={styles.devLabel}>Servo Control</Text>
            <Ionicons name="chevron-forward" size={18} color={S.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Tips card ── */}
        <View style={[styles.card, styles.tipsCard]}>
          <View style={styles.tipsRow}>
            <Ionicons name="information-circle" size={22} color={S.colors.primary} />
            <Text style={styles.tipsTitle}>Tips for parents</Text>
          </View>
          <Text style={styles.tipsBody}>
            • The ambient sound is very soft and will not distract your child{'\n'}
            • Volume automatically lowers when Edubot speaks or gives feedback{'\n'}
            • Use &quot;Sleep&quot; mode for bedtime story sessions{'\n'}
            • Audio continues smoothly as your child moves between activities{'\n'}
            • Replace the placeholder audio files with real ambient sounds for the full experience
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: S.colors.background },
  scroll: { padding: S.spacing.lg, paddingBottom: S.spacing.xxl },

  card: {
    backgroundColor: S.colors.card,
    borderRadius:    S.radius.lg,
    padding:         S.spacing.lg,
    marginBottom:    S.spacing.lg,
    ...S.shadow.md,
  },

  sectionHeader: {
    fontSize:     S.fontSize.lg,
    fontWeight:   '700',
    color:        S.colors.text,
    marginBottom: S.spacing.xs,
  },
  sectionDesc: {
    fontSize:     S.fontSize.sm,
    color:        S.colors.textMuted,
    lineHeight:   20,
    marginBottom: S.spacing.md,
  },

  // Toggle row
  toggleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            S.spacing.sm,
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           S.spacing.sm,
    flex:          1,
  },
  toggleLabel: {
    fontSize:   S.fontSize.md,
    fontWeight: '700',
    color:      S.colors.text,
  },
  toggleSub: {
    fontSize:  S.fontSize.xs,
    color:     S.colors.textMuted,
    marginTop: 2,
  },

  // Volume bar
  volumeRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           S.spacing.sm,
    marginBottom:  S.spacing.sm,
  },
  volumeSegments: {
    flex:          1,
    flexDirection: 'row',
    gap:           6,
    alignItems:    'center',
  },
  segment: {
    flex:         1,
    height:       28,
    borderRadius: S.radius.sm,
  },
  volumeHint: {
    fontSize:  S.fontSize.xs,
    color:     S.colors.textLight,
    textAlign: 'center',
  },

  // Theme grid
  themeGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           S.spacing.sm,
  },
  themeCard: {
    width:           '47%',
    backgroundColor: S.colors.background,
    borderRadius:    S.radius.md,
    padding:         S.spacing.md,
    alignItems:      'center',
    borderWidth:     2,
    borderColor:     'transparent',
    position:        'relative',
    ...S.shadow.sm,
  },
  themeIconCircle: {
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   S.spacing.xs,
  },
  themeLabel: {
    fontSize:   S.fontSize.md,
    fontWeight: '700',
    color:      S.colors.text,
    marginBottom: 3,
  },
  themeDesc: {
    fontSize:  S.fontSize.xs,
    color:     S.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedBadge: {
    position:     'absolute',
    top:          8,
    right:        8,
    width:        20,
    height:       20,
    borderRadius: 10,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Developer row
  devRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            S.spacing.sm,
    paddingVertical: S.spacing.sm,
  },
  devLabel: {
    flex:       1,
    fontSize:   S.fontSize.md,
    fontWeight: '600',
    color:      S.colors.text,
  },

  // Tips
  tipsCard: { backgroundColor: S.colors.primary + '10' },
  tipsRow:  { flexDirection: 'row', alignItems: 'center', gap: S.spacing.xs, marginBottom: S.spacing.sm },
  tipsTitle: { fontSize: S.fontSize.md, fontWeight: '700', color: S.colors.primary },
  tipsBody: {
    fontSize:   S.fontSize.sm,
    color:      S.colors.textMuted,
    lineHeight: 22,
  },
});
