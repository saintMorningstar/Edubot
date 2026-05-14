/**
 * app/mission-mode.tsx  –  Mission Mode Selection Screen
 *
 * Story-driven adventure selector for children aged 1–5.
 * Displays all missions as colourful cards with unlock/progress state.
 *
 * Layout (top → bottom):
 *   Custom header  →  subtitle  →  ScrollView of mission cards
 *
 * Each card shows:
 *   large emoji  ·  title  ·  description  ·  star rating  ·  Play / Locked button
 *
 * Unlock rule: Mission 1 is always open; Mission N needs Mission N-1 completed.
 *
 * Progress is reloaded every time the screen is focused so completions from
 * robot-game.tsx take effect immediately.
 *
 * Navigation:
 *   Play → /robot-game?missionId=N
 *   Back → /dashboard
 */

import React, { useCallback, useRef, useState } from 'react';
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
import { router, useFocusEffect }          from 'expo-router';
import { useSafeAreaInsets }               from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import EmojiIcon from '../src/components/icons/EmojiIcon';

import { MISSIONS, MissionConfig }  from '../src/data/missions';
import {
  loadAllMissionProgress,
  getMissionStars,
  isMissionUnlocked,
  MissionsProgress,
}                                   from '../src/services/missionManager';
import { tapFeedback }              from '../src/services/feedbackService';
import { speak }                    from '../src/services/voiceService';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../src/utils/constants';

// ── Layout ────────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');

// ── Star display helper ───────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
  return (
    <View style={styles.starRow}>
      {[0, 1, 2].map(i => (
        <Ionicons
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={18}
          color={i < count ? '#FFD700' : 'rgba(255,215,0,0.3)'}
          style={{ marginHorizontal: 2 }}
        />
      ))}
    </View>
  );
}

// ── Mission card ──────────────────────────────────────────────────────────────

interface MissionCardProps {
  mission:   MissionConfig;
  stars:     number;           // 0–3 best stars
  unlocked:  boolean;
  index:     number;           // for stagger entrance
  onPlay:    () => void;
}

function MissionCard({ mission, stars, unlocked, index, onPlay }: MissionCardProps) {
  // Entrance animation — cards slide in from the right with a slight delay
  const slideX = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(slideX, {
        toValue:         0,
        delay:           index * 90,
        friction:        7,
        tension:         80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue:         1,
        delay:           index * 90,
        duration:        280,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const completed = stars >= 1;

  return (
    <Animated.View
      style={[
        styles.card,
        { borderLeftColor: mission.accentColor, opacity, transform: [{ translateX: slideX }] },
        !unlocked && styles.cardLocked,
      ]}
    >
      {/* ── Left: big emoji ── */}
      <View style={[styles.cardEmojiWrap, { backgroundColor: mission.accentColor + '22' }]}>
        <EmojiIcon emoji={mission.emoji} size={36} />
      </View>

      {/* ── Centre: text + stars ── */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, !unlocked && styles.textMuted]}>
            {mission.title}
          </Text>
          {completed && (
            <View style={[styles.doneBadge, { backgroundColor: mission.accentColor }]}>
              <Text style={styles.doneBadgeTxt}>Done!</Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.cardDesc, !unlocked && styles.textMuted]}
          numberOfLines={2}
        >
          {unlocked ? mission.description : 'Complete the previous mission to unlock!'}
        </Text>

        {unlocked && <StarRow count={stars} />}
      </View>

      {/* ── Right: play / lock button ── */}
      <View style={styles.cardAction}>
        {unlocked ? (
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: mission.accentColor }]}
            onPress={onPlay}
            activeOpacity={0.78}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.playBtnTxt}>Play</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.lockBtn}>
            <Ionicons name="lock-closed" size={24} color="#607D8B" />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MissionModeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);

  const [progress, setProgress] = useState<MissionsProgress>({});

  // Reload progress every time this screen is focused
  useFocusEffect(
    useCallback(() => {
      loadAllMissionProgress().then(setProgress);
    }, []),
  );

  const handlePlay = (mission: MissionConfig) => {
    tapFeedback();
    speak(`Let's go on a mission! ${mission.title}!`, 'excited');
    router.push(`/robot-game?missionId=${mission.id}`);
  };

  const totalStars = MISSIONS.reduce(
    (sum, m) => sum + getMissionStars(m.id, progress),
    0,
  );
  const maxStars = MISSIONS.length * 3;

  return (
    <View style={[styles.bg, { paddingTop: topPad }]}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { tapFeedback(); router.replace('/dashboard'); }}
          hitSlop={14}
        >
          <Ionicons name="arrow-back" size={26} color={COLORS.white} />
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="rocket-launch" size={28} color={COLORS.white} />
          <Text style={styles.headerTitle}>Mission Mode</Text>
        </View>

        {/* Stars badge */}
        <View style={styles.starsBadge}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.starsBadgeTxt}> {totalStars}/{maxStars}</Text>
        </View>
      </View>

      {/* ═══════════════ INTRO ═══════════════ */}
      <View style={styles.introCard}>
        <MaterialCommunityIcons name="robot-happy" size={36} color="#6C63FF" style={styles.introEmoji} />
        <View style={{ flex: 1 }}>
          <Text style={styles.introTitle}>Story Adventures!</Text>
          <Text style={styles.introDesc}>
            Help the robot complete exciting missions. Each one is a new story!
          </Text>
        </View>
      </View>

      {/* ═══════════════ MISSION LIST ═══════════════ */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {MISSIONS.map((mission, index) => {
          const stars    = getMissionStars(mission.id, progress);
          const unlocked = isMissionUnlocked(mission.id, progress);

          return (
            <MissionCard
              key={mission.id}
              mission={mission}
              stars={stars}
              unlocked={unlocked}
              index={index}
              onPlay={() => handlePlay(mission)}
            />
          );
        })}

        {/* Bottom padding so last card clears the safe area */}
        <View style={{ height: insets.bottom + SPACING.xl }} />
      </ScrollView>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg: {
    flex:            1,
    backgroundColor: '#0A0A2E',
  },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#6C63FF',
    paddingVertical:   14,
    paddingHorizontal: SPACING.md,
    elevation:         6,
    shadowColor:       '#6C63FF',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.45,
    shadowRadius:      8,
  },
  backBtn: {
    padding:     4,
    marginRight: 4,
  },
  headerCenter: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  headerTitle: {
    color:      COLORS.white,
    fontSize:   FONT_SIZES.xlarge,
    fontWeight: 'bold',
  },
  starsBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.18)',
    borderRadius:      BORDER_RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  starsBadgeTxt: {
    color:      COLORS.white,
    fontWeight: 'bold',
    fontSize:   13,
  },

  // Intro card
  introCard: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(108,99,255,0.18)',
    marginHorizontal:  SPACING.md,
    marginTop:         SPACING.md,
    marginBottom:      SPACING.sm,
    borderRadius:      BORDER_RADIUS.large,
    padding:           SPACING.md,
    gap:               SPACING.md,
    borderWidth:       1,
    borderColor:       'rgba(108,99,255,0.30)',
  },
  introEmoji: {
    fontSize: 44,
  },
  introTitle: {
    color:      COLORS.white,
    fontSize:   FONT_SIZES.large,
    fontWeight: 'bold',
  },
  introDesc: {
    color:      'rgba(255,255,255,0.65)',
    fontSize:   FONT_SIZES.small,
    marginTop:  2,
    lineHeight: 18,
  },

  // Mission list
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.sm,
  },

  // Mission card
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#1A1A4E',
    borderRadius:    BORDER_RADIUS.large,
    borderLeftWidth: 5,
    marginBottom:    SPACING.md,
    padding:         SPACING.md,
    gap:             SPACING.md,
    elevation:       4,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.30,
    shadowRadius:    6,
  },
  cardLocked: {
    opacity: 0.50,
  },
  cardEmojiWrap: {
    width:          60,
    height:         60,
    borderRadius:   30,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardBody: {
    flex: 1,
    gap:  4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    flexWrap:      'wrap',
  },
  cardTitle: {
    color:      COLORS.white,
    fontSize:   FONT_SIZES.medium,
    fontWeight: 'bold',
  },
  cardDesc: {
    color:      'rgba(255,255,255,0.60)',
    fontSize:   FONT_SIZES.small,
    lineHeight: 18,
  },
  textMuted: {
    color: 'rgba(255,255,255,0.35)',
  },

  // "Done!" badge
  doneBadge: {
    borderRadius:      BORDER_RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  doneBadgeTxt: {
    color:      '#fff',
    fontSize:   10,
    fontWeight: 'bold',
  },

  // Stars
  starRow: {
    flexDirection: 'row',
    gap:           2,
    marginTop:     2,
  },
  starChar: {
    fontSize: 14,
    color:    'rgba(255,255,255,0.25)',
  },
  starCharFilled: {
    color: '#FFD700',
  },

  // Play button
  cardAction: {
    flexShrink:     0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  playBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    borderRadius:    BORDER_RADIUS.large,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap:             5,
    elevation:       3,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.30,
    shadowRadius:    4,
  },
  playBtnTxt: {
    color:      '#fff',
    fontWeight: 'bold',
    fontSize:   FONT_SIZES.medium,
  },
  lockBtn: {
    width:          52,
    height:         52,
    borderRadius:   26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  lockEmoji: {
    fontSize: 24,
  },
});
