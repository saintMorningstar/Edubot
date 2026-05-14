import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  sportsBLEService,
  CarConnectionState,
  ScannedDevice,
  CAR_DEVICE_NAME,
} from '../src/services/SportsBLEService';
import { soundService } from '../src/services/soundService';
import { COLORS, BORDER_RADIUS, SPACING, FONT_SIZES } from '../src/utils/constants';

const { width: SW } = Dimensions.get('window');
const REPEAT_MS = 380; // ms between repeated commands while button held

// ─── Speed levels ─────────────────────────────────────────────────────────────

interface SpeedLevel {
  id:       string;
  label:    string;
  iconLib:  'ion' | 'mci';
  iconName: string;
  value:    number;
  color:    string;
}

const SPEEDS: SpeedLevel[] = [
  { id: 'slow',  label: 'SLOW',  iconLib: 'mci', iconName: 'tortoise',      value: 30,  color: '#4CAF50' },
  { id: 'go',    label: 'GO',    iconLib: 'mci', iconName: 'car-sports',    value: 65,  color: '#FF9800' },
  { id: 'turbo', label: 'TURBO', iconLib: 'mci', iconName: 'rocket-launch', value: 100, color: '#F44336' },
];

// ─── Button config ────────────────────────────────────────────────────────────

type CmdId = 'forward' | 'left' | 'stop' | 'right' | 'backward';
type DirId  = 'forward' | 'left' | 'right' | 'backward';

interface BtnCfg {
  id:         CmdId;
  iconLib:    'ion' | 'mci';
  iconName:   string;
  label:      string;
  color:      string;
  pressColor: string;
  glowColor:  string;
  isStop?:    boolean;
}

const BTNS: Record<CmdId, BtnCfg> = {
  forward:  { id: 'forward',  iconLib: 'ion', iconName: 'arrow-up',      label: 'FORWARD', color: '#2ECC40', pressColor: '#27AE35', glowColor: 'rgba(46,204,64,0.4)'  },
  left:     { id: 'left',     iconLib: 'ion', iconName: 'arrow-back',    label: 'LEFT',    color: '#FFD700', pressColor: '#E6C300', glowColor: 'rgba(255,215,0,0.4)'  },
  stop:     { id: 'stop',     iconLib: 'mci', iconName: 'stop-circle',   label: 'STOP',    color: '#FF3B30', pressColor: '#CC2F26', glowColor: 'rgba(255,59,48,0.5)', isStop: true },
  right:    { id: 'right',    iconLib: 'ion', iconName: 'arrow-forward', label: 'RIGHT',   color: '#FFD700', pressColor: '#E6C300', glowColor: 'rgba(255,215,0,0.4)'  },
  backward: { id: 'backward', iconLib: 'ion', iconName: 'arrow-down',    label: 'BACK',    color: '#FF6B35', pressColor: '#E55C28', glowColor: 'rgba(255,107,53,0.4)' },
};

// ─── Sport button ─────────────────────────────────────────────────────────────

const BTN_SZ  = Math.min(96, Math.floor((SW - SPACING.xl * 2 - SPACING.md * 2) / 3));
const STOP_SZ = Math.round(BTN_SZ * 1.15);

interface SportButtonProps {
  cfg:        BtnCfg;
  disabled:   boolean;
  onPressIn:  () => void;
  onPressOut: () => void;
}

function SportButton({ cfg, disabled, onPressIn, onPressOut }: SportButtonProps) {
  const scale  = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(4)).current;
  const [active, setActive] = useState(false);

  const handleIn = useCallback(() => {
    setActive(true);
    Animated.parallel([
      Animated.spring(scale,  { toValue: 0.86, useNativeDriver: true,  speed: 80, bounciness: 2 }),
      Animated.timing(shadow, { toValue: 14,   useNativeDriver: false, duration: 80 }),
    ]).start();
    onPressIn();
  }, [onPressIn, scale, shadow]);

  const handleOut = useCallback(() => {
    setActive(false);
    Animated.parallel([
      Animated.spring(scale,  { toValue: 1.0, useNativeDriver: true,  speed: 22, bounciness: 10 }),
      Animated.timing(shadow, { toValue: 4,   useNativeDriver: false, duration: 200 }),
    ]).start();
    onPressOut();
  }, [onPressOut, scale, shadow]);

  const size = cfg.isStop ? STOP_SZ : BTN_SZ;
  const bg   = disabled ? '#3C3C3C' : (active ? cfg.pressColor : cfg.color);

  return (
    <Animated.View style={[
      styles.btnOuter,
      { width: size + 16, height: size + 16, borderRadius: (size + 16) / 2 },
      !disabled && active && { backgroundColor: cfg.glowColor },
    ]}>
      <Pressable
        onPressIn={disabled ? undefined : handleIn}
        onPressOut={disabled ? undefined : handleOut}
        disabled={disabled}
      >
        <Animated.View style={[
          styles.btn,
          {
            width: size, height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
            elevation: shadow,
            shadowColor: disabled ? '#000' : cfg.color,
          },
        ]}>
          {cfg.iconLib === 'ion'
            ? <Ionicons name={cfg.iconName as any} size={cfg.isStop ? 36 : 28} color="#fff" />
            : <MaterialCommunityIcons name={cfg.iconName as any} size={cfg.isStop ? 36 : 28} color="#fff" />
          }
          <Text style={[
            styles.btnLabel,
            cfg.isStop && { fontSize: 12, letterSpacing: 1 },
          ]}>
            {cfg.label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Speed selector ───────────────────────────────────────────────────────────

function SpeedSelector({ speed, onSelect }: {
  speed: SpeedLevel;
  onSelect: (s: SpeedLevel) => void;
}) {
  return (
    <View style={styles.speedRow}>
      {SPEEDS.map(s => {
        const sel = s.id === speed.id;
        return (
          <TouchableOpacity
            key={s.id}
            style={[styles.speedBtn, sel && { backgroundColor: s.color, borderColor: s.color }]}
            onPress={() => { onSelect(s); Haptics.selectionAsync().catch(() => {}); }}
            activeOpacity={0.78}
          >
            {s.iconLib === 'ion'
              ? <Ionicons name={s.iconName as any} size={14} color={sel ? '#fff' : s.color} />
              : <MaterialCommunityIcons name={s.iconName as any} size={14} color={sel ? '#fff' : s.color} />
            }
            <Text style={[styles.speedLabel, sel && styles.speedLabelSel]}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── BLE connection panel ─────────────────────────────────────────────────────

interface BLEPanelProps {
  state:           CarConnectionState;
  devices:         ScannedDevice[];
  connectedDevice: ScannedDevice | null;
  onScan:          () => void;
  onConnect:       (d: ScannedDevice) => void;
  onDisconnect:    () => void;
}

function BLEConnectionPanel({
  state, devices, connectedDevice, onScan, onConnect, onDisconnect,
}: BLEPanelProps) {
  const connected  = state === 'connected';
  const scanning   = state === 'scanning';
  const connecting = state === 'connecting';

  const dotColor =
    connected             ? '#2ECC40' :
    scanning || connecting ? '#FFD700' :
    state === 'error'     ? '#FF6B35' :
    '#FF3B30';

  const statusLabel =
    connected   ? `Connected · ${connectedDevice?.name ?? ''}` :
    connecting  ? 'Connecting…' :
    scanning    ? 'Scanning for devices…' :
    state === 'error' ? 'Connection failed · tap Scan to retry' :
    'Not connected';

  return (
    <View style={styles.connPanel}>
      {/* Status row */}
      <View style={styles.connRow}>
        <View style={[styles.connDot, { backgroundColor: dotColor }]} />
        <Text style={styles.connStatus}>{statusLabel}</Text>
      </View>

      {/* Action button */}
      {connected ? (
        <TouchableOpacity style={styles.disconnectBtn} onPress={onDisconnect} activeOpacity={0.8}>
          <Ionicons name="bluetooth-outline" size={16} color="white" />
          <Text style={styles.connBtnText}>Disconnect</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.connBtn, connecting && { opacity: 0.5 }]}
          onPress={onScan}
          disabled={connecting}
          activeOpacity={0.8}
        >
          <Ionicons
            name={scanning ? 'stop-circle-outline' : 'bluetooth-outline'}
            size={16}
            color="white"
          />
          <Text style={styles.connBtnText}>
            {scanning ? 'Stop scan' : 'Scan for devices'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Device list — shown while scanning or after scan, if any found */}
      {!connected && devices.length > 0 && (
        <View style={styles.deviceList}>
          <Text style={styles.deviceListTitle}>
            {devices.length} device{devices.length !== 1 ? 's' : ''} found
          </Text>
          {devices.map(d => {
            const isCar = d.name === CAR_DEVICE_NAME;
            return (
              <View key={d.id} style={[styles.deviceRow, isCar && styles.deviceRowHighlight]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deviceName, isCar && { color: '#FFD700' }]}>
                    {isCar ? '★ ' : ''}{d.name}
                  </Text>
                  <Text style={styles.deviceRssi}>{d.rssi} dBm</Text>
                </View>
                <TouchableOpacity
                  style={[styles.connectItemBtn, connecting && { opacity: 0.5 }]}
                  onPress={() => onConnect(d)}
                  disabled={connecting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.connBtnText}>Connect</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Command flash badge ──────────────────────────────────────────────────────

function CmdBadge({ label, color }: { label: string; color: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    opacity.setValue(1);
    Animated.timing(opacity, { toValue: 0.4, duration: 1200, useNativeDriver: true }).start();
  }, [label]);
  return (
    <Animated.View style={[styles.cmdBadge, { borderColor: color, opacity }]}>
      <Text style={[styles.cmdBadgeText, { color }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SportsModeScreen() {
  const [bleState,        setBleState]        = useState<CarConnectionState>('disconnected');
  const [devices,         setDevices]         = useState<ScannedDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<ScannedDevice | null>(null);
  const [speed,           setSpeed]           = useState<SpeedLevel>(SPEEDS[1]);
  const [lastCmd,         setLastCmd]         = useState<{ label: string; color: string } | null>(null);

  const repeatRef  = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const activeCmd  = useRef<CmdId | null>(null);

  const connected = bleState === 'connected';
  const disabled  = !connected;

  // Wire up service callbacks once on mount
  useEffect(() => {
    sportsBLEService.onConnectionChange(state => {
      setBleState(state);
      if (state === 'disconnected' || state === 'error') {
        setConnectedDevice(null);
      }
    });
    sportsBLEService.onDevicesFound(setDevices);

    return () => {
      // Stop any active scan when leaving the screen
      sportsBLEService.stopScan();
    };
  }, []);

  // Scan / stop-scan
  const handleScan = useCallback(() => {
    if (bleState === 'scanning') {
      sportsBLEService.stopScan();
    } else {
      setDevices([]);
      sportsBLEService.scan().catch(e => console.error('[SportsBLE]', e));
    }
  }, [bleState]);

  // Connect to a chosen device
  const handleConnect = useCallback((d: ScannedDevice) => {
    setConnectedDevice(d);
    sportsBLEService.connect(d)
      .then(() => {
        soundService.play('success').catch(() => {});
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      })
      .catch(() => {
        setConnectedDevice(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      });
  }, []);

  // Disconnect
  const handleDisconnect = useCallback(() => {
    sportsBLEService.disconnect().catch(() => {});
  }, []);

  // Send a single motor command
  const fire = useCallback((cfg: BtnCfg) => {
    if (!connected) return;
    if (cfg.id === 'stop') {
      sportsBLEService.sendStop();
    } else {
      sportsBLEService.sendMove(cfg.id as DirId, speed.value);
    }
  }, [connected, speed]);

  // Press-in: fire immediately + start repeat (directional only)
  const handlePressIn = useCallback((cfg: BtnCfg) => {
    activeCmd.current = cfg.id;
    setLastCmd({ label: cfg.label, color: cfg.color });
    Haptics.impactAsync(
      cfg.isStop
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium,
    ).catch(() => {});
    soundService.play('tap').catch(() => {});
    fire(cfg);
    if (!cfg.isStop) {
      repeatRef.current = setInterval(() => {
        if (activeCmd.current === cfg.id) fire(cfg);
      }, REPEAT_MS);
    }
  }, [fire]);

  // Press-out: clear repeat + send explicit stop for directional
  const handlePressOut = useCallback((cfg: BtnCfg) => {
    if (!cfg.isStop) {
      clearInterval(repeatRef.current);
      activeCmd.current = null;
      if (connected) sportsBLEService.sendStop();
    }
  }, [connected]);

  // Clean up interval on unmount
  useEffect(() => () => clearInterval(repeatRef.current), []);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="racing-helmet" size={32} color="#FFD700" />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Sports Mode</Text>
            <Text style={styles.headerSub}>Control your robot car via BLE</Text>
          </View>
          {lastCmd && <CmdBadge label={lastCmd.label} color={lastCmd.color} />}
        </View>

        {/* BLE Connection */}
        <BLEConnectionPanel
          state={bleState}
          devices={devices}
          connectedDevice={connectedDevice}
          onScan={handleScan}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        {/* Speed */}
        <Text style={styles.sectionLabel}>Speed</Text>
        <SpeedSelector speed={speed} onSelect={setSpeed} />

        {/* D-pad */}
        <View style={styles.dpad}>
          {/* Row 1: Forward */}
          <View style={styles.dpadRow}>
            <SportButton
              cfg={BTNS.forward}
              disabled={disabled}
              onPressIn={() => handlePressIn(BTNS.forward)}
              onPressOut={() => handlePressOut(BTNS.forward)}
            />
          </View>

          {/* Row 2: Left | Stop | Right */}
          <View style={styles.dpadRow}>
            <SportButton
              cfg={BTNS.left}
              disabled={disabled}
              onPressIn={() => handlePressIn(BTNS.left)}
              onPressOut={() => handlePressOut(BTNS.left)}
            />
            <SportButton
              cfg={BTNS.stop}
              disabled={!connected}
              onPressIn={() => handlePressIn(BTNS.stop)}
              onPressOut={() => handlePressOut(BTNS.stop)}
            />
            <SportButton
              cfg={BTNS.right}
              disabled={disabled}
              onPressIn={() => handlePressIn(BTNS.right)}
              onPressOut={() => handlePressOut(BTNS.right)}
            />
          </View>

          {/* Row 3: Backward */}
          <View style={styles.dpadRow}>
            <SportButton
              cfg={BTNS.backward}
              disabled={disabled}
              onPressIn={() => handlePressIn(BTNS.backward)}
              onPressOut={() => handlePressOut(BTNS.backward)}
            />
          </View>
        </View>

        {/* Hints */}
        {disabled && bleState !== 'scanning' && bleState !== 'connecting' && (
          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={18} color="#888" />
            <Text style={styles.hintText}>
              Tap &quot;Scan for devices&quot; above, then select your EdubotCar from the list to start driving.
            </Text>
          </View>
        )}
        {connected && (
          <Text style={styles.holdHint}>Hold buttons to keep moving · Release to stop</Text>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0D1117' },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.md, marginBottom: SPACING.md,
  },
  headerTitle: { fontSize: FONT_SIZES.large, fontWeight: '900', color: '#FFD700' },
  headerSub:   { fontSize: 13, color: '#888' },

  // Command badge
  cmdBadge: {
    borderWidth: 2, borderRadius: BORDER_RADIUS.pill,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  cmdBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  // Connection panel
  connPanel: {
    backgroundColor: '#161B22',
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: '#30363D',
    gap: SPACING.sm,
  },
  connRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connDot:    { width: 10, height: 10, borderRadius: 5 },
  connStatus: { fontSize: 13, color: '#ccc', fontWeight: '600', flex: 1 },
  connBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    alignSelf: 'flex-start',
  },
  disconnectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FF3B30',
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    alignSelf: 'flex-start',
  },
  connBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  // Device list
  deviceList: {
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  deviceListTitle: {
    fontSize: 11, color: '#6E7681', fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 2,
  },
  deviceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D1117',
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.sm,
    borderWidth: 1, borderColor: '#21262D',
  },
  deviceRowHighlight: {
    borderColor: '#FFD70066',
    backgroundColor: '#1A1500',
  },
  deviceName:  { fontSize: 14, color: '#E6EDF3', fontWeight: '700' },
  deviceRssi:  { fontSize: 11, color: '#6E7681', marginTop: 1 },
  connectItemBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: 14, paddingVertical: 6,
  },

  // Speed
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#888',
    letterSpacing: 1, marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  speedRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  speedBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: BORDER_RADIUS.large, borderWidth: 2,
    borderColor: '#30363D', backgroundColor: '#161B22',
  },
  speedLabel:    { fontSize: 13, fontWeight: '700', color: '#888' },
  speedLabelSel: { color: 'white' },

  // D-pad
  dpad: {
    alignItems: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.md,
    backgroundColor: '#161B22',
    borderRadius: BORDER_RADIUS.large,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: '#30363D',
  },
  dpadRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: SPACING.sm,
  },

  // Buttons
  btnOuter: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  btn: {
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8,
  },
  btnEmoji: { fontSize: 30, lineHeight: 36 },
  btnLabel: {
    fontSize: 10, fontWeight: '900', color: 'white',
    letterSpacing: 0.5, marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Hints
  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#161B22',
    borderRadius: BORDER_RADIUS.large, padding: SPACING.md,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: '#30363D',
  },
  hintText: { flex: 1, fontSize: 13, color: '#888', lineHeight: 18 },
  holdHint: { fontSize: 12, color: '#555', textAlign: 'center', marginBottom: SPACING.md },
});
