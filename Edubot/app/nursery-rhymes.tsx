import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRobot } from '../src/context/RobotContext';
import { THEME } from '../src/utils/theme';
import AnimatedBackground from '../src/components/ui/AnimatedBackground';
import EdubotDialog from '../src/components/EdubotDialog';

const S = THEME;
const { width: W } = Dimensions.get('window');
const CARD_W = (W - S.spacing.lg * 2 - S.spacing.md) / 2;

// ─── Rhyme data ───────────────────────────────────────────────────────────────

interface RhymeCard {
  id:       string;
  title:    string;
  iconName: string;
  iconFam:  'Ionicons' | 'MaterialCommunityIcons';
  color:    string;
  lines:    string;   // short preview line
}

const RHYMES: RhymeCard[] = [
  {
    id:       'twinkle',
    title:    'Twinkle Little Star',
    iconName: 'star',
    iconFam:  'Ionicons',
    color:    '#F59E0B',
    lines:    'Twinkle, twinkle, little star...',
  },
  {
    id:       'humpty',
    title:    'Humpty Dumpty',
    iconName: 'egg-outline',
    iconFam:  'MaterialCommunityIcons',
    color:    '#F97316',
    lines:    'Humpty Dumpty sat on a wall...',
  },
  {
    id:       'baa_baa',
    title:    'Baa Baa Black Sheep',
    iconName: 'sheep',
    iconFam:  'MaterialCommunityIcons',
    color:    '#6B7280',
    lines:    'Baa baa black sheep, have you any wool?',
  },
  {
    id:       'jack_jill',
    title:    'Jack and Jill',
    iconName: 'water',
    iconFam:  'Ionicons',
    color:    '#3B82F6',
    lines:    'Jack and Jill went up the hill...',
  },
  {
    id:       'old_mcdonald',
    title:    'Old MacDonald',
    iconName: 'cow',
    iconFam:  'MaterialCommunityIcons',
    color:    '#10B981',
    lines:    'Old MacDonald had a farm, E-I-E-I-O!',
  },
  {
    id:       'itsy_bitsy',
    title:    'Itsy Bitsy Spider',
    iconName: 'spider-thread',
    iconFam:  'MaterialCommunityIcons',
    color:    '#8B5CF6',
    lines:    'The itsy bitsy spider climbed up...',
  },
  {
    id:       'row_your_boat',
    title:    'Row Your Boat',
    iconName: 'sail-boat',
    iconFam:  'MaterialCommunityIcons',
    color:    '#0EA5E9',
    lines:    'Row, row, row your boat...',
  },
  {
    id:       'wheels_bus',
    title:    'Wheels on the Bus',
    iconName: 'bus',
    iconFam:  'MaterialCommunityIcons',
    color:    '#EF4444',
    lines:    'The wheels on the bus go round and round...',
  },
  {
    id:       'mary_lamb',
    title:    "Mary's Little Lamb",
    iconName: 'heart',
    iconFam:  'Ionicons',
    color:    '#EC4899',
    lines:    'Mary had a little lamb...',
  },
  {
    id:       'heads_shoulders',
    title:    'Head Shoulders Knees',
    iconName: 'human',
    iconFam:  'MaterialCommunityIcons',
    color:    '#14B8A6',
    lines:    'Head, shoulders, knees and toes!',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NurseryRhymesScreen() {
  const { isConnected, isPlayingRhyme, activeRhyme, playRhyme } = useRobot();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const handleTap = (rhyme: RhymeCard) => {
    if (!isConnected) {
      setPendingId('__offline__');
      return;
    }
    if (isPlayingRhyme) return;
    playRhyme(rhyme.id);
  };

  return (
    <View style={styles.bg}>
      <AnimatedBackground />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={[styles.headerIconCircle]}>
            <MaterialCommunityIcons name="music-note-eighth" size={32} color={S.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Nursery Rhymes</Text>
            <Text style={styles.headerSub}>
              {isPlayingRhyme
                ? `Playing: ${RHYMES.find(r => r.id === activeRhyme)?.title ?? '...'}`
                : 'Tap a rhyme for the robot to sing!'}
            </Text>
          </View>
        </View>

        {/* ── Rhyme grid ── */}
        <View style={styles.grid}>
          {RHYMES.map(rhyme => {
            const isActive   = activeRhyme === rhyme.id;
            const isDisabled = isPlayingRhyme && !isActive;
            const Icon = rhyme.iconFam === 'MaterialCommunityIcons'
              ? MaterialCommunityIcons
              : Ionicons;

            return (
              <TouchableOpacity
                key={rhyme.id}
                style={[
                  styles.card,
                  { borderColor: rhyme.color },
                  isActive   && { backgroundColor: rhyme.color },
                  isDisabled && styles.cardDisabled,
                ]}
                onPress={() => handleTap(rhyme)}
                disabled={isDisabled}
                activeOpacity={0.78}
              >
                {/* Playing indicator */}
                {isActive && (
                  <View style={styles.playingBadge}>
                    <Ionicons name="musical-notes" size={12} color="#fff" />
                    <Text style={styles.playingBadgeText}>Playing</Text>
                  </View>
                )}

                <View style={[
                  styles.iconCircle,
                  { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : rhyme.color + '1A' },
                ]}>
                  <Icon
                    name={rhyme.iconName as any}
                    size={36}
                    color={isActive ? '#fff' : rhyme.color}
                  />
                </View>

                <Text style={[styles.cardTitle, isActive && styles.cardTitleActive]}>
                  {rhyme.title}
                </Text>
                <Text
                  style={[styles.cardPreview, isActive && styles.cardPreviewActive]}
                  numberOfLines={2}
                >
                  {rhyme.lines}
                </Text>

                {!isActive && !isDisabled && (
                  <View style={[styles.playBtn, { backgroundColor: rhyme.color }]}>
                    <Ionicons name="play" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Offline dialog ── */}
      {pendingId === '__offline__' && (
        <EdubotDialog
          visible
          iconName="wifi-outline"
          iconColor={S.colors.warning}
          title="Not Connected"
          message="Connect to your Edubot robot so it can sing the rhyme for you!"
          confirmText="Got it!"
          onConfirm={() => setPendingId(null)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: S.colors.background },
  scroll: { padding: S.spacing.lg, paddingBottom: S.spacing.xxl },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            S.spacing.md,
    marginBottom:   S.spacing.xl,
    backgroundColor: S.colors.card,
    borderRadius:   S.radius.lg,
    padding:        S.spacing.lg,
    ...S.shadow.md,
  },
  headerIconCircle: {
    width:          60,
    height:         60,
    borderRadius:   30,
    backgroundColor: S.colors.primary + '1A',
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize:   S.fontSize.xl,
    fontWeight: '800',
    color:      S.colors.text,
  },
  headerSub: {
    fontSize:  S.fontSize.sm,
    color:     S.colors.textMuted,
    marginTop: 2,
  },

  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           S.spacing.md,
  },
  card: {
    width:           CARD_W,
    backgroundColor: S.colors.card,
    borderRadius:    S.radius.lg,
    padding:         S.spacing.md,
    alignItems:      'center',
    borderWidth:     2,
    borderColor:     'transparent',
    minHeight:       170,
    justifyContent:  'center',
    gap:             S.spacing.xs,
    ...S.shadow.sm,
  },
  cardDisabled: {
    opacity: 0.38,
  },
  iconCircle: {
    width:          64,
    height:         64,
    borderRadius:   32,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   S.spacing.xs,
  },
  cardTitle: {
    fontSize:   S.fontSize.sm,
    fontWeight: '700',
    color:      S.colors.text,
    textAlign:  'center',
  },
  cardTitleActive: {
    color: '#fff',
  },
  cardPreview: {
    fontSize:  10,
    color:     S.colors.textLight,
    textAlign: 'center',
    lineHeight: 14,
  },
  cardPreviewActive: {
    color: 'rgba(255,255,255,0.80)',
  },
  playBtn: {
    marginTop:      S.spacing.xs,
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
  },
  playingBadge: {
    position:          'absolute',
    top:               8,
    right:             8,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    backgroundColor:   'rgba(0,0,0,0.28)',
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      20,
  },
  playingBadgeText: {
    fontSize:   9,
    fontWeight: '800',
    color:      '#fff',
  },
});
