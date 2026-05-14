/**
 * app/robot-customization.tsx  –  Robot Skin Selection Screen
 *
 * Lets kids pick a robot colour/skin that persists across game sessions.
 *
 * Unlock tiers (by total stars across all adventure levels):
 *   🔵 Blue    →  always available (default)
 *   🔴 Red     →  10 ⭐
 *   🟢 Green   →  20 ⭐
 *   🌈 Rainbow →  30 ⭐
 *
 * Features:
 *   • Live animated robot preview per card (rainbow cycles through hues)
 *   • Star counter showing progress toward the next unlock
 *   • Gold border + ✓ badge on the active skin
 *   • Locked skins are greyed out with a lock icon and star requirement
 *   • Haptic + sound feedback on selection
 *   • Progress bar toward next locked skin
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets }      from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import EmojiIcon from '../src/components/icons/EmojiIcon';

import {
  SKINS,
  SkinId,
  SkinConfig,
  SKIN_BODY_COLORS,
  RAINBOW_COLORS,
  getTotalStars,
  getUnlockedSkins,
  getCurrentSkin,
  setCurrentSkin,
} from '../src/services/robotSkinManager';
import { soundService }  from '../src/services/soundService';
import { speakPhrase }   from '../src/services/voiceService';
import { tapFeedback }   from '../src/services/feedbackService';

// ── Layout ────────────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');
const CARD_W       = (W - 48) / 2;   // 2 cards per row, 16px margins + 16px gap

// ── Mini robot preview (per-card animated robot circle) ───────────────────────

interface RobotPreviewProps {
  skinId:   SkinId;
  size?:    number;
  locked?:  boolean;
}

function RobotPreview({ skinId, size = 72, locked = false }: RobotPreviewProps) {
  const rainbowAnim  = useRef(new Animated.Value(0)).current;
  const loopRef      = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (skinId === 'rainbow' && !locked) {
      rainbowAnim.setValue(0);
      loopRef.current = Animated.loop(
        Animated.timing(rainbowAnim, {
          toValue:         1,
          duration:        2200,
          useNativeDriver: false,
        }),
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      rainbowAnim.setValue(0);
    }
    return () => loopRef.current?.stop();
  }, [skinId, locked]);

  const rainbowColor = rainbowAnim.interpolate({
    inputRange:  RAINBOW_COLORS.map((_, i) => i / (RAINBOW_COLORS.length - 1)),
    outputRange: RAINBOW_COLORS,
  });

  const bgColor: any =
    skinId === 'rainbow' && !locked
      ? rainbowColor
      : locked ? '#455A64' : SKIN_BODY_COLORS[skinId];

  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (locked) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -5, duration: 560, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue:  0, duration: 560, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [locked]);

  return (
    <Animated.View
      style={[
        styles.previewCircle,
        {
          width:           size,
          height:          size,
          borderRadius:    size / 2,
          backgroundColor: bgColor,
          transform:       locked ? [] : [{ translateY: bounceAnim }],
          shadowColor:     locked ? '#000' : SKIN_BODY_COLORS[skinId],
        },
      ]}
    >
      <MaterialCommunityIcons
        name="robot-happy"
        size={Math.round(size * 0.60)}
        color={locked ? 'rgba(255,255,255,0.25)' : '#FFFFFF'}
      />
      {/* Gold direction dot */}
      {!locked && (
        <View
          style={[
            styles.previewDot,
            { width: size * 0.14, height: size * 0.14, borderRadius: size * 0.07 },
          ]}
        />
      )}
    </Animated.View>
  );
}

// ── Skin card ─────────────────────────────────────────────────────────────────

interface SkinCardProps {
  skin:     SkinConfig;
  unlocked: boolean;
  selected: boolean;
  onPress:  () => void;
}

function SkinCard({ skin, unlocked, selected, onPress }: SkinCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePress() {
    if (!unlocked) {
      // Wobble to indicate locked
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.93, duration: 60, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.04, duration: 60, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.97, duration: 50, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.00, duration: 50, useNativeDriver: true }),
      ]).start();
      speakPhrase('wrongMove');
      return;
    }
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 70, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.00, duration: 70, useNativeDriver: true }),
    ]).start(() => onPress());
    tapFeedback();
  }

  const accentColor =
    skin.id === 'rainbow' ? '#9C27B0'
    : unlocked ? skin.color
    : '#546E7A';

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.88}>
      <Animated.View
        style={[
          styles.card,
          { width: CARD_W, borderColor: selected ? '#FFD700' : 'rgba(255,255,255,0.10)' },
          selected && styles.cardSelected,
          !unlocked && styles.cardLocked,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Selected badge */}
        {selected && (
          <View style={[styles.selectedBadge, { backgroundColor: accentColor }]}>
            <Ionicons name="checkmark" size={11} color="#fff" />
            <Text style={styles.selectedBadgeTxt}>Active</Text>
          </View>
        )}

        {/* Robot preview */}
        <View style={styles.previewWrap}>
          <RobotPreview skinId={skin.id} size={68} locked={!unlocked} />

          {/* Lock overlay for locked skins */}
          {!unlocked && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={22} color="#fff" />
            </View>
          )}
        </View>

        {/* Skin name */}
        <Text style={[styles.skinName, !unlocked && styles.skinNameLocked]}>
          {skin.name}
        </Text>

        {/* Description */}
        <Text style={styles.skinDesc} numberOfLines={2}>
          {unlocked ? skin.description : `Unlock at ${skin.starsRequired} stars`}
        </Text>

        {/* Star requirement pill */}
        <View style={[styles.reqPill, { backgroundColor: unlocked ? accentColor + '33' : 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
          {skin.starsRequired === 0 ? (
            <>
              <Ionicons name="checkmark-circle" size={13} color={unlocked ? accentColor : '#78909C'} />
              <Text style={[styles.reqTxt, { color: unlocked ? accentColor : '#78909C' }]}>Default</Text>
            </>
          ) : (
            <>
              <Ionicons name="star" size={13} color={unlocked ? accentColor : '#78909C'} />
              <Text style={[styles.reqTxt, { color: unlocked ? accentColor : '#78909C' }]}>{skin.starsRequired} stars</Text>
            </>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RobotCustomizationScreen() {
  const insets = useSafeAreaInsets();

  const [totalStars,    setTotalStars]    = useState(0);
  const [unlockedSkins, setUnlockedSkins] = useState<SkinId[]>(['blue']);
  const [currentSkin,   setCurrentSkinState] = useState<SkinId>('blue');
  const [saving,        setSaving]        = useState(false);

  // Animated header robot
  const headerBounce  = useRef(new Animated.Value(0)).current;
  const titleOpacity  = useRef(new Animated.Value(0)).current;

  // ── Load data whenever screen is focused ──
  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [total, skin] = await Promise.all([getTotalStars(), getCurrentSkin()]);
        setTotalStars(total);
        setUnlockedSkins(getUnlockedSkins(total));
        setCurrentSkinState(skin);
      }
      load();
    }, []),
  );

  useEffect(() => {
    // Header bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerBounce, { toValue: -10, duration: 700, useNativeDriver: true }),
        Animated.timing(headerBounce, { toValue:   0, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
    // Title fade-in
    Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // ── Select a skin ──
  async function handleSelectSkin(skinId: SkinId) {
    if (saving || !unlockedSkins.includes(skinId)) return;
    setSaving(true);
    await setCurrentSkin(skinId);
    setCurrentSkinState(skinId);
    setSaving(false);
    soundService.play('correct');
    speakPhrase('correctMove');
  }

  // ── Progress toward next locked skin ──
  const nextLockedSkin = SKINS.find(s => !unlockedSkins.includes(s.id));
  const progressToNext = nextLockedSkin
    ? Math.min(1, totalStars / nextLockedSkin.starsRequired)
    : 1;

  const topPad = insets.top + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);

  return (
    <View style={styles.bg}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={14}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Animated.View style={{ transform: [{ translateY: headerBounce }] }}>
            <MaterialCommunityIcons
              name="robot-happy"
              size={34}
              color={currentSkin === 'blue' ? '#90CAF9'
                   : currentSkin === 'red'  ? '#EF9A9A'
                   : currentSkin === 'green'? '#A5D6A7'
                   : '#CE93D8'}
            />
          </Animated.View>
          <Animated.Text style={[styles.headerTitle, { opacity: titleOpacity }]}>
            Customize Robot
          </Animated.Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MaterialCommunityIcons name="palette" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.headerSub}>Pick your robot&apos;s look!</Text>
          </View>
        </View>

        {/* Total stars badge */}
        <View style={styles.starsBadge}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.starsBadgeTxt}> {totalStars}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Star progress banner ── */}
        <View style={styles.progressBanner}>
          <Text style={styles.progressTitle}>
            {unlockedSkins.length === SKINS.length
              ? 'All skins unlocked!'
              : `You have ${totalStars} star${totalStars !== 1 ? 's' : ''}!`}
          </Text>

          {nextLockedSkin && (
            <>
              <Text style={styles.progressSub}>
                {nextLockedSkin.starsRequired - totalStars} more stars to unlock {nextLockedSkin.name}
              </Text>
              {/* Progress bar */}
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.round(progressToNext * 100)}%` as any },
                  ]}
                />
              </View>
              <Text style={styles.progressPct}>
                {Math.round(progressToNext * 100)}%
              </Text>
            </>
          )}
        </View>

        {/* ── 2×2 skin grid ── */}
        <View style={styles.grid}>
          {SKINS.map(skin => (
            <SkinCard
              key={skin.id}
              skin={skin}
              unlocked={unlockedSkins.includes(skin.id)}
              selected={currentSkin === skin.id}
              onPress={() => handleSelectSkin(skin.id)}
            />
          ))}
        </View>

        {/* ── How to unlock tip ── */}
        <View style={styles.tipCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <MaterialCommunityIcons name="trophy" size={18} color="#FFD700" />
            <Text style={styles.tipTitle}>How to unlock skins</Text>
          </View>
          <Text style={styles.tipBody}>
            Play adventure levels and collect stars.{'\n'}
            The more stars you earn, the more robot looks you unlock!
          </Text>
          <TouchableOpacity
            style={styles.tipBtn}
            onPress={() => router.replace('/adventure-map')}
            activeOpacity={0.80}
          >
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={styles.tipBtnTxt}>Go to Adventure Map</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0F0F2E' },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#1A1A4E',
    paddingHorizontal: 16,
    paddingBottom:     14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerCenter: {
    flex:       1,
    alignItems: 'center',
    gap:        2,
  },
  headerTitle: {
    color:        '#fff',
    fontSize:     22,
    fontWeight:   'bold',
    letterSpacing: 0.4,
  },
  headerSub: {
    color:    'rgba(255,255,255,0.50)',
    fontSize: 12,
  },
  starsBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,215,0,0.18)',
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       'rgba(255,215,0,0.35)',
  },
  starsBadgeTxt: { color: '#FFD700', fontWeight: 'bold', fontSize: 15 },

  scroll: { flex: 1 },

  // Progress banner
  progressBanner: {
    backgroundColor:   '#1A1A4E',
    margin:            16,
    borderRadius:      16,
    padding:           16,
    alignItems:        'center',
    gap:               6,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.10)',
  },
  progressTitle: {
    color:      '#FFD700',
    fontSize:   18,
    fontWeight: 'bold',
    textAlign:  'center',
  },
  progressSub: {
    color:     'rgba(255,255,255,0.60)',
    fontSize:  13,
    textAlign: 'center',
  },
  progressBarBg: {
    width:           '100%',
    height:          10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius:    5,
    overflow:        'hidden',
    marginTop:       4,
  },
  progressBarFill: {
    height:          '100%',
    backgroundColor: '#FFD700',
    borderRadius:    5,
  },
  progressPct: {
    color:    'rgba(255,215,0,0.70)',
    fontSize: 11,
  },

  // Grid
  grid: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    paddingHorizontal: 16,
    gap:               16,
    justifyContent:    'space-between',
  },

  // Card
  card: {
    backgroundColor: '#1E1E4E',
    borderRadius:    20,
    padding:         14,
    alignItems:      'center',
    gap:             8,
    borderWidth:     2,
    elevation:       6,
    shadowColor:     '#6C63FF',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.30,
    shadowRadius:    8,
  },
  cardSelected: {
    borderColor:     '#FFD700',
    elevation:       12,
    shadowColor:     '#FFD700',
    shadowOpacity:   0.50,
  },
  cardLocked: {
    backgroundColor: '#12122A',
    opacity:         0.65,
  },
  selectedBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   3,
    alignSelf:         'flex-end',
    marginBottom:      -4,
  },
  selectedBadgeTxt: {
    color:      '#fff',
    fontSize:   10,
    fontWeight: 'bold',
  },

  // Preview
  previewWrap: {
    position: 'relative',
    marginVertical: 4,
  },
  previewCircle: {
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       8,
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.45,
    shadowRadius:    6,
  },
  previewDot: {
    position:        'absolute',
    top:             5,
    backgroundColor: '#FFD700',
  },
  lockOverlay: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius:    9999,
  },

  // Card text
  skinName: {
    color:      '#fff',
    fontSize:   15,
    fontWeight: 'bold',
    textAlign:  'center',
  },
  skinNameLocked: { opacity: 0.40 },
  skinDesc: {
    color:     'rgba(255,255,255,0.50)',
    fontSize:  11,
    textAlign: 'center',
    lineHeight: 15,
  },
  reqPill: {
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
    marginTop:         2,
  },
  reqTxt: {
    fontSize:   11,
    fontWeight: 'bold',
  },

  // Tip card
  tipCard: {
    backgroundColor:   '#1A1A4E',
    margin:            16,
    marginTop:         8,
    borderRadius:      16,
    padding:           16,
    gap:               8,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.08)',
  },
  tipTitle: {
    color:      '#FFD700',
    fontSize:   15,
    fontWeight: 'bold',
  },
  tipBody: {
    color:      'rgba(255,255,255,0.55)',
    fontSize:   13,
    lineHeight: 20,
  },
  tipBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    backgroundColor: '#6C63FF',
    borderRadius:    12,
    paddingVertical: 12,
    marginTop:       4,
  },
  tipBtnTxt: {
    color:      '#fff',
    fontWeight: 'bold',
    fontSize:   14,
  },
});
