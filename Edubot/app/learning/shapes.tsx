/**
 * app/learning/shapes.tsx  →  Shape Learning Game
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
  SHAPE_GAME_SHAPES,
  ShapeItem,
  COLORS,
  FONT_SIZES,
  BORDER_RADIUS,
  SPACING,
} from '../../src/utils/constants';
import { randomFrom, shuffle } from '../../src/utils/helpers';

// Vibrant palette for the choice cards
const PALETTE = ['#F44336', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#E91E63'];

export default function ShapeGameScreen() {
  const { robotIP } = useRobot();
  const { recordActivity } = useProgress();

  const [target,   setTarget]   = useState<ShapeItem | null>(null);
  const [choices,  setChoices]  = useState<ShapeItem[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score,    setScore]    = useState({ correct: 0, total: 0 });
  const startRef = useRef(Date.now());

  const newRound = useCallback(() => {
    const correct = randomFrom(SHAPE_GAME_SHAPES);
    const others  = shuffle(SHAPE_GAME_SHAPES.filter((s) => s.name !== correct.name)).slice(0, 3);
    setChoices(shuffle([correct, ...others] as ShapeItem[]));
    setTarget(correct);
    setFeedback(null);
    if (robotIP) speakWord(robotIP, correct.name);
  }, [robotIP]);

  useEffect(() => { newRound(); }, []);

  const handleChoice = (chosen: ShapeItem) => {
    if (feedback || !target) return;
    const isCorrect = chosen.name === target.name;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setScore((p) => ({ correct: p.correct + (isCorrect ? 1 : 0), total: p.total + 1 }));
    const elapsed = Math.round((Date.now() - startRef.current) / 1_000);
    recordActivity('shapes', isCorrect, elapsed);
    startRef.current = Date.now();
    if (isCorrect) { successFeedback(); } else { errorFeedback(); }
    setTimeout(newRound, 1_400);
  };

  if (!target) return null;

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
        <Text style={styles.questionLabel}>Tap the shape called:</Text>
        <Text style={styles.shapeName}>{target.name.toUpperCase()}</Text>
        <Text style={styles.shapeDesc}>{target.description}</Text>

        {/* Show the target shape icon as a big preview */}
        <View style={styles.previewCircle}>
          <Ionicons
            name={target.iconName as React.ComponentProps<typeof Ionicons>['name']}
            size={64}
            color={COLORS.primary}
          />
        </View>
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
            {feedback === 'correct' ? ' You got it!' : ' Not quite!'}
          </Text>
        </View>
      )}

      {/* ── Shape choices ── */}
      <View style={styles.grid}>
        {choices.map((shape, idx) => (
          <TouchableOpacity
            key={shape.name}
            style={[
              styles.shapeBtn,
              { backgroundColor: PALETTE[idx % PALETTE.length] },
              feedback && shape.name === target.name && styles.correctHighlight,
            ]}
            onPress={() => handleChoice(shape)}
            activeOpacity={0.82}
          >
            {/* White icon circle */}
            <View style={styles.shapeBtnIconCircle}>
              <Ionicons
                name={shape.iconName as React.ComponentProps<typeof Ionicons>['name']}
                size={42}
                color={PALETTE[idx % PALETTE.length]}
              />
            </View>
            <Text style={styles.shapeBtnLabel}>{shape.name}</Text>
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
  questionLabel: { fontSize: FONT_SIZES.large, color: COLORS.textLight, marginBottom: SPACING.sm },
  shapeName: { fontSize: FONT_SIZES.xxlarge, fontWeight: 'bold', color: COLORS.primary, marginBottom: SPACING.sm },
  shapeDesc: { fontSize: FONT_SIZES.medium, color: COLORS.textLight },
  previewCircle: {
    width:           100,
    height:          100,
    borderRadius:    50,
    backgroundColor: COLORS.primary + '18',
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       SPACING.md,
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
  },
  shapeBtn: {
    width:          150,
    height:         160,
    borderRadius:   BORDER_RADIUS.large,
    alignItems:     'center',
    justifyContent: 'center',
    elevation:      4,
    shadowColor:    COLORS.black,
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.2,
    shadowRadius:   4,
  },
  correctHighlight: { borderWidth: 6, borderColor: COLORS.success },
  shapeBtnIconCircle: {
    width:           76,
    height:          76,
    borderRadius:    38,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    SPACING.sm,
  },
  shapeBtnLabel: {
    color:      COLORS.white,
    fontSize:   FONT_SIZES.medium,
    fontWeight: 'bold',
  },
});
