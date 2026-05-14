/**
 * app/learning/numbers.tsx  →  Number Learning Game
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRobot } from '../../src/context/RobotContext';
import { useProgress } from '../../src/hooks/useProgress';
import { speakWord } from '../../src/services/robotAPI';
import {
  successFeedback,
  errorFeedback,
  tapFeedback,
} from '../../src/services/feedbackService';
import {
  NUMBER_GAME_NUMBERS,
  NUMBER_WORDS,
  COLORS,
  FONT_SIZES,
  BORDER_RADIUS,
  SPACING,
} from '../../src/utils/constants';
import { generateChoices, randomFrom } from '../../src/utils/helpers';

export default function NumberGameScreen() {
  const { robotIP } = useRobot();
  const { recordActivity } = useProgress();

  const [target,   setTarget]   = useState<number | null>(null);
  const [choices,  setChoices]  = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score,    setScore]    = useState({ correct: 0, total: 0 });
  const startRef = useRef(Date.now());
  const pulse    = useRef(new Animated.Value(1)).current;

  const playPulse = () =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ]),
      { iterations: 3 },
    ).start();

  const newRound = useCallback(() => {
    const nums    = [...NUMBER_GAME_NUMBERS];
    const correct = randomFrom(nums);
    setChoices(generateChoices(correct, nums));
    setTarget(correct);
    setFeedback(null);
    playPulse();
    if (robotIP) speakWord(robotIP, String(correct));
  }, [robotIP]);

  useEffect(() => { newRound(); }, []);

  const handleChoice = (chosen: number) => {
    if (feedback || target === null) return;
    const isCorrect = chosen === target;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setScore((p) => ({ correct: p.correct + (isCorrect ? 1 : 0), total: p.total + 1 }));
    const elapsed = Math.round((Date.now() - startRef.current) / 1_000);
    recordActivity('numbers', isCorrect, elapsed);
    startRef.current = Date.now();
    if (isCorrect) { successFeedback(); } else { errorFeedback(); }
    setTimeout(newRound, 1_400);
  };

  const renderDots = (n: number) => {
    if (n > 5) return null;
    return (
      <View style={styles.dots}>
        {Array.from({ length: n }).map((_, i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
    );
  };

  if (target === null) return null;

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.scroll}>
      {/* ── Score bar ── */}
      <View style={styles.scoreBar}>
        <View style={styles.scoreRow}>
          <Ionicons name="star" size={22} color="#FFB300" />
          <Text style={styles.scoreText}>  {score.correct} / {score.total}</Text>
        </View>
        <TouchableOpacity style={styles.skipBtn} onPress={() => { tapFeedback(); newRound(); }}>
          <Ionicons name="chevron-forward-circle-outline" size={20} color={COLORS.white} />
          <Text style={styles.skipText}>  Skip</Text>
        </TouchableOpacity>
      </View>

      {/* ── Question card ── */}
      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>Find the number:</Text>
        <Animated.Text style={[styles.bigNum, { transform: [{ scale: pulse }] }]}>
          {target}
        </Animated.Text>
        {renderDots(target)}
        <Text style={styles.wordText}>{NUMBER_WORDS[target]}</Text>
      </View>

      {/* ── Feedback ── */}
      {feedback && (
        <View style={styles.feedbackRow}>
          <Ionicons
            name={feedback === 'correct' ? 'checkmark-circle' : 'close-circle'}
            size={32}
            color={feedback === 'correct' ? COLORS.success : COLORS.danger}
          />
          <Text style={[styles.feedbackText, {
            color: feedback === 'correct' ? COLORS.success : COLORS.danger,
          }]}>
            {feedback === 'correct' ? ' Great job!' : ' Try again!'}
          </Text>
        </View>
      )}

      {/* ── Number choices ── */}
      <View style={styles.grid}>
        {choices.map((n) => (
          <TouchableOpacity
            key={n}
            style={[
              styles.numBtn,
              feedback && n === target && styles.numBtnCorrect,
              feedback && n !== target && styles.numBtnWrong,
            ]}
            onPress={() => handleChoice(n)}
            activeOpacity={0.82}
          >
            <Text style={styles.numBtnText}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md },

  scoreBar: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   SPACING.md,
  },
  scoreRow:  { flexDirection: 'row', alignItems: 'center' },
  scoreText: { fontSize: FONT_SIZES.large, fontWeight: 'bold', color: COLORS.text },
  skipBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.xs,
    borderRadius:      BORDER_RADIUS.pill,
  },
  skipText: { color: COLORS.white, fontSize: FONT_SIZES.medium, fontWeight: 'bold' },

  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius:    BORDER_RADIUS.large,
    padding:         SPACING.xl,
    alignItems:      'center',
    elevation:       4,
    shadowColor:     COLORS.black,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.12,
    shadowRadius:    4,
    marginBottom:    SPACING.md,
  },
  questionLabel: { fontSize: FONT_SIZES.large, color: COLORS.textLight },
  bigNum: {
    fontSize:   100,
    fontWeight: 'bold',
    color:      COLORS.primary,
    lineHeight: 110,
  },
  wordText: { fontSize: FONT_SIZES.large, fontWeight: 'bold', color: COLORS.text, marginTop: 4 },

  dots: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'center',
    maxWidth:       130,
    gap:            8,
    marginVertical: SPACING.sm,
  },
  dot: {
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: COLORS.secondary,
  },

  feedbackRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  feedbackText: { fontSize: FONT_SIZES.xlarge, fontWeight: 'bold' },

  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'center',
    gap:            SPACING.md,
    marginTop:      SPACING.sm,
  },
  numBtn: {
    width:           130,
    height:          130,
    borderRadius:    BORDER_RADIUS.large,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       4,
    shadowColor:     COLORS.black,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.2,
    shadowRadius:    4,
  },
  numBtnCorrect: { backgroundColor: COLORS.success },
  numBtnWrong:   { backgroundColor: '#E0E0E0' },
  numBtnText: { fontSize: 60, fontWeight: 'bold', color: COLORS.white },
});
