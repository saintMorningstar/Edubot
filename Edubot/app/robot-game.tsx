/**
 * app/robot-game.tsx  –  Robot Programming Adventure Game
 *
 * Scratch Jr–style sequential-programming game for ages 1–5.
 *
 * URL params:
 *   levelId   – level to play (1-6).  Defaults to 1.
 *   freePlay  – set to "true" for Free Play Mode (no goal, no fail state).
 *   missionId – mission to play (1-N from missions.ts). When set, a story
 *               dialog is shown on entry and mission-specific narrations are used.
 *
 * Layout (top → bottom):
 *   Custom header  →  hint bar  →  5×5 game board
 *   →  command palette  →  command queue  →  action buttons
 *
 * On success   → navigates to /level-complete?levelId=…&stars=…&commands=…
 * On fail      → inline overlay with Retry button
 * Free Play    → no win/fail logic; robot just moves freely
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets }                      from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons }        from '@expo/vector-icons';
import EmojiIcon from '../src/components/icons/EmojiIcon';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';

import {
  GRID_SIZE,
  LEVELS,
  FREE_PLAY_LEVEL,
  DIRECTION_DEGREES,
  CommandType,
  LevelConfig,
  RobotState,
  executeCommand,
} from '../src/services/commandEngine';
import { MISSIONS, MissionConfig } from '../src/data/missions';
import { saveMissionResult }        from '../src/services/missionManager';
import { soundService }              from '../src/services/soundService';
import { speakPhrase, speak }        from '../src/services/voiceService';
import { tapFeedback }               from '../src/services/feedbackService';
import { loadRobotIP }               from '../src/services/storage';
import { runProgram }                from '../src/services/robotAPI';
import { getCurrentSkin, SkinId }    from '../src/services/robotSkinManager';
import EdubotDialog                  from '../src/components/EdubotDialog';
import GameBoard                     from '../src/components/game/GameBoard';
import CommandBlock                  from '../src/components/game/CommandBlock';
import CommandQueue                  from '../src/components/game/CommandQueue';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../src/utils/constants';

// ── Layout ────────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_W - 32, Math.floor(SCREEN_H * 0.41), 340);
const CELL_SIZE  = BOARD_SIZE / GRID_SIZE;

const PALETTE_CMDS: CommandType[] = ['forward', 'turn_left', 'turn_right', 'grab'];
const BLOCK_SIZE = Math.floor((SCREEN_W - 32 - 8 * 3) / 4);

// ── Tiny helpers ──────────────────────────────────────────────────────────────

const delay   = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const runAnim = (a: Animated.CompositeAnimation) =>
  new Promise<void>(r => a.start(() => r()));

// ── Component ─────────────────────────────────────────────────────────────────

export default function RobotProgrammingGame() {
  const insets = useSafeAreaInsets();

  // ── URL params ──
  const params          = useLocalSearchParams<{ levelId?: string; freePlay?: string; missionId?: string }>();
  const isFreePlay      = params.freePlay === 'true';
  const targetId        = Math.max(1, Number(params.levelId ?? '1'));
  const targetMissionId = params.missionId ? Number(params.missionId) : null;

  // Resolve the active mission config (null when not in Mission Mode)
  const missionConfig: MissionConfig | null = targetMissionId
    ? (MISSIONS.find(m => m.id === targetMissionId) ?? null)
    : null;

  // ── Resolve level config ──
  // Mission Mode builds a LevelConfig on-the-fly from the mission data.
  // IDs 101–199 are reserved for missions so they never collide with LEVELS.
  const level: LevelConfig = isFreePlay
    ? FREE_PLAY_LEVEL
    : missionConfig
    ? {
        id:          100 + missionConfig.id,
        worldId:     3,
        title:       missionConfig.title,
        emoji:       missionConfig.emoji,
        hint:        missionConfig.hint,
        robotStart:  missionConfig.robotStart,
        robotDir:    missionConfig.robotDir,
        goal:        missionConfig.goal,
        stars:       missionConfig.stars,
        obstacles:   missionConfig.obstacles,
        maxCommands: missionConfig.maxCommands,
      }
    : (LEVELS.find(l => l.id === targetId) ?? LEVELS[0]);

  // ── Game state ──
  const [robotState,     setRobotState]     = useState<RobotState>({
    ...level.robotStart, direction: level.robotDir,
  });
  const [commands,       setCommands]       = useState<CommandType[]>([]);
  const [isRunning,      setIsRunning]      = useState(false);
  const [activeStep,     setActiveStep]     = useState(-1);
  const [collectedStars, setCollectedStars] = useState<Set<string>>(new Set());
  const [gameStatus,     setGameStatus]     =
    useState<'playing' | 'fail'>('playing');
  const [showEmptyDlg,   setShowEmptyDlg]   = useState(false);
  const [sendingRobot,   setSendingRobot]   = useState(false);
  const [showRobotDlg,   setShowRobotDlg]   = useState(false);
  const [robotSendMsg,   setRobotSendMsg]   = useState('');
  // Mission Mode: story dialog shown at the start of every mission
  const [showStoryDlg,   setShowStoryDlg]   = useState(missionConfig !== null);
  // Active robot skin — refreshed every time this screen is focused so a
  // skin change in the customisation screen takes effect immediately.
  const [skinId, setSkinId] = useState<SkinId>('blue');

  // ── Load current skin whenever screen is focused ──
  useFocusEffect(
    useCallback(() => {
      getCurrentSkin().then(setSkinId);
    }, []),
  );

  // ── Mutable refs ──
  const cancelRef    = useRef(false);
  const collectedRef = useRef<Set<string>>(new Set());
  const cumulRotRef  = useRef(DIRECTION_DEGREES[level.robotDir]);

  // ── Animated values ──
  const robotPosX  = useRef(new Animated.Value(level.robotStart.col * CELL_SIZE)).current;
  const robotPosY  = useRef(new Animated.Value(level.robotStart.row * CELL_SIZE)).current;
  const robotRot   = useRef(new Animated.Value(DIRECTION_DEGREES[level.robotDir])).current;
  const robotScale = useRef(new Animated.Value(1)).current;
  const starScales = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const starRots   = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  // ── Intro voice on mount ──
  useEffect(() => {
    if (missionConfig) {
      // Narrate the mission story immediately (also shown in the story dialog)
      speak(missionConfig.story, 'happy');
    } else if (isFreePlay) {
      speak("Let's explore freely!", 'excited');
    } else {
      speakPhrase('levelStart');
    }
  }, []);

  // ── Level reset ───────────────────────────────────────────────────────────

  const resetLevel = useCallback((lvl: LevelConfig) => {
    cancelRef.current    = true;
    collectedRef.current = new Set();
    cumulRotRef.current  = DIRECTION_DEGREES[lvl.robotDir];

    setRobotState({ ...lvl.robotStart, direction: lvl.robotDir });
    setCommands([]);
    setActiveStep(-1);
    setCollectedStars(new Set());
    setGameStatus('playing');
    setIsRunning(false);

    robotPosX.setValue(lvl.robotStart.col * CELL_SIZE);
    robotPosY.setValue(lvl.robotStart.row * CELL_SIZE);
    robotRot.setValue(DIRECTION_DEGREES[lvl.robotDir]);
    robotScale.setValue(1);
    starScales.forEach(a => a.setValue(0));
    starRots.forEach(a => a.setValue(0));
  }, []);

  // ── Command palette ───────────────────────────────────────────────────────

  const maxCmds    = isFreePlay ? 99 : level.maxCommands;
  const paletteMax = isFreePlay ? 20 : level.maxCommands;   // visual cap in free play

  const addCommand = (cmd: CommandType) => {
    if (isRunning || commands.length >= paletteMax) return;
    tapFeedback();
    setCommands(prev => [...prev, cmd]);
  };

  const removeCommand = (index: number) => {
    if (isRunning) return;
    tapFeedback();
    setCommands(prev => prev.filter((_, i) => i !== index));
  };

  // ── Per-step animation ────────────────────────────────────────────────────

  const animateStep = (
    cmd:     CommandType,
    nextRow: number,
    nextCol: number,
    hitWall: boolean,
  ): Promise<void> => {
    if (cmd === 'forward') {
      if (hitWall) {
        // Squish on obstacle/wall impact
        return runAnim(
          Animated.sequence([
            Animated.timing(robotScale, { toValue: 1.28, duration: 80, useNativeDriver: true }),
            Animated.timing(robotScale, { toValue: 0.82, duration: 80, useNativeDriver: true }),
            Animated.timing(robotScale, { toValue: 1.00, duration: 80, useNativeDriver: true }),
          ]),
        );
      }
      // Spring slide to next cell
      return runAnim(
        Animated.parallel([
          Animated.spring(robotPosX, {
            toValue: nextCol * CELL_SIZE, friction: 7, tension: 110, useNativeDriver: true,
          }),
          Animated.spring(robotPosY, {
            toValue: nextRow * CELL_SIZE, friction: 7, tension: 110, useNativeDriver: true,
          }),
        ]),
      );
    }

    if (cmd === 'turn_left' || cmd === 'turn_right') {
      cumulRotRef.current += cmd === 'turn_left' ? -90 : 90;
      return runAnim(
        Animated.timing(robotRot, {
          toValue: cumulRotRef.current, duration: 290, useNativeDriver: true,
        }),
      );
    }

    if (cmd === 'grab') {
      return runAnim(
        Animated.sequence([
          Animated.timing(robotScale, { toValue: 1.45, duration: 140, useNativeDriver: true }),
          Animated.timing(robotScale, { toValue: 1.00, duration: 140, useNativeDriver: true }),
        ]),
      );
    }

    return delay(80);
  };

  // ── Run the program ───────────────────────────────────────────────────────

  const handleRun = async () => {
    if (commands.length === 0) {
      tapFeedback();
      setShowEmptyDlg(true);
      return;
    }

    const cmds = [...commands];
    cancelRef.current = false;

    setIsRunning(true);
    setActiveStep(-1);
    setGameStatus('playing');

    speakPhrase('levelStart');
    soundService.play('tap');
    await delay(380);

    let state: RobotState = { ...robotState };

    for (let i = 0; i < cmds.length; i++) {
      if (cancelRef.current) break;

      setActiveStep(i);
      const cmd = cmds[i];
      const { newState, hitWall } = executeCommand(
        state, cmd, GRID_SIZE, level.obstacles,
      );

      await animateStep(cmd, newState.row, newState.col, hitWall);
      if (cancelRef.current) break;

      state = newState;
      setRobotState({ ...state });

      if (hitWall) {
        soundService.play('wrong');
        speakPhrase('wrongMove');
        await delay(350);
        continue;
      }

      soundService.play('tap');
      // Randomly praise correct moves (every ~3rd step to avoid speech overload)
      if (Math.random() < 0.33) speakPhrase('correctMove');

      // Star collection
      const key    = `${state.row},${state.col}`;
      const onStar = level.stars.some(s => s.row === state.row && s.col === state.col);
      if (onStar && !collectedRef.current.has(key)) {
        collectedRef.current.add(key);
        setCollectedStars(new Set(collectedRef.current));
        soundService.play('correct');
        speak('Star!', 'excited');
        await delay(200);
      }

      await delay(160);
    }

    if (cancelRef.current) {
      setIsRunning(false);
      setActiveStep(-1);
      return;
    }

    setActiveStep(-1);
    await delay(200);

    // ── Win / fail logic (skip in Free Play) ──
    if (!isFreePlay) {
      const reachedGoal =
        state.row === level.goal.row && state.col === level.goal.col;

      if (reachedGoal) {
        // Calculate star rating
        const collected  = collectedRef.current.size;
        const maxStars   = level.stars.length;
        const earned = maxStars === 0
          ? 3
          : Math.min(3, 1 + Math.round((collected / maxStars) * 2));

        // Build the command string to pass to level-complete screen
        const commandStr = cmds.join(',');

        soundService.play('success');

        if (missionConfig) {
          // Mission Mode: use custom success narration and persist progress
          speak(missionConfig.successNarration, 'excited');
          await saveMissionResult(missionConfig.id, earned);
        } else {
          speakPhrase('victory');
        }

        // Small celebration bounce before navigating
        await runAnim(
          Animated.sequence([
            Animated.timing(robotScale, { toValue: 1.50, duration: 200, useNativeDriver: true }),
            Animated.timing(robotScale, { toValue: 1.00, duration: 200, useNativeDriver: true }),
          ]),
        );
        await delay(200);

        setIsRunning(false);
        // Navigate to full-screen celebration.
        // missionId is included so level-complete can tailor its navigation.
        const missionParam = missionConfig ? `&missionId=${missionConfig.id}` : '';
        router.replace(
          `/level-complete?levelId=${level.id}&stars=${earned}&commands=${encodeURIComponent(commandStr)}${missionParam}`,
        );
        return;

      } else {
        setGameStatus('fail');
        soundService.play('wrong');
        if (missionConfig) {
          speak(missionConfig.failNarration, 'calm');
        } else {
          speakPhrase('encourage');
        }
      }
    }

    setIsRunning(false);
  };

  // ── Stop button ───────────────────────────────────────────────────────────

  const handleStop = () => {
    if (!isRunning) return;
    cancelRef.current = true;
    tapFeedback();
  };

  // ── Send to Real Robot ────────────────────────────────────────────────────

  const handleSendToRobot = async () => {
    if (commands.length === 0) {
      setShowEmptyDlg(true);
      return;
    }
    const ip = loadRobotIP();
    if (!ip) {
      setRobotSendMsg('No robot connected.\nGo to the home screen to connect your Edubot first!');
      setShowRobotDlg(true);
      return;
    }
    setSendingRobot(true);
    try {
      await runProgram(ip, [...commands], 1200);
      setRobotSendMsg('Commands sent to your real robot!');
      soundService.play('correct');
      speak('Sending commands to the robot!', 'excited');
    } catch {
      setRobotSendMsg('Could not reach the robot.\nCheck your connection and try again.');
    } finally {
      setSendingRobot(false);
      setShowRobotDlg(true);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const topPad = insets.top + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.bg}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <View style={[styles.header, { paddingTop: topPad + 6 }]}>
        <TouchableOpacity
          onPress={() => router.replace(missionConfig ? '/mission-mode' : '/adventure-map')}
          style={styles.backBtn}
          hitSlop={14}
        >
          <Ionicons name="arrow-back" size={26} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <EmojiIcon emoji={level.emoji} size={22} />
          <Text style={styles.levelTitle}>{level.title}</Text>
          {isFreePlay ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.levelSub}>Free Play Mode</Text>
              <MaterialCommunityIcons name="gamepad-variant" size={13} color={COLORS.white} />
            </View>
          ) : missionConfig ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.levelSub}>Mission {missionConfig.id} of {MISSIONS.length}</Text>
              <MaterialCommunityIcons name="rocket-launch" size={13} color={COLORS.white} />
            </View>
          ) : (
            <Text style={styles.levelSub}>Level {level.id} of {LEVELS.length}</Text>
          )}
        </View>

        {!isFreePlay && (
          <View style={styles.starBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.starBadgeTxt}> {collectedStars.size} / {level.stars.length}</Text>
          </View>
        )}
      </View>

      {/* ═══════════════ HINT BAR ═══════════════ */}
      <View style={styles.hintBar}>
        <Ionicons name="bulb-outline" size={15} color="#F9A825" />
        <Text style={styles.hintTxt}> {level.hint}</Text>
      </View>

      {/* ═══════════════ GAME BOARD ═══════════════ */}
      <View style={styles.boardWrap}>
        <GameBoard
          level={level}
          boardSize={BOARD_SIZE}
          cellSize={CELL_SIZE}
          collectedStars={collectedStars}
          robotPosX={robotPosX}
          robotPosY={robotPosY}
          robotRotation={robotRot}
          robotScale={robotScale}
          skinId={skinId}
        />
      </View>

      {/* ═══════════════ COMMAND PALETTE ═══════════════ */}
      <View style={styles.palette}>
        <Text style={styles.paletteLabel}>
          {commands.length >= paletteMax
            ? 'Program full!'
            : isFreePlay
            ? `Tap a move  (${commands.length} added):`
            : `Tap to add a move  (${commands.length}/${level.maxCommands}):`}
        </Text>
        <View style={styles.paletteRow}>
          {PALETTE_CMDS.map(cmd => (
            <CommandBlock
              key={cmd}
              type={cmd}
              size={BLOCK_SIZE}
              disabled={isRunning || commands.length >= paletteMax}
              onPress={() => addCommand(cmd)}
            />
          ))}
        </View>
      </View>

      {/* ═══════════════ COMMAND QUEUE ═══════════════ */}
      <CommandQueue
        commands={commands}
        activeStep={activeStep}
        onRemove={removeCommand}
        isRunning={isRunning}
        maxLength={paletteMax}
      />

      {/* ═══════════════ ACTION BUTTONS ═══════════════ */}
      <View style={[styles.actionRow, { paddingBottom: insets.bottom + SPACING.sm }]}>
        {isRunning ? (
          <TouchableOpacity style={[styles.btn, styles.stopBtn]} onPress={handleStop}>
            <Ionicons name="stop-circle" size={22} color={COLORS.white} />
            <Text style={styles.btnTxt}> Stop</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* CLEAR */}
            <TouchableOpacity
              style={[styles.btn, styles.clearBtn, commands.length === 0 && styles.btnOff]}
              onPress={() => {
                if (commands.length > 0) { tapFeedback(); setCommands([]); }
              }}
              disabled={commands.length === 0}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.white} />
              <Text style={styles.btnTxt}> Clear</Text>
            </TouchableOpacity>

            {/* GO */}
            <TouchableOpacity
              style={[styles.btn, styles.goBtn, commands.length === 0 && styles.btnOff]}
              onPress={handleRun}
              disabled={commands.length === 0}
              activeOpacity={0.78}
            >
              <Ionicons name="play" size={24} color={COLORS.white} />
              <Text style={[styles.btnTxt, { fontSize: FONT_SIZES.large }]}> GO!</Text>
              <MaterialCommunityIcons name="rocket-launch" size={18} color={COLORS.white} />
            </TouchableOpacity>

            {/* SEND TO ROBOT */}
            <TouchableOpacity
              style={[styles.btn, styles.robotBtn, (commands.length === 0 || sendingRobot) && styles.btnOff]}
              onPress={handleSendToRobot}
              disabled={commands.length === 0 || sendingRobot}
            >
              <MaterialCommunityIcons name="robot-excited" size={20} color={COLORS.white} />
              {!sendingRobot && <MaterialCommunityIcons name="robot" size={18} color={COLORS.white} />}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ═══════════════ FAIL OVERLAY ═══════════════ */}
      {gameStatus === 'fail' && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <MaterialCommunityIcons name="emoticon-confused-outline" size={72} color="#FFD700" />
            <Text style={styles.overlayTitle}>Almost There!</Text>
            <Text style={styles.overlayMsg}>
              The robot didn&apos;t reach the goal.{'\n'}
              Try a different set of moves!
            </Text>
            <TouchableOpacity
              style={[styles.nextBtn, { width: '100%', marginTop: SPACING.md }]}
              onPress={() => resetLevel(level)}
            >
              <Text style={styles.nextBtnTxt}>Try Again!</Text>
              <MaterialCommunityIcons name="arm-flex" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ═══════════════ MISSION STORY DIALOG ═══════════════ */}
      {/* Shown once at mission entry; dismissed by the player before playing */}
      {missionConfig && (
        <EdubotDialog
          visible={showStoryDlg}
          iconName="rocket-outline"
          iconColor="#6C63FF"
          title={missionConfig.title}
          message={missionConfig.story}
          confirmText="Let's Go!"
          onConfirm={() => {
            setShowStoryDlg(false);
            speakPhrase('levelStart');
          }}
        />
      )}

      {/* ═══════════════ EMPTY-QUEUE DIALOG ═══════════════ */}
      <EdubotDialog
        visible={showEmptyDlg}
        iconName="help-circle-outline"
        iconColor="#9C27B0"
        title="Add some moves first!"
        message="Tap the colourful blocks to build your program, then press GO!"
        confirmText="Got it!"
        onConfirm={() => setShowEmptyDlg(false)}
      />

      {/* ═══════════════ ROBOT SEND RESULT DIALOG ═══════════════ */}
      <EdubotDialog
        visible={showRobotDlg}
        iconName="hardware-chip-outline"
        iconColor="#6C63FF"
        title="Robot Sending"
        message={robotSendMsg}
        confirmText="OK!"
        onConfirm={() => setShowRobotDlg(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#ECEFF8' },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   COLORS.primary,
    paddingBottom:     10,
    paddingHorizontal: SPACING.md,
  },
  backBtn:      { padding: 4, marginRight: 4 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 1 },
  levelEmoji:   { fontSize: 20 },
  levelTitle: {
    color:      COLORS.white,
    fontWeight: 'bold',
    fontSize:   FONT_SIZES.large - 2,
  },
  levelSub: {
    color:    'rgba(255,255,255,0.65)',
    fontSize: 11,
  },
  starBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.18)',
    borderRadius:      BORDER_RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  starBadgeTxt: {
    color:      COLORS.white,
    fontWeight: 'bold',
    fontSize:   13,
  },

  // Hint
  hintBar: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#FFFDE7',
    paddingHorizontal: SPACING.md,
    paddingVertical:   5,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  hintTxt: {
    color:      '#E65100',
    fontSize:   13,
    fontWeight: '600',
    flex:       1,
  },

  // Board
  boardWrap: {
    alignItems:      'center',
    paddingVertical: SPACING.sm,
    backgroundColor: '#DDE1F5',
  },

  // Palette
  palette: {
    backgroundColor:   '#1A1A2E',
    paddingTop:        SPACING.sm,
    paddingBottom:     SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  paletteLabel: {
    color:         'rgba(255,255,255,0.6)',
    fontSize:      11,
    fontWeight:    'bold',
    letterSpacing: 0.4,
    marginBottom:  6,
  },
  paletteRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    gap:            8,
  },

  // Action buttons
  actionRow: {
    flexDirection:     'row',
    gap:               SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.sm,
    backgroundColor:   COLORS.white,
    borderTopWidth:    1,
    borderTopColor:    '#E0E0E0',
  },
  btn: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 14,
    borderRadius:    BORDER_RADIUS.large,
    elevation:       4,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.18,
    shadowRadius:    4,
  },
  btnTxt:   { color: COLORS.white, fontWeight: 'bold', fontSize: FONT_SIZES.medium },
  clearBtn: { backgroundColor: '#607D8B', flex: 0.65 },
  goBtn:    { backgroundColor: COLORS.success, flex: 1.4 },
  stopBtn:  { backgroundColor: COLORS.danger },
  robotBtn: { backgroundColor: '#1565C0', flex: 0.65 },
  btnOff:   { opacity: 0.40 },

  // Fail overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          50,
  },
  overlayCard: {
    width:             SCREEN_W * 0.86,
    backgroundColor:   COLORS.white,
    borderRadius:      BORDER_RADIUS.large + 6,
    paddingVertical:   SPACING.xl,
    paddingHorizontal: SPACING.xl,
    alignItems:        'center',
    elevation:         18,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 8 },
    shadowOpacity:     0.3,
    shadowRadius:      18,
  },
  overlayBigEmoji: { fontSize: 62, marginBottom: SPACING.xs },
  overlayTitle: {
    fontSize:   FONT_SIZES.xxlarge,
    fontWeight: 'bold',
    color:      COLORS.text,
  },
  overlayMsg: {
    fontSize:    FONT_SIZES.medium,
    color:       COLORS.textLight,
    textAlign:   'center',
    lineHeight:  24,
    marginVertical: SPACING.md,
  },
  nextBtn: {
    flex:            1,
    paddingVertical: 14,
    borderRadius:    BORDER_RADIUS.large,
    backgroundColor: COLORS.success,
    alignItems:      'center',
  },
  nextBtnTxt: {
    color:      COLORS.white,
    fontWeight: 'bold',
    fontSize:   FONT_SIZES.large,
  },
});
