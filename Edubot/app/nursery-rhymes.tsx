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
  const { isConnected, isPlayingRhyme, activeRhyme, playRhyme, stopRhyme } = useRobot();
  const [pendingId,   setPendingId]   = React.useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = React.useState(0);

  // Countdown: ticks from 60 → 0 whenever a rhyme is playing
  React.useEffect(() => {
    if (!isPlayingRhyme) { setSecondsLeft(0); return; }
    setSecondsLeft(60);
    const iv = setInterval(() => {
      setSecondsLeft(prev => (prev <= 1 ? (clearInterval(iv), 0) : prev - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [isPlayingRhyme]);

  const handleTap = (rhyme: RhymeCard) => {
    if (!isConnected) { setPendingId('__offline__'); return; }
    if (activeRhyme === rhyme.id) { stopRhyme(); return; }
    playRhyme(rhyme.id);
  };

  const activeColor = RHYMES.find(r => r.id === activeRhyme)?.color ?? S.colors.primary;
  const mm = String(Math.floor(secondsLeft / 60));
  const ss = String(secondsLeft % 60).padStart(2, '0');

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
              {isPlayingRhyme ? 'Tap the card again to stop' : 'Tap a rhyme for the robot to sing!'}
            </Text>
          </View>
        </View>

        {/* ── Now Playing banner ── */}
        {isPlayingRhyme && (
          <View style={[styles.nowPlaying, { borderColor: activeColor }]}>
            <View style={styles.npLeft}>
              <Ionicons name="musical-notes" size={18} color={activeColor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.npLabel}>Now playing on robot</Text>
                <Text style={[styles.npTitle, { color: activeColor }]} numberOfLines={1}>
                  {RHYMES.find(r => r.id === activeRhyme)?.title}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, {
                    width: `${(secondsLeft / 60) * 100}%` as any,
                    backgroundColor: activeColor,
                  }]} />
                </View>
              </View>
            </View>
            <View style={styles.npRight}>
              <Text style={[styles.countdown, { color: activeColor }]}>{mm}:{ss}</Text>
              <TouchableOpacity
                style={[styles.stopBtn, { backgroundColor: activeColor }]}
                onPress={stopRhyme}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={18} color="#fff" />
                <Text style={styles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Rhyme grid ── */}
        <View style={styles.grid}>
          {RHYMES.map(rhyme => {
            const isActive = activeRhyme === rhyme.id;
            const Icon = rhyme.iconFam === 'MaterialCommunityIcons'
              ? MaterialCommunityIcons
              : Ionicons;

            return (
              <TouchableOpacity
                key={rhyme.id}
                style={[
                  styles.card,
                  { borderColor: rhyme.color },
                  isActive && { backgroundColor: rhyme.color },
                ]}
                onPress={() => handleTap(rhyme)}
                activeOpacity={0.78}
              >
                {/* Playing indicator */}
                {isActive && (
                  <View style={styles.playingBadge}>
                    <Ionicons name="musical-notes" size={12} color="#fff" />
                    <Text style={styles.playingBadgeText}>Tap to stop</Text>
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

                {!isActive && (
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

  // Now Playing banner
  nowPlaying: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  S.colors.card,
    borderRadius:     S.radius.lg,
    borderWidth:      2,
    padding:          S.spacing.md,
    marginBottom:     S.spacing.lg,
    gap:              S.spacing.md,
    ...S.shadow.md,
  },
  npLeft: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           S.spacing.sm,
  },
  npLabel: {
    fontSize:  10,
    color:     S.colors.textMuted,
    fontWeight:'600',
  },
  npTitle: {
    fontSize:   S.fontSize.sm,
    fontWeight: '800',
    marginTop:  1,
  },
  progressTrack: {
    height:          4,
    backgroundColor: S.colors.border,
    borderRadius:    2,
    marginTop:       6,
    overflow:        'hidden',
  },
  progressFill: {
    height:       4,
    borderRadius: 2,
  },
  npRight: {
    alignItems: 'center',
    gap:        S.spacing.xs,
  },
  countdown: {
    fontSize:   S.fontSize.lg,
    fontWeight: '800',
    minWidth:   42,
    textAlign:  'center',
  },
  stopBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: S.spacing.sm,
    paddingVertical:   6,
    borderRadius:      S.radius.full,
  },
  stopBtnText: {
    fontSize:   11,
    fontWeight: '800',
    color:      '#fff',
  },
});
