import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRobot } from '../src/context/RobotContext';
import { tapFeedback } from '../src/services/feedbackService';
import { THEME } from '../src/utils/theme';

const S = THEME;

type BtnDef = {
  iconName:   string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  label:      string;
  color:      string;
  action:     () => void;
  wide?:      boolean;
};

function CtrlBtn({ iconName, iconFamily, label, color, action, wide }: BtnDef) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const Icon = iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;

  return (
    <Animated.View style={[anim, wide && styles.btnWideWrap]}>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: color }, wide && styles.btnWide]}
        onPress={() => { tapFeedback(); action(); }}
        onPressIn ={() => { scale.value = withSpring(0.88, { damping: 14, stiffness: 500 }); }}
        onPressOut={() => { scale.value = withSpring(1.00, { damping: 12, stiffness: 380 }); }}
        activeOpacity={1}
      >
        <Icon name={iconName as any} size={36} color="#fff" />
        <Text style={styles.btnLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ControlScreen() {
  const { sendMove, sendWave, sendDance, isConnected, connectionState } = useRobot();
  const [lastCmd, setLastCmd] = useState('STOP');

  const send = (cmd: string, action: () => void) => {
    setLastCmd(cmd);
    action();
  };

  const moveBtns: BtnDef[] = [
    { iconName: 'arrow-up',      iconFamily: 'Ionicons', label: 'Forward',  color: '#4ECDC4', action: () => send('FORWARD',  () => sendMove('forward'))  },
    { iconName: 'arrow-back',    iconFamily: 'Ionicons', label: 'Left',     color: '#06D6A0', action: () => send('LEFT',     () => sendMove('left'))     },
    { iconName: 'stop-circle',   iconFamily: 'Ionicons', label: 'Stop',     color: '#FF6B6B', action: () => send('STOP',     () => sendMove('stop'))     },
    { iconName: 'arrow-forward', iconFamily: 'Ionicons', label: 'Right',    color: '#06D6A0', action: () => send('RIGHT',    () => sendMove('right'))    },
    { iconName: 'arrow-down',    iconFamily: 'Ionicons', label: 'Backward', color: '#FFD166', action: () => send('BACKWARD', () => sendMove('backward')) },
  ];

  const actionBtns: BtnDef[] = [
    { iconName: 'hand-wave',       iconFamily: 'MaterialCommunityIcons', label: 'Wave',  color: '#A78BFA', action: () => send('WAVE',  () => sendWave()),  wide: true },
    { iconName: 'music-note-plus', iconFamily: 'MaterialCommunityIcons', label: 'Dance', color: '#F472B6', action: () => send('DANCE', () => sendDance()), wide: true },
  ];

  return (
    <View style={styles.bg}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.blePill}>
          <Ionicons
            name={isConnected ? 'bluetooth' : 'bluetooth-outline'}
            size={14}
            color={isConnected ? S.colors.primary : '#64748B'}
          />
          <Text style={[styles.bleText, { color: isConnected ? S.colors.primary : '#64748B' }]}>
            {isConnected ? 'Edubot Connected' : connectionState}
          </Text>
        </View>
        <View style={styles.cmdPill}>
          <View style={styles.cmdDot} />
          <Text style={styles.cmdText}>{lastCmd}</Text>
        </View>
      </View>

      {/* Movement D-pad */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Movement</Text>
        <View style={styles.dpadRow}><CtrlBtn {...moveBtns[0]} /></View>
        <View style={styles.dpadRow}>
          <CtrlBtn {...moveBtns[1]} />
          <CtrlBtn {...moveBtns[2]} />
          <CtrlBtn {...moveBtns[3]} />
        </View>
        <View style={styles.dpadRow}><CtrlBtn {...moveBtns[4]} /></View>
      </View>

      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Actions</Text>
        <View style={styles.dpadRow}>
          {actionBtns.map(b => <CtrlBtn key={b.label} {...b} />)}
        </View>
      </View>

      {!isConnected && (
        <Text style={styles.hint}>
          Not connected — go back to scan for your Edubot
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: S.spacing.lg, paddingTop: S.spacing.md },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.spacing.xl },
  blePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1E293B', borderRadius: S.radius.full,
    paddingHorizontal: S.spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: '#334155',
  },
  bleText:  { fontSize: S.fontSize.sm },
  cmdPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1E293B', borderRadius: S.radius.full,
    paddingHorizontal: S.spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: S.colors.primary + '60',
  },
  cmdDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: S.colors.primary },
  cmdText: { color: S.colors.primary, fontWeight: '700', fontSize: S.fontSize.md },
  section:       { alignItems: 'center', marginBottom: S.spacing.lg },
  sectionLabel:  { fontSize: S.fontSize.lg, fontWeight: '700', color: '#CBD5E1', marginBottom: S.spacing.md, letterSpacing: 0.5 },
  dpadRow:       { flexDirection: 'row', justifyContent: 'center', gap: S.spacing.md, marginBottom: S.spacing.md },
  btn: {
    width: 92, height: 92, borderRadius: S.radius.lg,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnWide:     { width: 148 },
  btnWideWrap: {},
  btnLabel:    { color: '#fff', fontSize: S.fontSize.sm, fontWeight: '700', marginTop: 4, letterSpacing: 0.3 },
  divider:     { height: 1, backgroundColor: '#1E293B', marginHorizontal: S.spacing.xl, marginBottom: S.spacing.lg },
  hint:        { color: '#475569', fontSize: S.fontSize.sm, textAlign: 'center', marginTop: S.spacing.md },
});
