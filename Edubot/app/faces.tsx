import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRobot } from '../src/context/RobotContext';
import {
  FACES,
  EMOTIONS,
  EMOTION_LABELS,
  EMOTION_COLORS,
  type RobotFace,
  type EmotionType,
  type EyeShape,
  type MouthShape,
} from '../src/data/faces';

// Map app emotion names → firmware BLE commands
const EMOTION_TO_BLE: Record<EmotionType, string> = {
  happy:     'HAPPY',
  sad:       'SAD',
  excited:   'EXCITED',
  sleeping:  'SLEEPY',
  angry:     'ANGRY',
  confused:  'THINKING',
  surprised: 'EXCITED',
  laughing:  'HAPPY',
  winking:   'HAPPY',
  cool:      'HAPPY',
  love:      'HAPPY',
  nervous:   'THINKING',
  thinking:  'THINKING',
  silly:     'EXCITED',
  robot:     'HAPPY',
};
import { THEME } from '../src/utils/theme';

const S = THEME;
const { width: SW } = Dimensions.get('window');
const COLS        = 3;
const GRID_PAD    = 12;
const CARD_MARGIN = 4;
const CARD_SIZE   = Math.floor((SW - GRID_PAD * 2 - CARD_MARGIN * 2 * COLS) / COLS);
const PREVIEW_SZ  = 148;

// ─── Eye renderer (no emoji/unicode symbols) ──────────────────────────────────

function EyeView({ type, size }: { type: EyeShape; size: number }) {
  const d = '#1a1a1a';

  switch (type) {
    case 'open':
      return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: d }} />;

    case 'closed':
      return <View style={{ width: size * 1.2, height: Math.max(3, size * 0.2), borderRadius: 4, backgroundColor: d }} />;

    case 'wide':
      return (
        <View style={{ width: size * 1.3, height: size * 1.3, borderRadius: size * 0.65, backgroundColor: d }}>
          <View style={{ position: 'absolute', top: 2, left: 2, width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, backgroundColor: 'white' }} />
        </View>
      );

    case 'dot':
      return <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size * 0.25, backgroundColor: d }} />;

    case 'x':
      // Two crossed bars — no unicode ✕
      return (
        <View style={{ width: size * 1.2, height: size * 1.2, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            position:     'absolute',
            width:        size * 1.1,
            height:       Math.max(3, size * 0.22),
            borderRadius: 3,
            backgroundColor: d,
            transform:    [{ rotate: '45deg' }],
          }} />
          <View style={{
            position:     'absolute',
            width:        size * 1.1,
            height:       Math.max(3, size * 0.22),
            borderRadius: 3,
            backgroundColor: d,
            transform:    [{ rotate: '-45deg' }],
          }} />
        </View>
      );

    case 'heart':
      // SVG heart path — no unicode ♥
      return (
        <Svg width={size * 1.4} height={size * 1.3} viewBox="0 0 24 22">
          <Path
            d="M12 21C12 21 2 14 2 7.5C2 4.5 4.5 2 7.5 2C9.2 2 10.7 2.8 12 4.2C13.3 2.8 14.8 2 16.5 2C19.5 2 22 4.5 22 7.5C22 14 12 21 12 21Z"
            fill="#E91E63"
          />
        </Svg>
      );

    case 'star':
      // SVG star path — no unicode ★
      return (
        <Svg width={size * 1.4} height={size * 1.4} viewBox="0 0 24 24">
          <Path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="#FFD700"
          />
        </Svg>
      );

    case 'half':
      return (
        <View style={{ width: size, height: size / 2, overflow: 'hidden' }}>
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: d }} />
        </View>
      );

    case 'wink':
      return (
        <View style={{
          width:           size * 1.2,
          height:          Math.max(3, size * 0.2),
          borderRadius:    4,
          backgroundColor: d,
          transform:       [{ rotate: '-12deg' }],
        }} />
      );

    case 'squint':
      return <View style={{ width: size * 0.9, height: Math.max(4, size * 0.35), borderRadius: size * 0.2, backgroundColor: d }} />;

    case 'spiral':
      // Concentric circles — no unicode ◎
      return (
        <View style={{
          width:        size * 1.2,
          height:       size * 1.2,
          borderRadius: size * 0.6,
          borderWidth:  Math.max(2, size * 0.1),
          borderColor:  d,
          alignItems:   'center',
          justifyContent: 'center',
        }}>
          <View style={{
            width:           size * 0.45,
            height:          size * 0.45,
            borderRadius:    size * 0.225,
            backgroundColor: d,
          }} />
        </View>
      );

    default:
      return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: d }} />;
  }
}

// ─── Mouth renderer (no emoji/unicode symbols) ────────────────────────────────

function MouthView({ type, faceSize }: { type: MouthShape; faceSize: number }) {
  const d  = '#1a1a1a';
  const w  = faceSize * 0.42;
  const bw = Math.max(2, faceSize * 0.03);

  switch (type) {
    case 'smile':
      return (
        <View style={{
          width:                 w,
          height:                w * 0.5,
          borderBottomLeftRadius:  w,
          borderBottomRightRadius: w,
          borderWidth:  bw,
          borderColor:  d,
          borderTopWidth: 0,
        }} />
      );

    case 'big_smile':
      return (
        <View style={{
          width:                 w * 1.15,
          height:                w * 0.65,
          borderBottomLeftRadius:  w,
          borderBottomRightRadius: w,
          backgroundColor:       d,
        }} />
      );

    case 'frown':
      return (
        <View style={{
          width:               w,
          height:              w * 0.5,
          borderTopLeftRadius:  w,
          borderTopRightRadius: w,
          borderWidth:      bw,
          borderColor:      d,
          borderBottomWidth: 0,
          marginTop:        w * 0.28,
        }} />
      );

    case 'big_frown':
      return (
        <View style={{
          width:               w * 1.1,
          height:              w * 0.6,
          borderTopLeftRadius:  w,
          borderTopRightRadius: w,
          backgroundColor:     d,
          marginTop:           w * 0.25,
        }} />
      );

    case 'open':
      return (
        <View style={{
          width:        w * 0.65,
          height:       w * 0.45,
          borderRadius: w * 0.35,
          backgroundColor: d,
        }} />
      );

    case 'flat':
      return (
        <View style={{
          width:        w * 0.65,
          height:       Math.max(3, bw * 1.5),
          backgroundColor: d,
          borderRadius: 4,
        }} />
      );

    case 'o_shape':
      return (
        <View style={{
          width:        w * 0.5,
          height:       w * 0.5,
          borderRadius: w * 0.25,
          backgroundColor: d,
        }} />
      );

    case 'teeth':
      return (
        <View style={{
          width:                 w * 1.15,
          height:                w * 0.6,
          borderBottomLeftRadius:  w,
          borderBottomRightRadius: w,
          backgroundColor:       d,
          overflow:              'hidden',
          alignItems:            'center',
        }}>
          <View style={{ width: '100%', height: w * 0.22, backgroundColor: 'white' }} />
        </View>
      );

    case 'tongue':
      return (
        <View style={{
          width:                 w * 1.1,
          height:                w * 0.6,
          borderBottomLeftRadius:  w,
          borderBottomRightRadius: w,
          backgroundColor:       d,
          overflow:              'hidden',
          alignItems:            'center',
          justifyContent:        'flex-end',
        }}>
          <View style={{
            width:        w * 0.5,
            height:       w * 0.35,
            borderRadius: w * 0.25,
            backgroundColor: '#FF6B6B',
            marginBottom: 2,
          }} />
        </View>
      );

    case 'kiss':
      // SVG heart — no unicode ♥
      return (
        <Svg width={faceSize * 0.22} height={faceSize * 0.20} viewBox="0 0 24 22">
          <Path
            d="M12 21C12 21 2 14 2 7.5C2 4.5 4.5 2 7.5 2C9.2 2 10.7 2.8 12 4.2C13.3 2.8 14.8 2 16.5 2C19.5 2 22 4.5 22 7.5C22 14 12 21 12 21Z"
            fill="#E91E63"
          />
        </Svg>
      );

    case 'wavy':
      // Two small alternating arcs — no CJK wave character
      return (
        <Svg width={w * 1.1} height={w * 0.35} viewBox="0 0 44 14">
          <Path
            d="M2 7 Q8 1 14 7 Q20 13 26 7 Q32 1 38 7 Q44 13 44 7"
            stroke={d}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      );

    default:
      return (
        <View style={{
          width:                 w,
          height:                w * 0.5,
          borderBottomLeftRadius:  w,
          borderBottomRightRadius: w,
          borderWidth:   bw,
          borderColor:   d,
          borderTopWidth: 0,
        }} />
      );
  }
}

// ─── Face renderer ────────────────────────────────────────────────────────────

interface FaceRendererProps {
  face:      RobotFace;
  size:      number;
  animated?: boolean;
}

function FaceRenderer({ face, size, animated: run = false }: FaceRendererProps) {
  const [idx, setIdx] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIdx(0);
    if (!run || face.frames.length <= 1) return;
    const iv = setInterval(() => setIdx(i => (i + 1) % face.frames.length), face.frameMs);
    return () => clearInterval(iv);
  }, [run, face]);

  useEffect(() => {
    if (!run) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.00, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [run, scale]);

  const frame  = face.frames[idx] ?? face.frames[0];
  const eyeSz  = size * 0.16;
  const eyeGap = size * 0.20;

  return (
    <Animated.View style={[
      styles.faceCircle,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: face.color },
      run && { transform: [{ scale }] },
    ]}>
      {frame.cheeks && (
        <>
          <View style={[styles.cheek, { left: size * 0.07, top: size * 0.47, width: size * 0.18, height: size * 0.12 }]} />
          <View style={[styles.cheek, { right: size * 0.07, top: size * 0.47, width: size * 0.18, height: size * 0.12 }]} />
        </>
      )}
      <View style={[styles.eyesRow, { marginTop: size * 0.23, gap: eyeGap }]}>
        <EyeView type={frame.leftEye}  size={eyeSz} />
        <EyeView type={frame.rightEye} size={eyeSz} />
      </View>
      <View style={[styles.mouthArea, { marginTop: size * 0.055 }]}>
        <MouthView type={frame.mouth} faceSize={size} />
      </View>
    </Animated.View>
  );
}

// ─── Emotion filter tab ───────────────────────────────────────────────────────

function EmotionTab({
  emotion,
  selected,
  onPress,
}: {
  emotion:  EmotionType | 'all';
  selected: boolean;
  onPress:  () => void;
}) {
  const label = emotion === 'all' ? 'All' : EMOTION_LABELS[emotion];
  const color = emotion === 'all' ? S.colors.primary : EMOTION_COLORS[emotion];

  return (
    <TouchableOpacity
      style={[styles.tab, selected && { backgroundColor: color, borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.tabText, selected && styles.tabTextSel]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Face card ────────────────────────────────────────────────────────────────

function FaceCard({ face, selected, onPress }: {
  face: RobotFace; selected: boolean; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pi = () => { scale.value = withSpring(0.90, { damping: 15, stiffness: 450 }); };
  const po = () => { scale.value = withSpring(1.00, { damping: 12, stiffness: 350 }); };

  return (
    <Reanimated.View style={[anim, { width: CARD_SIZE, margin: CARD_MARGIN }]}>
      <TouchableOpacity
        style={[
          styles.faceCard,
          selected && { borderColor: face.color, borderWidth: 3, backgroundColor: face.color + '12' },
        ]}
        onPress={onPress}
        onPressIn={pi}
        onPressOut={po}
        activeOpacity={1}
      >
        <FaceRenderer face={face} size={CARD_SIZE * 0.70} animated={false} />
        <Text style={styles.cardName} numberOfLines={1}>{face.name}</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

// ─── Send button with spring press ───────────────────────────────────────────

function SendButton({ sending, onPress }: { sending: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pi = () => { scale.value = withSpring(0.93, { damping: 15, stiffness: 450 }); };
  const po = () => { scale.value = withSpring(1.00, { damping: 12, stiffness: 350 }); };

  return (
    <Reanimated.View style={anim}>
      <TouchableOpacity
        style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
        onPress={onPress}
        onPressIn={pi}
        onPressOut={po}
        disabled={sending}
        activeOpacity={1}
      >
        <Ionicons
          name={sending ? 'hourglass-outline' : 'send'}
          size={18}
          color="#fff"
        />
        <Text style={styles.sendBtnText}>
          {sending ? 'Sending...' : 'Send to Robot'}
        </Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FacesScreen() {
  const { sendEmotion, isConnected } = useRobot();
  const insets = useSafeAreaInsets();
  const [filter,   setFilter]   = useState<EmotionType | 'all'>('all');
  const [selected, setSelected] = useState<RobotFace>(FACES[0]);
  const [sending,  setSending]  = useState(false);

  const list = filter === 'all' ? FACES : FACES.filter(f => f.emotion === filter);

  const pick = useCallback((face: RobotFace) => {
    setSelected(face);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const sendFace = useCallback(() => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Connect to your robot first!');
      return;
    }
    setSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    sendEmotion(EMOTION_TO_BLE[selected.emotion] ?? 'HAPPY');
    setTimeout(() => setSending(false), 400);
  }, [isConnected, sendEmotion, selected.emotion]);

  const renderItem = useCallback(({ item }: { item: RobotFace }) => (
    <FaceCard face={item} selected={selected.id === item.id} onPress={() => pick(item)} />
  ), [selected.id, pick]);

  const emotionColor = EMOTION_COLORS[selected.emotion];

  return (
    <View style={styles.root}>

      {/* Emotion filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        <EmotionTab emotion="all" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {EMOTIONS.map(e => (
          <EmotionTab key={e} emotion={e} selected={filter === e} onPress={() => setFilter(e)} />
        ))}
      </ScrollView>

      {/* Face count */}
      <Text style={styles.countText}>{list.length} expressions</Text>

      {/* Grid */}
      <FlatList
        data={list}
        keyExtractor={f => f.id}
        renderItem={renderItem}
        numColumns={COLS}
        contentContainerStyle={{ padding: GRID_PAD }}
        showsVerticalScrollIndicator={false}
        style={styles.grid}
        removeClippedSubviews
        maxToRenderPerBatch={18}
        windowSize={6}
        initialNumToRender={18}
      />

      {/* Preview panel */}
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, S.spacing.md) }]}>
        <FaceRenderer face={selected} size={PREVIEW_SZ} animated />

        <View style={styles.panelInfo}>
          <Text style={styles.panelName}>{selected.name}</Text>
          <View style={[styles.emotionChip, { backgroundColor: emotionColor + '22', borderColor: emotionColor }]}>
            <Text style={[styles.emotionChipText, { color: emotionColor }]}>
              {EMOTION_LABELS[selected.emotion]}
            </Text>
          </View>
          <Text style={styles.panelId}>ID: {selected.id}</Text>
          <SendButton sending={sending} onPress={sendFace} />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: S.colors.background },

  tabBar:        { maxHeight: 52, flexGrow: 0 },
  tabBarContent: { paddingHorizontal: S.spacing.md, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical:   7,
    borderRadius:      S.radius.full,
    backgroundColor:   S.colors.card,
    borderWidth:       1.5,
    borderColor:       S.colors.border,
  },
  tabText:    { fontSize: 13, color: S.colors.text,  fontWeight: '600' },
  tabTextSel: { color: '#fff' },

  countText: {
    fontSize:          12,
    color:             S.colors.textLight,
    paddingHorizontal: GRID_PAD + 4,
    paddingVertical:   4,
  },

  grid: { flex: 1 },

  faceCard: {
    backgroundColor: S.colors.card,
    borderRadius:    S.radius.md,
    alignItems:      'center',
    paddingVertical: 8,
    ...S.shadow.sm,
    borderWidth:     2,
    borderColor:     'transparent',
  },
  cardName: {
    fontSize:          10,
    color:             S.colors.text,
    fontWeight:        '600',
    marginTop:         4,
    textAlign:         'center',
    paddingHorizontal: 2,
  },

  // Face geometry helpers
  faceCircle: { alignItems: 'center', justifyContent: 'flex-start' },
  eyesRow:    { flexDirection: 'row', alignItems: 'center' },
  mouthArea:  { alignItems: 'center' },
  cheek: {
    position:        'absolute',
    backgroundColor: 'rgba(255,130,130,0.32)',
    borderRadius:    100,
  },

  // Bottom preview panel
  panel: {
    flexDirection:   'row',
    backgroundColor: S.colors.card,
    padding:         S.spacing.md,
    borderTopWidth:  1,
    borderTopColor:  S.colors.divider,
    elevation:       10,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -3 },
    shadowOpacity:   0.08,
    shadowRadius:    8,
    alignItems:      'center',
    gap:             S.spacing.lg,
  },
  panelInfo: { flex: 1, gap: 5 },
  panelName: { fontSize: S.fontSize.lg, fontWeight: '700', color: S.colors.text },

  emotionChip: {
    alignSelf:         'flex-start',
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderRadius:      S.radius.full,
    borderWidth:       1,
  },
  emotionChipText: { fontSize: 12, fontWeight: '600' },

  panelId: { fontSize: 11, color: S.colors.textLight, fontFamily: 'monospace' },

  sendBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   S.colors.primary,
    paddingVertical:   S.spacing.sm,
    paddingHorizontal: S.spacing.md,
    borderRadius:      S.radius.full,
    gap:               S.spacing.sm,
    marginTop:         S.spacing.xs,
    alignSelf:         'flex-start',
    ...S.shadow.sm,
  },
  sendBtnDisabled: { opacity: 0.55 },
  sendBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
});
