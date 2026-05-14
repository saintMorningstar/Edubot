

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProgress } from '../src/hooks/useProgress';
import ProgressBar from '../src/components/ProgressBar';
import AppIcon from '../src/components/AppIcon';
import EdubotDialog from '../src/components/EdubotDialog';
import { tapFeedback } from '../src/services/feedbackService';
import { ACTIVITIES, COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../src/utils/constants';
import { formatTime } from '../src/utils/helpers';



function StatPill({ label, value, iconName }: { label: string; value: string | number; iconName: string }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={iconName as any} size={28} color={COLORS.white} style={{ marginBottom: SPACING.xs }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}



export default function ProgressScreen() {
  const {
    progress,
    loading,
    reset,
    getAccuracy,
    totalCompleted,
    totalTimeSpent,
  } = useProgress();

  const [showResetDlg, setShowResetDlg] = useState(false);

  const handleReset = () => {
    tapFeedback();
    setShowResetDlg(true);
  };

  if (loading || !progress) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const activityList = Object.values(ACTIVITIES);

  return (
    <View style={styles.root}>
    <ScrollView style={styles.bg} contentContainerStyle={styles.scroll}>
     
      <View style={styles.hero}>
        <View style={styles.heroIconCircle}>
          <Ionicons name="star" size={52} color="#FFB300" />
        </View>
        <Text style={styles.heroTitle}>Learning Progress</Text>

        <View style={styles.heroStats}>
          <StatPill
            label="Activities Done"
            value={totalCompleted}
            iconName="checkmark-done-circle-outline"
          />
          <StatPill
            label="Time Spent"
            value={formatTime(totalTimeSpent)}
            iconName="time-outline"
          />
        </View>
      </View>

     
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Accuracy by Subject</Text>
        {activityList.map((act) => (
          <ProgressBar
            key={act.key}
            label={act.label}
            percent={getAccuracy(act.key)}
            color={act.color}
            completed={progress[act.key]?.completed ?? 0}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Details</Text>
      {activityList.map((act) => {
        const data = progress[act.key];
        return (
          <View key={act.key} style={[styles.detailCard, { borderLeftColor: act.color }]}>
           
            <View style={styles.detailHeader}>
              <View style={[styles.detailIconCircle, { backgroundColor: act.color + '22' }]}>
                <AppIcon
                  family={act.iconFamily}
                  name={act.iconName}
                  size={24}
                  color={act.color}
                />
              </View>
              <Text style={styles.detailTitle}>{act.label}</Text>
            </View>

            {[
              { label: 'Total attempts:',  value: String(data.completed),          color: COLORS.text    },
              { label: 'Correct answers:', value: String(data.correct),            color: COLORS.success },
              { label: 'Accuracy:',        value: `${getAccuracy(act.key)}%`,      color: act.color      },
              { label: 'Time spent:',      value: formatTime(data.timeSpent),      color: COLORS.text    },
            ].map((row) => (
              <View key={row.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={[styles.detailValue, { color: row.color }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        );
      })}

      
      <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
        <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
        <Text style={styles.resetText}>  Reset All Progress</Text>
      </TouchableOpacity>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>

    {/* ── Reset confirmation dialog ── */}
    <EdubotDialog
      visible={showResetDlg}
      iconName="trash-outline"
      iconColor={COLORS.danger}
      title="Reset All Progress?"
      message="This will clear every learning record. This cannot be undone."
      confirmText="Reset"
      confirmColor={COLORS.danger}
      onConfirm={() => { reset(); setShowResetDlg(false); }}
      cancelText="Cancel"
      onCancel={() => setShowResetDlg(false)}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  bg:         { flex: 1, backgroundColor: COLORS.background },
  scroll:     { padding: SPACING.lg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: {
    backgroundColor: COLORS.primary,
    borderRadius:    BORDER_RADIUS.large,
    padding:         SPACING.lg,
    alignItems:      'center',
    marginBottom:    SPACING.lg,
    elevation:       5,
    shadowColor:     COLORS.primary,
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.3,
    shadowRadius:    6,
  },
  heroIconCircle: {
    width:           90,
    height:          90,
    borderRadius:    45,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth:     2,
    borderColor:     'rgba(255,255,255,0.4)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    SPACING.md,
  },
  heroTitle: {
    fontSize:       FONT_SIZES.xlarge,
    fontWeight:     'bold',
    color:          COLORS.white,
    marginBottom:   SPACING.md,
  },
  heroStats: { flexDirection: 'row', gap: SPACING.lg },
  statPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius:    BORDER_RADIUS.medium,
    padding:         SPACING.md,
    alignItems:      'center',
    minWidth:        110,
  },
  statValue: { fontSize: FONT_SIZES.xlarge, fontWeight: 'bold', color: COLORS.white },
  statLabel: { fontSize: FONT_SIZES.small, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  card: {
    backgroundColor: COLORS.white,
    borderRadius:    BORDER_RADIUS.large,
    padding:         SPACING.lg,
    marginBottom:    SPACING.lg,
    elevation:       3,
    shadowColor:     COLORS.black,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.1,
    shadowRadius:    4,
  },
  sectionTitle: {
    fontSize:     FONT_SIZES.large,
    fontWeight:   'bold',
    color:        COLORS.text,
    marginBottom: SPACING.md,
  },

  detailCard: {
    backgroundColor: COLORS.white,
    borderRadius:    BORDER_RADIUS.medium,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    borderLeftWidth: 5,
    elevation:       2,
    shadowColor:     COLORS.black,
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.08,
    shadowRadius:    3,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  SPACING.sm,
    gap:           SPACING.sm,
  },
  detailIconCircle: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
  },
  detailTitle: { fontSize: FONT_SIZES.large, fontWeight: 'bold', color: COLORS.text },
  detailRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   4,
  },
  detailLabel: { fontSize: FONT_SIZES.medium, color: COLORS.textLight },
  detailValue: { fontSize: FONT_SIZES.medium, fontWeight: 'bold' },

  resetBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        SPACING.md,
    marginTop:      SPACING.md,
    borderWidth:    2,
    borderColor:    COLORS.danger,
    borderRadius:   BORDER_RADIUS.medium,
  },
  resetText: { color: COLORS.danger, fontSize: FONT_SIZES.medium, fontWeight: 'bold' },
});
