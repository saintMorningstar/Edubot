/**
 * app/adventure-map.tsx  –  Adventure Mode Level Selection Map
 *
 * Displays two worlds (Forest & Desert), each with 3 level cards.
 * Progress is loaded from AsyncStorage via levelManager.
 *
 * Navigation:
 *   Tap a level card → /robot-game?levelId=N
 *   Tap Free Play    → /robot-game?freePlay=true
 *   Back arrow       → previous screen
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import EmojiIcon from '../src/components/icons/EmojiIcon';

import { LEVELS, LevelConfig } from '../src/services/commandEngine';
import {
  loadAllProgress,
  AdventureProgress,
  getStars,
  isUnlocked,
} from '../src/services/levelManager';
import { tapFeedback }        from '../src/services/feedbackService';
import { speak }              from '../src/services/voiceService';
import StarDisplay            from '../src/components/game/StarDisplay';

// ── Layout constants ──────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');
// 3 cards per row with padding + gaps
const CARD_SIZE  = Math.floor((W - 32 - 16) / 3);

// ── World definitions ─────────────────────────────────────────────────────────

const WORLDS = [
  {
    id:       1,
    name:     'Forest World',
    iconLib:  'mci' as 'ion' | 'mci',
    iconName: 'tree',
    bgColor:  '#1B5E20',
    accent:   '#66BB6A',
    subtitle: 'Learn the basics!',
    levelIds: [1, 2, 3],
  },
  {
    id:       2,
    name:     'Desert World',
    iconLib:  'mci' as 'ion' | 'mci',
    iconName: 'terrain',
    bgColor:  '#BF360C',
    accent:   '#FFA726',
    subtitle: 'Face bigger challenges!',
    levelIds: [4, 5, 6],
  },
] as const;

// ── LevelCard sub-component ───────────────────────────────────────────────────

interface LevelCardProps {
  level:    LevelConfig;
  stars:    number;       // 0-3 best stars
  unlocked: boolean;
  onPress:  () => void;
  accent:   string;
}

function LevelCard({ level, stars, unlocked, onPress, accent }: LevelCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    if (!unlocked) {
      // Shake to indicate locked
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.05, duration: 70, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.92, duration: 60, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.00, duration: 60, useNativeDriver: true }),
      ]).start();
      speak('Finish the level before this one first!', 'calm');
      return;
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.00, duration: 60, useNativeDriver: true }),
    ]).start(() => onPress());
    tapFeedback();
  }

  const completed = stars > 0;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.cardTouch}>
      <Animated.View
        style={[
          styles.card,
          { width: CARD_SIZE, height: CARD_SIZE + 20 },
          completed && { borderColor: accent, borderWidth: 2.5 },
          !unlocked  && styles.cardLocked,
          { transform: [{ scale }] },
        ]}
      >
        {unlocked ? (
          <>
            {/* Completed badge */}
            {completed && (
              <View style={[styles.completedBadge, { backgroundColor: accent }]}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}

            <EmojiIcon emoji={level.emoji} size={28} />

            <Text style={styles.cardLevelNum}>Lv {level.id}</Text>

            <Text style={styles.cardTitle} numberOfLines={2}>
              {level.title}
            </Text>

            <View style={styles.cardStars}>
              <StarDisplay earned={stars} size={14} />
            </View>
          </>
        ) : (
          /* Locked state */
          <>
            <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.35)" />
            <Text style={styles.cardLevelNum}>Lv {level.id}</Text>
            <Text style={[styles.cardTitle, styles.lockedText]}>???</Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AdventureMapScreen() {
  const insets       = useSafeAreaInsets();
  const [progress, setProgress] = useState<AdventureProgress>({});
  const [refreshing, setRefreshing] = useState(false);

  // Robot header bounce
  const robotBounce = useRef(new Animated.Value(0)).current;
  // Title fade-in
  const titleOpacity = useRef(new Animated.Value(0)).current;

  // ── Load progress whenever screen is focused (catches level completions)
  useFocusEffect(
    useCallback(() => {
      loadAllProgress().then(setProgress);
    }, []),
  );

  useEffect(() => {
    // Idle robot bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(robotBounce, { toValue: -10, duration: 700, useNativeDriver: true }),
        Animated.timing(robotBounce, { toValue:   0, duration: 700, useNativeDriver: true }),
      ]),
    ).start();

    // Title fade in
    Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    speak('Choose a level!', 'excited');
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const p = await loadAllProgress();
    setProgress(p);
    setRefreshing(false);
  };

  const handleLevelPress = (levelId: number) => {
    router.push(`/robot-game?levelId=${levelId}`);
  };

  const handleFreePlay = () => {
    tapFeedback();
    speak("Let's explore freely!", 'excited');
    router.push('/robot-game?freePlay=true');
  };

  const topPad = insets.top + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);

  // Count total stars for the header badge
  const totalStars = LEVELS.reduce((sum, l) => sum + getStars(l.id, progress), 0);

  return (
    <View style={styles.bg}>

      {/* ═══════════ HEADER ═══════════ */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={14}
        >
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Animated.View style={{ transform: [{ translateY: robotBounce }] }}>
            <MaterialCommunityIcons name="robot-happy" size={36} color="#FFD700" />
          </Animated.View>
          <Animated.Text style={[styles.headerTitle, { opacity: titleOpacity }]}>
            Adventure Map
          </Animated.Text>
          <Text style={styles.headerSub}>Pick your mission!</Text>
        </View>

        {/* Total-stars badge */}
        <View style={styles.totalStarsBadge}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.totalStarsTxt}> {totalStars}</Text>
          <Text style={styles.totalStarsMax}>/ {LEVELS.length * 3}</Text>
        </View>

      </View>

      {/* ═══════════ SCROLLABLE CONTENT ═══════════ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop:    16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >

        {/* ── Worlds ── */}
        {WORLDS.map(world => {
          const worldLevels  = LEVELS.filter(l => l.worldId === world.id);
          const worldStars   = worldLevels.reduce((s, l) => s + getStars(l.id, progress), 0);
          const worldMaxStar = worldLevels.length * 3;
          const worldUnlocked = worldLevels.some(l => isUnlocked(l.id, progress));

          return (
            <View key={world.id} style={styles.worldSection}>

              {/* World banner */}
              <View style={[styles.worldBanner, { backgroundColor: world.bgColor }]}>
                <View style={styles.worldEmoji}>
                  {world.iconLib === 'ion'
                    ? <Ionicons name={world.iconName as any} size={32} color="#fff" />
                    : <MaterialCommunityIcons name={world.iconName as any} size={32} color="#fff" />
                  }
                </View>
                <View style={styles.worldBannerText}>
                  <Text style={styles.worldName}>{world.name}</Text>
                  <Text style={styles.worldSubtitle}>{world.subtitle}</Text>
                </View>
                <View style={styles.worldStarsBadge}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.worldStarsTxt}> {worldStars}/{worldMaxStar}</Text>
                </View>
              </View>

              {/* Level cards row */}
              <View style={[styles.levelsRow, { backgroundColor: world.bgColor + '18' }]}>
                {worldLevels.map(level => (
                  <LevelCard
                    key={level.id}
                    level={level}
                    stars={getStars(level.id, progress)}
                    unlocked={isUnlocked(level.id, progress)}
                    accent={world.accent}
                    onPress={() => handleLevelPress(level.id)}
                  />
                ))}
              </View>

            </View>
          );
        })}

        {/* ── Free Play card ── */}
        <TouchableOpacity
          style={styles.freePlayCard}
          onPress={handleFreePlay}
          activeOpacity={0.82}
        >
          <View style={styles.freePlayIcon}>
            <MaterialCommunityIcons name="controller-classic" size={36} color="#fff" />
          </View>
          <View style={styles.freePlayTexts}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.freePlayTitle}>Free Play Mode</Text>
            <MaterialCommunityIcons name="party-popper" size={20} color="#fff" />
          </View>
            <Text style={styles.freePlaySub}>
              No rules — just explore and have fun!
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={26} color="rgba(255,255,255,0.65)" />
        </TouchableOpacity>

        {/* ── Tip card ── */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color="#F9A825" />
          <Text style={styles.tipText}>
            {'  '}Tip: Complete levels to unlock new worlds! Collect all stars for a perfect score.
          </Text>
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
  backBtn:     { padding: 4, marginRight: 8 },
  headerCenter: {
    flex:       1,
    alignItems: 'center',
    gap:        2,
  },
  headerTitle: {
    color:        '#fff',
    fontSize:     22,
    fontWeight:   'bold',
    letterSpacing: 0.5,
  },
  headerSub: {
    color:    'rgba(255,255,255,0.50)',
    fontSize: 12,
  },
  totalStarsBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,215,0,0.18)',
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       'rgba(255,215,0,0.35)',
  },
  totalStarsTxt: { color: '#FFD700', fontWeight: 'bold', fontSize: 14 },
  totalStarsMax: { color: 'rgba(255,215,0,0.55)', fontSize: 10 },

  // Scroll
  scroll: { flex: 1 },

  // World section
  worldSection: {
    marginHorizontal: 16,
    marginBottom:     20,
    borderRadius:     16,
    overflow:         'hidden',
    elevation:        4,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 3 },
    shadowOpacity:    0.30,
    shadowRadius:     6,
  },
  worldBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    gap:               12,
  },
  worldEmoji:       { width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const },
  worldBannerText:  { flex: 1 },
  worldName: {
    color:      '#fff',
    fontSize:   18,
    fontWeight: 'bold',
  },
  worldSubtitle: {
    color:    'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 1,
  },
  worldStarsBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.15)',
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  worldStarsTxt: { color: '#FFD700', fontWeight: 'bold', fontSize: 13 },

  // Level cards row
  levelsRow: {
    flexDirection:     'row',
    justifyContent:    'space-around',
    paddingHorizontal: 8,
    paddingVertical:   14,
  },
  cardTouch: {},
  card: {
    backgroundColor: '#1E1E4A',
    borderRadius:    14,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         8,
    elevation:       4,
    shadowColor:     '#6C63FF',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.35,
    shadowRadius:    6,
    gap:             4,
    borderWidth:     1.5,
    borderColor:     'rgba(255,255,255,0.12)',
  },
  cardLocked: {
    backgroundColor: '#12122A',
    borderColor:     'rgba(255,255,255,0.06)',
    opacity:         0.60,
  },
  completedBadge: {
    position:     'absolute',
    top:          6,
    right:        6,
    width:        18,
    height:       18,
    borderRadius: 9,
    alignItems:   'center',
    justifyContent: 'center',
  },
  cardEmoji:    { fontSize: 22 },
  cardLevelNum: { color: 'rgba(255,255,255,0.50)', fontSize: 10, fontWeight: 'bold' },
  cardTitle: {
    color:     '#fff',
    fontSize:  11,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
  },
  lockedText: { opacity: 0.3 },
  cardStars:  { marginTop: 2 },

  // Free Play
  freePlayCard: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#7B2D8B',
    marginHorizontal:  16,
    borderRadius:      16,
    paddingHorizontal: 16,
    paddingVertical:   18,
    marginBottom:      16,
    gap:               14,
    elevation:         5,
    shadowColor:       '#7B2D8B',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.50,
    shadowRadius:      8,
  },
  freePlayIcon: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  freePlayTexts:  { flex: 1 },
  freePlayTitle: {
    color:      '#fff',
    fontSize:   17,
    fontWeight: 'bold',
  },
  freePlaySub: {
    color:    'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 2,
  },

  // Tip
  tipCard: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    backgroundColor:   'rgba(255,255,255,0.06)',
    marginHorizontal:  16,
    borderRadius:      12,
    paddingHorizontal: 14,
    paddingVertical:   12,
    marginBottom:      8,
  },
  tipText: {
    color:      'rgba(255,255,255,0.55)',
    fontSize:   13,
    flex:       1,
    lineHeight: 19,
  },
});
