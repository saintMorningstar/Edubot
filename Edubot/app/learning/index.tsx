/**
 * app/learning/index.tsx  →  Learning Menu Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import AppIcon from '../../src/components/AppIcon';
import { COLORS, FONT_SIZES, BORDER_RADIUS, SPACING, ACTIVITIES } from '../../src/utils/constants';

const MENU = [
  {
    ...ACTIVITIES.colors,
    description: 'Learn red, blue, green and more!',
    route:       '/learning/colors',
  },
  {
    ...ACTIVITIES.numbers,
    description: 'Count numbers 1 to 10!',
    route:       '/learning/numbers',
  },
  {
    ...ACTIVITIES.shapes,
    description: 'Discover circles, squares & more!',
    route:       '/learning/shapes',
  },
  {
    ...ACTIVITIES.coding,
    description: 'Make your robot follow your plan!',
    route:       '/coding',
  },
] as const;

export default function LearningMenuScreen() {
  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>What shall we learn today?</Text>
      <Text style={styles.subtitle}>Tap an activity to start!</Text>

      <View style={styles.grid}>
        {MENU.map((act) => (
          <TouchableOpacity
            key={act.key}
            style={[styles.card, { backgroundColor: act.color }]}
            onPress={() => router.push(act.route as any)}
            activeOpacity={0.82}
          >
            {/* Large icon circle */}
            <View style={styles.iconCircle}>
              <AppIcon
                family={act.iconFamily}
                name={act.iconName}
                size={52}
                color={act.color}
              />
            </View>
            <Text style={styles.cardLabel}>{act.label}</Text>
            <Text style={styles.cardDesc}>{act.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, alignItems: 'center' },

  title: {
    fontSize:     FONT_SIZES.xlarge,
    fontWeight:   'bold',
    color:        COLORS.text,
    textAlign:    'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize:     FONT_SIZES.medium,
    color:        COLORS.textLight,
    marginBottom: SPACING.xl,
  },

  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            SPACING.lg,
    justifyContent: 'center',
  },
  card: {
    width:          160,
    minHeight:      185,
    borderRadius:   BORDER_RADIUS.large,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        SPACING.md,
    elevation:      5,
    shadowColor:    COLORS.black,
    shadowOffset:   { width: 0, height: 3 },
    shadowOpacity:  0.22,
    shadowRadius:   6,
  },
  iconCircle: {
    width:           86,
    height:          86,
    borderRadius:    43,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    SPACING.md,
  },
  cardLabel: {
    fontSize:   FONT_SIZES.large,
    fontWeight: 'bold',
    color:      COLORS.white,
    textAlign:  'center',
  },
  cardDesc: {
    fontSize:  FONT_SIZES.small,
    color:     'rgba(255,255,255,0.88)',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
