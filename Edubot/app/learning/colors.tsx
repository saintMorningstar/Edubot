/**
 * app/learning/colors.tsx  →  Color Learning Game
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRobot } from '../../src/context/RobotContext';
import { useProgress } from '../../src/hooks/useProgress';
import { showColor, speakWord } from '../../src/services/robotAPI';
import {
  successFeedback,
  errorFeedback,
  tapFeedback,
} from '../../src/services/feedbackService';
import {
  COLOR_GAME_COLORS,
  ColorItem,
  COLORS,
  FONT_SIZES,
  BORDER_RADIUS,
  SPACING,
} from '../../src/utils/constants';
import { randomFrom, shuffle } from '../../src/utils/helpers';

export default function ColorGameScreen() {
  const { robotIP } = useRobot();
  const { recordActivity } = useProgress();

  const [target,   setTarget]   = useState<ColorItem | null>(null);
  const [choices,  setChoices]  = useState<ColorItem[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score,    setScore]    = useState({ correct: 0, total: 0 });
  const startRef = useRef(Date.now());
  const bounce   = useRef(new Animated.Value(1)).current;

  const playBounce = () =>
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.15, duration: 90,  useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();

  const newRound = useCallback(() => {
    const correct = randomFrom(COLOR_GAME_COLORS);
    const others  = shuffle(COLOR_GAME_COLORS.filter((c) => c.name !== correct.name)).slice(0, 3);
    setChoices(shuffle([correct, ...others] as ColorItem[]));
    setTarget(correct);
    setFeedback(null);
    if (robotIP) { showColor(robotIP, correct.command); speakWord(robotIP, correct.name); }
  }, [robotIP]);

  useEffect(() => { newRound(); }, []);

  const handleChoice = (chosen: ColorItem) => {
    if (feedback || !target) return;
    const isCorrect = chosen.name === target.name;
    playBounce();
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setScore((p) => ({ correct: p.correct + (isCorrect ? 1 : 0), total: p.total + 1 }));
    const elapsed = Math.round((Date.now() - startRef.current) / 1_000);
    recordActivity('colors', isCorrect, elapsed);
    startRef.current = Date.now();
    if (isCorrect) { successFeedback(); } else { errorFeedback(); }
    setTimeout(newRound, 1_400);
  };

  if (!target) return null;

  return (
    <View style={styles.bg}>
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
      <Animated.View style={[styles.questionCard, { transform: [{ scale: bounce }] }]}>
        <Text style={styles.questionLabel}>Which one is…</Text>
        <Text style={[styles.colourName, { color: target.value }]}>
          {target.name.toUpperCase()}?
        </Text>
        {/* Colour swatch */}
        <View style={[styles.swatch, { backgroundColor: target.value }]} />
      </Animated.View>

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
            {feedback === 'correct' ? ' Correct! Well done!' : ' Try again!'}
          </Text>
        </View>
      )}

      {/* ── Colour choices ── */}
      <View style={styles.grid}>
        {choices.map((c) => (
          <TouchableOpacity
            key={c.name}
            style={[
              styles.colourBtn,
              { backgroundColor: c.value },
              feedback && c.name === target.name && styles.correctHighlight,
            ]}
            onPress={() => handleChoice(c)}
            activeOpacity={0.82}
          >
            {/* Colour name label on a semi-transparent pill */}
            <View style={styles.colourLabelPill}>
              <Text style={styles.colourBtnText}>{c.name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.background },

  scoreBar: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    padding:         SPACING.md,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
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
    backgroundColor:  COLORS.white,
    borderRadius:     BORDER_RADIUS.large,
    padding:          SPACING.xl,
    marginHorizontal: SPACING.md,
    alignItems:       'center',
    elevation:        4,
    shadowColor:      COLORS.black,
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.12,
    shadowRadius:     5,
  },
  questionLabel: { fontSize: FONT_SIZES.large, color: COLORS.textLight },
  colourName: {
    fontSize:       FONT_SIZES.xxlarge,
    fontWeight:     'bold',
    marginVertical: SPACING.sm,
  },
  swatch: {
    width:        80,
    height:       80,
    borderRadius: BORDER_RADIUS.large,
    borderWidth:  3,
    borderColor:  '#ddd',
    marginTop:    SPACING.sm,
  },

  feedbackRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  feedbackText: {
    fontSize:   FONT_SIZES.xlarge,
    fontWeight: 'bold',
  },

  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'center',
    padding:        SPACING.md,
    gap:            SPACING.md,
  },
  colourBtn: {
    width:          145,
    height:         145,
    borderRadius:   BORDER_RADIUS.large,
    alignItems:     'center',
    justifyContent: 'flex-end',
    paddingBottom:  SPACING.md,
    elevation:      4,
    shadowColor:    COLORS.black,
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.2,
    shadowRadius:   4,
  },
  colourLabelPill: {
    backgroundColor:   'rgba(0,0,0,0.35)',
    paddingHorizontal: SPACING.sm,
    paddingVertical:   SPACING.xs,
    borderRadius:      BORDER_RADIUS.pill,
  },
  colourBtnText: {
    color:      COLORS.white,
    fontSize:   FONT_SIZES.medium,
    fontWeight: 'bold',
  },
  correctHighlight: { borderWidth: 6, borderColor: COLORS.success },
});
