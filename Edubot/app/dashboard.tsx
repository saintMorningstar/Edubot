import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRobot } from '../src/context/RobotContext';
import { ambientService } from '../src/services/ambientService';
import { THEME } from '../src/utils/theme';
import AnimatedBackground from '../src/components/ui/AnimatedBackground';
import RobotSVG from '../src/components/icons/RobotSVG';
import KidButton from '../src/components/ui/KidButton';

const { width: W } = Dimensions.get('window');
const S = THEME;

// ─── Pressable animated wrapper ──────────────────────────────────────────────

function PressCard({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress:  () => void;
  style?:   object;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pi = () => { scale.value = withSpring(0.94, { damping: 15, stiffness: 450 }); };
  const po = () => { scale.value = withSpring(1.00, { damping: 12, stiffness: 350 }); };
  return (
    <Animated.View style={[anim, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pi}
        onPressOut={po}
        activeOpacity={1}
        style={{ flex: 1 }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main action card (Talk / Play / Learn) ───────────────────────────────────

interface ActionCardProps {
  label:    string;
  sub:      string;
  color:    string;
  iconName: string;
  iconFam:  'Ionicons' | 'MaterialCommunityIcons';
  onPress:  () => void;
  flex?:    number;
}

function ActionCard({ label, sub, color, iconName, iconFam, onPress, flex = 1 }: ActionCardProps) {
  const Icon = iconFam === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;

  return (
    <PressCard onPress={onPress} style={{ flex }}>
      <View style={[styles.actionCard, { backgroundColor: color }]}>
        <View style={styles.actionIconCircle}>
          <Icon name={iconName as any} size={34} color="#fff" />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSub} numberOfLines={2}>{sub}</Text>
      </View>
    </PressCard>
  );
}

// ─── Feature tile (Explore grid) ─────────────────────────────────────────────

const TILE_W = (W - S.spacing.lg * 2 - S.spacing.sm * 2) / 3;

interface FeatureTileProps {
  label:    string;
  iconName: string;
  iconFam:  'Ionicons' | 'MaterialCommunityIcons';
  color:    string;
  onPress:  () => void;
  badge?:   string;
}

function FeatureTile({ label, iconName, iconFam, color, onPress, badge }: FeatureTileProps) {
  const Icon = iconFam === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
  return (
    <PressCard onPress={onPress} style={{ width: TILE_W }}>
      <View style={styles.tile}>
        {badge && (
          <View style={[styles.tileBadge, { backgroundColor: color }]}>
            <Text style={styles.tileBadgeText}>{badge}</Text>
          </View>
        )}
        <View style={[styles.tileIconCircle, { backgroundColor: color + '1A' }]}>
          <Icon name={iconName as any} size={28} color={color} />
        </View>
        <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
      </View>
    </PressCard>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

// ─── Dashboard screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { robotIP, isConnected, robotStatus, requestStatus, disconnect, telemetry } = useRobot();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    requestStatus();
    const id = setInterval(requestStatus, 30_000);
    ambientService.setContext('home');
    return () => {
      clearInterval(id);
      ambientService.clearContext();
    };
  }, [requestStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    requestStatus();
    // Give the WebSocket a moment to respond
    await new Promise(r => setTimeout(r, 600));
    setRefreshing(false);
  }, [requestStatus]);

  const handleDisconnect = () => { disconnect(); router.replace('/'); };

  const displayIP = robotIP === 'demo' ? 'Demo Mode' : (robotIP || '—');

  return (
    <View style={styles.bg}>
      <AnimatedBackground />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={S.colors.primary}
            colors={[S.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBgTint} />
          <View style={styles.heroLeft}>
            <RobotSVG size={88} primaryColor={S.colors.primary} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>Edubot</Text>
            <View style={styles.heroStatusRow}>
              <View style={[
                styles.statusDot,
                { backgroundColor: isConnected ? S.colors.success : S.colors.textLight },
              ]} />
              <Text style={styles.heroStatusText}>
                {isConnected
                  ? (robotStatus?.state ?? 'Connected')
                  : 'Not Connected'}
              </Text>
            </View>
            <Text style={styles.heroIP}>{displayIP}</Text>
          </View>
          {isConnected && (
            <View style={styles.batteryCol}>
              <Ionicons name="battery-half" size={22} color={S.colors.textMuted} />
              <Text style={styles.batteryText}>{telemetry.batteryVoltage.toFixed(1)}V</Text>
            </View>
          )}
        </View>

        {/* ── 3 primary actions: Talk · Play · Learn ── */}
        <SectionTitle label="What would you like to do?" />

        <View style={styles.actionRow}>
          <ActionCard
            label="Talk"
            sub="Speak to the robot"
            color="#00BFA5"
            iconName="chatbubbles"
            iconFam="Ionicons"
            onPress={() => router.push('/conversation')}
          />
          <ActionCard
            label="Play"
            sub="Drive & explore"
            color={S.colors.accent}
            iconName="game-controller"
            iconFam="Ionicons"
            onPress={() => router.push('/control')}
          />
        </View>

        <View style={[styles.actionRow, { marginBottom: S.spacing.xl }]}>
          <ActionCard
            label="Learn"
            sub="Colors, Numbers, Shapes and Coding"
            color={S.colors.secondary}
            iconName="school"
            iconFam="Ionicons"
            onPress={() => router.push('/learning')}
          />
        </View>

        {/* ── Explore grid ── */}
        <SectionTitle label="Explore" />
        <View style={styles.tileGrid}>
          <FeatureTile
            label="Robot Faces"
            iconName="emoticon-happy-outline"
            iconFam="MaterialCommunityIcons"
            color={S.colors.accent}

            onPress={() => router.push('/faces')}
          />
          <FeatureTile
            label="Heart Display"
            iconName="heart"
            iconFam="Ionicons"
            color="#E91E63"

            onPress={() => router.push('/heart-display')}
          />
          <FeatureTile
            label="Sports Mode"
            iconName="speedometer"
            iconFam="MaterialCommunityIcons"
            color={S.colors.secondaryDark}

            onPress={() => router.push('/sports-mode')}
          />
          <FeatureTile
            label="Adventure Map"
            iconName="map"
            iconFam="Ionicons"
            color="#8B5CF6"
            onPress={() => router.push('/adventure-map')}
          />
          <FeatureTile
            label="Missions"
            iconName="rocket"
            iconFam="Ionicons"
            color={S.colors.accent}
            onPress={() => router.push('/mission-mode')}
          />
          <FeatureTile
            label="Free Play"
            iconName="game-controller"
            iconFam="Ionicons"
            color={S.colors.success}
            onPress={() => router.push('/robot-game?freePlay=true')}
          />
          <FeatureTile
            label="Coding"
            iconName="code-slash"
            iconFam="Ionicons"
            color="#A78BFA"
            onPress={() => router.push('/coding')}
          />
          <FeatureTile
            label="My Progress"
            iconName="star"
            iconFam="Ionicons"
            color={S.colors.secondaryDark}
            onPress={() => router.push('/progress')}
          />
          <FeatureTile
            label="Nursery Rhymes"
            iconName="music-note-eighth"
            iconFam="MaterialCommunityIcons"
            color="#F59E0B"

            onPress={() => router.push('/nursery-rhymes')}
          />
          <FeatureTile
            label="Customize"
            iconName="palette"
            iconFam="MaterialCommunityIcons"
            color="#EC4899"
            onPress={() => router.push('/robot-customization')}
          />
          <FeatureTile
            label="Settings"
            iconName="settings-sharp"
            iconFam="Ionicons"
            color={S.colors.textMuted}
            onPress={() => router.push('/settings')}
          />
        </View>

        {/* ── Connect / Disconnect ── */}
        <KidButton
          label={isConnected ? 'Disconnect' : 'Connect to Robot'}
          variant={isConnected ? 'danger' : 'primary'}
          onPress={isConnected ? handleDisconnect : () => router.push('/')}
          icon={
            <Ionicons
              name={isConnected ? 'power' : 'bluetooth'}
              size={20}
              color="#fff"
            />
          }
          style={{ marginTop: S.spacing.sm, marginBottom: S.spacing.xxl }}
          fullWidth
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: S.colors.background },
  scroll: { padding: S.spacing.lg, paddingBottom: S.spacing.xxl },

  // Hero
  heroCard: {
    backgroundColor: S.colors.card,
    borderRadius:    S.radius.lg,
    padding:         S.spacing.lg,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             S.spacing.md,
    marginBottom:    S.spacing.xl,
    overflow:        'hidden',
    ...S.shadow.md,
  },
  heroBgTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: S.colors.primary,
    opacity:         0.05,
  },
  heroLeft:       { alignItems: 'center' },
  heroInfo:       { flex: 1 },
  heroName:       { fontSize: S.fontSize.xl,  fontWeight: '800', color: S.colors.text },
  heroStatusRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statusDot:      { width: 8, height: 8, borderRadius: 4 },
  heroStatusText: { fontSize: S.fontSize.sm,  color: S.colors.textMuted, fontWeight: '600' },
  heroIP:         { fontSize: S.fontSize.xs,  color: S.colors.textLight, marginTop: 2 },
  batteryCol:     { alignItems: 'center', gap: 2 },
  batteryText:    { fontSize: S.fontSize.xs,  color: S.colors.textMuted, fontWeight: '600' },

  // Section title
  sectionTitle: {
    fontSize:     S.fontSize.lg,
    fontWeight:   '700',
    color:        S.colors.text,
    marginBottom: S.spacing.md,
    marginTop:    S.spacing.xs,
  },

  // Action cards
  actionRow: {
    flexDirection: 'row',
    gap:           S.spacing.md,
    marginBottom:  S.spacing.md,
  },
  actionCard: {
    borderRadius: S.radius.lg,
    padding:      S.spacing.lg,
    minHeight:    148,
    justifyContent: 'space-between',
    ...S.shadow.lg,
  },
  actionIconCircle: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  actionLabel: {
    fontSize:   S.fontSize.xl,
    fontWeight: '800',
    color:      '#fff',
    marginTop:  S.spacing.sm,
  },
  actionSub: {
    fontSize:   S.fontSize.sm,
    color:      'rgba(255,255,255,0.82)',
    lineHeight: 18,
    marginTop:  2,
  },

  // Feature tiles
  tileGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           S.spacing.sm,
    marginBottom:  S.spacing.xl,
  },
  tile: {
    backgroundColor: S.colors.card,
    borderRadius:    S.radius.md,
    padding:         S.spacing.md,
    alignItems:      'center',
    minHeight:       100,
    justifyContent:  'center',
    ...S.shadow.sm,
  },
  tileIconCircle: {
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   S.spacing.xs,
  },
  tileLabel: {
    fontSize:   S.fontSize.xs,
    fontWeight: '700',
    color:      S.colors.text,
    textAlign:  'center',
    lineHeight: 15,
  },
  tileBadge: {
    position:          'absolute',
    top:               6,
    right:             6,
    paddingHorizontal: 5,
    paddingVertical:   2,
    borderRadius:      S.radius.full,
  },
  tileBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
