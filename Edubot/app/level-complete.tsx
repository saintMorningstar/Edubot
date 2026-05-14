/**
 * app/level-complete.tsx  –  Level Completion Celebration Screen
 *
 * Shown after the robot successfully reaches the goal.
 * Automatically saves the result via levelManager.
 *
 * URL params (all strings):
 *   levelId   – completed level ID (default "1")
 *   stars     – stars earned this run, "1"-"3" (default "3")
 *   commands  – comma-separated command list to send to real robot
 *               e.g. "forward,forward,turn_left,forward"
 *
 * Features:
 *   • Pure-Animated confetti burst (no external lib)
 *   • Staggered star pop-in with spring animation
 *   • Robot jumping animation
 *   • Next Level / Retry / Map navigation
 *   • "Send to Real Robot" button via robotAPI
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import EmojiIcon from '../src/components/icons/EmojiIcon';

import { LEVELS }                 from '../src/services/commandEngine';
import { saveLevelResult }        from '../src/services/levelManager';
import { MISSIONS }               from '../src/data/missions';
import { soundService }           from '../src/services/soundService';
import { speak }                  from '../src/services/voiceService';
import { tapFeedback }            from '../src/services/feedbackService';
import { loadRobotIP }            from '../src/services/storage';
import { runProgram }             from '../src/services/robotAPI';

// ── Layout ────────────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');

// ── Confetti particle system ──────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#FF922B', '#CC5DE8', '#FF61A6', '#20C997',
];
const PARTICLE_COUNT = 36;

interface Particle {
  x:        Animated.Value;
  y:        Animated.Value;
  opacity:  Animated.Value;
  rotation: Animated.Value;
  color:    string;
  size:     number;
  angle:    number;
  dist:     number;
  dur:      number;
}

function makeParticle(): Particle {
  return {
    x:        new Animated.Value(0),
    y:        new Animated.Value(0),
    opacity:  new Animated.Value(0),
    rotation: new Animated.Value(0),
    color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size:     6 + Math.random() * 9,
    angle:    Math.random() * Math.PI * 2,
    dist:     90 + Math.random() * 170,
    dur:      1100 + Math.random() * 700,
  };
}

// ── Helper messages ───────────────────────────────────────────────────────────

function starMessage(stars: number): string {
  if (stars >= 3) return 'Perfect score! You are a genius!';
  if (stars === 2) return 'Great job! Try once more for all 3 stars!';
  return 'Well done! Keep practising — you can do it!';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LevelCompleteScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    levelId?:   string;
    stars?:     string;
    commands?:  string;
    missionId?: string;   // present when completing a Mission Mode level
  }>();

  const levelId  = Math.max(1, Number(params.levelId  ?? '1'));
  const stars    = Math.min(3, Math.max(0, Number(params.stars ?? '3')));
  const cmdParam = params.commands ?? '';

  // Mission Mode helpers
  const missionId   = params.missionId ? Number(params.missionId) : null;
  const isMission   = missionId !== null;
  const missionData = isMission ? (MISSIONS.find(m => m.id === missionId) ?? null) : null;
  const nextMission = isMission ? MISSIONS.find(m => m.id === (missionId ?? 0) + 1) : null;

  // Adventure Mode helpers (only used when !isMission)
  const level     = LEVELS.find(l => l.id === levelId) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.id === levelId + 1);

  // Display values — missions use their own emoji/title
  const displayEmoji = isMission ? (missionData?.emoji ?? '🚀') : level.emoji;
  const displayTitle = isMission ? (missionData?.title ?? 'Mission Complete!') : level.title;

  // ── Animated values ──
  const starScales = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const cardScale  = useRef(new Animated.Value(0.5)).current;
  const robotJump  = useRef(new Animated.Value(0)).current;
  const particles  = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, makeParticle),
  ).current;

  // ── Robot send state ──
  const [sending,    setSending]    = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  // ── On mount: save result + trigger all animations ────────────────────────
  useEffect(() => {
    // Persist best stars only for Adventure Mode levels.
    // Mission Mode progress is saved in robot-game.tsx before navigating here.
    if (!isMission) {
      saveLevelResult(levelId, stars);
    }

    // Card pop-in spring
    Animated.spring(cardScale, {
      toValue: 1, friction: 5, tension: 70, useNativeDriver: true,
    }).start();

    // Star pop-in: stagger each star by 300 ms
    Animated.stagger(
      300,
      [0, 1, 2].slice(0, stars).map(i =>
        Animated.spring(starScales[i], {
          toValue: 1, friction: 4, tension: 80, useNativeDriver: true,
        }),
      ),
    ).start();

    // Robot jump loop
    const jumpLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(robotJump, { toValue: -28, duration: 380, useNativeDriver: true }),
        Animated.timing(robotJump, { toValue:   0, duration: 380, useNativeDriver: true }),
        Animated.delay(200),
      ]),
    );
    jumpLoop.start();

    // Confetti burst
    launchConfetti();

    // Audio / voice
    soundService.play('celebration');
    speak(
      stars >= 3  ? 'You did it! You are a superstar!'  :
      stars === 2 ? 'Great job! Amazing work!'           :
                    'Well done! You finished the level!',
      'excited',
    );

    return () => jumpLoop.stop();
  }, []);

  // ── Confetti animation ────────────────────────────────────────────────────

  function launchConfetti() {
    particles.forEach(p => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(1);
      p.rotation.setValue(0);
    });

    Animated.parallel(
      particles.map(p =>
        Animated.parallel([
          Animated.timing(p.x, {
            toValue:  Math.cos(p.angle) * p.dist,
            duration: p.dur,
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue:  Math.sin(p.angle) * p.dist - 100,
            duration: p.dur,
            useNativeDriver: true,
          }),
          // Fade out in the second half
          Animated.sequence([
            Animated.delay(p.dur * 0.45),
            Animated.timing(p.opacity, {
              toValue:  0,
              duration: p.dur * 0.55,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(p.rotation, {
            toValue:  360 + Math.random() * 1080,
            duration: p.dur,
            useNativeDriver: true,
          }),
        ]),
      ),
    ).start();
  }

  // ── Send-to-robot ─────────────────────────────────────────────────────────

  async function handleSendToRobot() {
    const ip = loadRobotIP();
    if (!ip) {
      setSendResult('No robot connected. Go to the home screen to connect!');
      return;
    }
    if (!cmdParam) {
      setSendResult('No commands to send.');
      return;
    }

    const cmds = cmdParam.split(',').filter(Boolean);
    setSending(true);
    setSendResult(null);

    try {
      await runProgram(ip, cmds, 1200);
      setSendResult('Sent to robot successfully!');
      soundService.play('correct');
      speak('Commands sent to the real robot!', 'excited');
    } catch {
      setSendResult('Could not reach the robot. Check the connection and try again.');
    } finally {
      setSending(false);
    }
  }

  // ── Navigation helpers ────────────────────────────────────────────────────

  function goNextLevel() {
    tapFeedback();
    if (isMission) {
      // Go to next mission, or back to the mission list when all done
      if (nextMission) {
        router.replace(`/robot-game?missionId=${nextMission.id}`);
      } else {
        router.replace('/mission-mode');
      }
      return;
    }
    if (nextLevel) {
      router.replace(`/robot-game?levelId=${nextLevel.id}`);
    } else {
      router.replace('/adventure-map');
    }
  }

  function goRetry() {
    tapFeedback();
    if (isMission) {
      router.replace(`/robot-game?missionId=${missionId}`);
      return;
    }
    router.replace(`/robot-game?levelId=${levelId}`);
  }

  function goMap() {
    tapFeedback();
    router.replace(isMission ? '/mission-mode' : '/adventure-map');
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const topPad = insets.top + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.bg}>

      {/* ── Confetti layer (non-interactive) ── */}
      <View
        style={[styles.confettiContainer, { top: topPad + 60 }]}
        pointerEvents="none"
      >
        {particles.map((p, i) => {
          const rotStr = p.rotation.interpolate({
            inputRange:  [0, 2160],
            outputRange: ['0deg', '2160deg'],
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  width:           p.size,
                  height:          p.size,
                  borderRadius:    p.size / 4,
                  backgroundColor: p.color,
                  opacity:         p.opacity,
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                    { rotate: rotStr },
                  ],
                },
              ]}
            />
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 20, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>

          {/* Robot */}
          <Animated.View style={{ transform: [{ translateY: robotJump }] }}>
            <MaterialCommunityIcons name="robot-happy" size={90} color="#6C63FF" />
          </Animated.View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.congrats}>Amazing!</Text>
            <MaterialCommunityIcons name="party-popper" size={32} color="#FF6B6B" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <EmojiIcon emoji={displayEmoji} size={28} />
            <Text style={styles.levelTitle}>{displayTitle}</Text>
          </View>

          {/* Star rating */}
          <View style={styles.starsRow}>
            {[0, 1, 2].map(i => (
              <Animated.View
                key={i}
                style={{ transform: [{ scale: starScales[i] }] }}
              >
                <Ionicons
                  name={i < stars ? 'star' : 'star-outline'}
                  size={48}
                  color={i < stars ? '#FFD700' : 'rgba(255,215,0,0.3)'}
                  style={{ marginHorizontal: 4 }}
                />
              </Animated.View>
            ))}
          </View>

          <Text style={styles.starMsg}>{starMessage(stars)}</Text>

          {/* ── Primary CTA ── */}
          <TouchableOpacity style={styles.primaryBtn} onPress={goNextLevel}>
            <Ionicons
              name={
                isMission
                  ? (nextMission ? 'arrow-forward-circle' : 'map-outline')
                  : (nextLevel   ? 'arrow-forward-circle' : 'map-outline')
              }
              size={24}
              color="#fff"
            />
            <Text style={styles.primaryBtnTxt}>
              {isMission
                ? (nextMission ? 'Next Mission' : 'All Missions')
                : (nextLevel   ? 'Next Level'   : 'Back to Map')}
            </Text>
          </TouchableOpacity>

          {/* ── Secondary row ── */}
          <View style={styles.secondaryRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={goRetry}>
              <Ionicons name="refresh-circle-outline" size={22} color="#fff" />
              <Text style={styles.secondaryBtnTxt}>Retry</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={goMap}>
              <Ionicons name="map-outline" size={22} color="#fff" />
              <Text style={styles.secondaryBtnTxt}>Map</Text>
            </TouchableOpacity>
          </View>

          {/* ── Divider ── */}
          <View style={styles.divider} />

          {/* ── Send to Real Robot ── */}
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnBusy]}
            onPress={handleSendToRobot}
            disabled={sending}
            activeOpacity={0.80}
          >
            <MaterialCommunityIcons
              name={sending ? 'loading' : 'robot-excited'}
              size={22}
              color="#fff"
            />
            <Text style={styles.sendBtnTxt}>
              {sending ? 'Sending to Robot…' : 'Send to Real Robot'}
            </Text>
          </TouchableOpacity>

          {sendResult !== null && (
            <View style={styles.sendResultBox}>
              <Text style={styles.sendResultTxt}>{sendResult}</Text>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg: {
    flex:            1,
    backgroundColor: '#0F0F2E',
  },

  // Confetti
  confettiContainer: {
    position:       'absolute',
    left:           W / 2,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         10,
  },
  particle: {
    position: 'absolute',
  },

  // Main scroll
  scroll: {
    flexGrow:       1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  // Card
  card: {
    width:             W - 40,
    backgroundColor:   '#1A1A4E',
    borderRadius:      28,
    paddingVertical:   36,
    paddingHorizontal: 24,
    alignItems:        'center',
    elevation:         20,
    shadowColor:       '#6C63FF',
    shadowOffset:      { width: 0, height: 8 },
    shadowOpacity:     0.50,
    shadowRadius:      20,
    zIndex:            20,
    gap:               12,
  },

  congrats: {
    fontSize:     32,
    fontWeight:   'bold',
    color:        '#FFD700',
    textAlign:    'center',
    marginTop:    4,
  },
  levelTitle: {
    fontSize:   18,
    color:      'rgba(255,255,255,0.80)',
    textAlign:  'center',
    fontWeight: '600',
  },

  // Stars
  starsRow: {
    flexDirection: 'row',
    gap:           8,
    marginTop:     4,
  },
  starEmoji: {
    fontSize: 48,
  },

  starMsg: {
    fontSize:   15,
    color:      'rgba(255,255,255,0.65)',
    textAlign:  'center',
    lineHeight: 22,
    marginTop:  4,
    paddingHorizontal: 8,
  },

  // Primary CTA
  primaryBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#4CAF50',
    borderRadius:    18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width:           '100%',
    gap:             8,
    elevation:       5,
    shadowColor:     '#4CAF50',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.45,
    shadowRadius:    8,
    marginTop:       4,
  },
  primaryBtnTxt: {
    color:      '#fff',
    fontWeight: 'bold',
    fontSize:   18,
  },

  // Secondary row
  secondaryRow: {
    flexDirection: 'row',
    gap:           12,
    width:         '100%',
  },
  secondaryBtn: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius:    14,
    paddingVertical: 13,
    gap:             6,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.18)',
  },
  secondaryBtnTxt: {
    color:      '#fff',
    fontWeight: 'bold',
    fontSize:   15,
  },

  // Divider
  divider: {
    width:           '100%',
    height:          1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginVertical:  4,
  },

  // Send to Robot
  sendBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#1565C0',
    borderRadius:    14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width:           '100%',
    gap:             8,
    elevation:       3,
    shadowColor:     '#1565C0',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.40,
    shadowRadius:    6,
  },
  sendBtnBusy: {
    backgroundColor: '#455A64',
  },
  sendBtnTxt: {
    color:      '#fff',
    fontWeight: 'bold',
    fontSize:   15,
  },

  sendResultBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius:    10,
    paddingVertical:  10,
    paddingHorizontal: 14,
    width:           '100%',
  },
  sendResultTxt: {
    color:     'rgba(255,255,255,0.75)',
    fontSize:  13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
