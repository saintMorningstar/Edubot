import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRobot } from '../src/context/RobotContext';
import { useProgress } from '../src/hooks/useProgress';
import BlockItem from '../src/components/BlockItem';
import EdubotDialog from '../src/components/EdubotDialog';
import { CODING_BLOCKS, COLORS, FONT_SIZES, BORDER_RADIUS, SPACING } from '../src/utils/constants';
import { tapFeedback, bigSuccessFeedback } from '../src/services/feedbackService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgramBlock {
  uid:      string;
  id:       string;
  label:    string;
  iconName: string;
  command:  string;
  color:    string;
}

interface DialogState {
  iconName:     string;
  iconColor?:   string;
  title:        string;
  message:      string;
  confirmText:  string;
  confirmColor?: string;
  onConfirm:    () => void;
  cancelText?:  string;
  onCancel?:    () => void;
}

// ─── Speed options ────────────────────────────────────────────────────────────

const SPEEDS = [
  { label: 'Slow',   ms: 2000, iconName: 'turtle'  as const },
  { label: 'Normal', ms: 1200, iconName: 'walk'    as const },
  { label: 'Fast',   ms: 650,  iconName: 'run-fast' as const },
];

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CodingScreen() {
  const { isConnected, sendMove, sendWave, sendDance, sendFace } = useRobot();
  const { recordActivity } = useProgress();

  const [program,    setProgram]    = useState<ProgramBlock[]>([]);
  const [isRunning,  setIsRunning]  = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [speedIdx,   setSpeedIdx]   = useState(1);          // default: Normal
  const [dlg,        setDlg]        = useState<DialogState | null>(null);

  const closeDlg = () => setDlg(null);
  const stepDelay = SPEEDS[speedIdx].ms;

  // ── Block palette ────────────────────────────────────────────────────────

  const addBlock = (block: typeof CODING_BLOCKS[number]) => {
    tapFeedback();
    setProgram(prev => [
      ...prev,
      { ...block, uid: `${block.id}-${Date.now()}-${Math.random()}` },
    ]);
  };

  const removeBlock   = (i: number) => setProgram(p => p.filter((_, idx) => idx !== i));
  const moveBlockUp   = (i: number) => {
    if (i === 0) return;
    setProgram(p => { const a = [...p]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; });
  };
  const moveBlockDown = (i: number) => {
    setProgram(p => {
      if (i >= p.length - 1) return p;
      const a = [...p]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a;
    });
  };

  const clearProgram = () => {
    tapFeedback();
    setDlg({
      iconName:     'trash-outline',
      iconColor:    COLORS.danger,
      title:        'Clear Program?',
      message:      'This will remove all your blocks. Start fresh!',
      confirmText:  'Clear All',
      confirmColor: COLORS.danger,
      onConfirm:    () => { setProgram([]); closeDlg(); },
      cancelText:   'Keep',
      onCancel:     closeDlg,
    });
  };

  // ── Execute one block command ────────────────────────────────────────────

  const executeBlock = (command: string) => {
    switch (command) {
      case 'forward':      sendMove('forward');   break;
      case 'backward':     sendMove('backward');  break;
      case 'left':         sendMove('left');      break;
      case 'right':        sendMove('right');     break;
      case 'wave':         sendWave();            break;
      case 'dance':        sendDance();           break;
      case 'face_happy':   sendFace('happy');     break;
      case 'face_excited': sendFace('excited');   break;
      case 'wait':         /* just delay */       break;
    }
  };

  // ── Run the full program ─────────────────────────────────────────────────

  const handleRun = async () => {
    if (program.length === 0) {
      tapFeedback();
      setDlg({
        iconName:    'help-circle',
        iconColor:   COLORS.primary,
        title:       'No Blocks Yet!',
        message:     'Tap the colourful blocks at the top to build your program first!',
        confirmText: 'Got it!',
        onConfirm:   closeDlg,
      });
      return;
    }

    if (!isConnected) {
      tapFeedback();
      setDlg({
        iconName:    'wifi-off',
        iconColor:   COLORS.warning,
        title:       'Not Connected',
        message:     'Connect to your Edubot robot before running a program.',
        confirmText: 'OK',
        onConfirm:   closeDlg,
      });
      return;
    }

    setIsRunning(true);

    for (let i = 0; i < program.length; i++) {
      setActiveStep(i);
      executeBlock(program[i].command);
      await sleep(stepDelay);
    }

    setIsRunning(false);
    setActiveStep(-1);
    recordActivity('coding', true, program.length * 2);
    bigSuccessFeedback();

    setDlg({
      iconName:    'checkmark-circle',
      iconColor:   COLORS.success,
      title:       'Program Done!',
      message:     `Your robot ran all ${program.length} steps! Amazing work!`,
      confirmText: 'Woohoo!',
      onConfirm:   closeDlg,
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.bg}>

      {/* ── Block palette ── */}
      <View style={styles.palette}>
        <Text style={styles.paletteTitle}>Tap a block to add it:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paletteRow}
        >
          {CODING_BLOCKS.map(block => (
            <TouchableOpacity
              key={block.id}
              style={[styles.paletteBlock, { backgroundColor: block.color }]}
              onPress={() => addBlock(block)}
              disabled={isRunning}
              activeOpacity={0.82}
            >
              <MaterialCommunityIcons
                name={block.iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                size={34}
                color="#fff"
              />
              <Text style={styles.paletteLabel}>{block.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Speed selector ── */}
      <View style={styles.speedBar}>
        <Ionicons name="speedometer-outline" size={18} color={COLORS.textLight} />
        <Text style={styles.speedLabel}>Speed:</Text>
        {SPEEDS.map((s, i) => (
          <TouchableOpacity
            key={s.label}
            style={[styles.speedBtn, speedIdx === i && styles.speedBtnActive]}
            onPress={() => setSpeedIdx(i)}
            disabled={isRunning}
          >
            <MaterialCommunityIcons
              name={s.iconName}
              size={16}
              color={speedIdx === i ? '#fff' : COLORS.textLight}
            />
            <Text style={[styles.speedBtnText, speedIdx === i && styles.speedBtnTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Program area ── */}
      <View style={styles.programArea}>
        <View style={styles.programHeader}>
          <View style={styles.programTitleRow}>
            <Ionicons name="list" size={20} color={COLORS.primary} />
            <Text style={styles.programTitle}>
              My Program{program.length > 0 ? ` (${program.length} step${program.length !== 1 ? 's' : ''})` : ''}
            </Text>
          </View>
          {program.length > 0 && !isRunning && (
            <TouchableOpacity onPress={clearProgram} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {program.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="finger-print" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>
              Tap the coloured blocks above{'\n'}to build your program!
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.blockList} showsVerticalScrollIndicator={false}>
            {program.map((block, idx) => (
              <BlockItem
                key={block.uid}
                block={block}
                index={idx}
                isActive={activeStep === idx}
                isLast={idx === program.length - 1}
                onRemove={()    => removeBlock(idx)}
                onMoveUp={()   => moveBlockUp(idx)}
                onMoveDown={() => moveBlockDown(idx)}
              />
            ))}
            <View style={{ height: SPACING.md }} />
          </ScrollView>
        )}
      </View>

      {/* ── Run bar ── */}
      <View style={styles.runBar}>
        {isRunning ? (
          <View style={styles.runProgress}>
            <View style={[styles.progressTrack, { width: '100%' }]}>
              <View style={[
                styles.progressFill,
                { width: `${((activeStep + 1) / program.length) * 100}%` },
              ]} />
            </View>
            <Text style={styles.runProgressText}>
              Running step {activeStep + 1} of {program.length}...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.runBtn,
              (program.length === 0 || !isConnected) && styles.runBtnDisabled,
            ]}
            onPress={handleRun}
            disabled={isRunning || program.length === 0}
            activeOpacity={0.82}
          >
            <Ionicons name="play" size={28} color="#fff" />
            <Text style={styles.runBtnText}>
              {!isConnected ? 'Connect Robot to Run' : 'Run Program'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {dlg && (
        <EdubotDialog
          visible
          iconName={dlg.iconName}
          iconColor={dlg.iconColor}
          title={dlg.title}
          message={dlg.message}
          confirmText={dlg.confirmText}
          confirmColor={dlg.confirmColor}
          onConfirm={dlg.onConfirm}
          cancelText={dlg.cancelText}
          onCancel={dlg.onCancel}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.background },

  // Palette
  palette: {
    backgroundColor: '#1A1A2E',
    paddingTop:  SPACING.md,
    paddingBottom: SPACING.md,
  },
  paletteTitle: {
    color:             '#fff',
    fontSize:          FONT_SIZES.medium,
    fontWeight:        'bold',
    marginBottom:      SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  paletteRow:  { paddingHorizontal: SPACING.sm, gap: SPACING.sm },
  paletteBlock: {
    width:          100,
    height:         86,
    borderRadius:   BORDER_RADIUS.medium,
    alignItems:     'center',
    justifyContent: 'center',
    elevation:      3,
    gap:            SPACING.xs,
  },
  paletteLabel: {
    color:             '#fff',
    fontSize:          11,
    fontWeight:        'bold',
    textAlign:         'center',
    paddingHorizontal: 4,
  },

  // Speed selector
  speedBar: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    backgroundColor:   COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  speedLabel:  { fontSize: FONT_SIZES.small, color: COLORS.textLight, fontWeight: '600' },
  speedBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   5,
    borderRadius:      BORDER_RADIUS.pill,
    borderWidth:       1,
    borderColor:       '#E0E0E0',
    backgroundColor:   '#F5F5F5',
  },
  speedBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  speedBtnText:   { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  speedBtnTextActive: { color: '#fff' },

  // Program area
  programArea:    { flex: 1, padding: SPACING.md },
  programHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  programTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  programTitle:   { fontSize: FONT_SIZES.large, fontWeight: 'bold', color: COLORS.text },
  clearBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText:      { fontSize: FONT_SIZES.medium, color: COLORS.danger, fontWeight: 'bold' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.45, gap: SPACING.md },
  emptyText:  { fontSize: FONT_SIZES.large, color: COLORS.textLight, textAlign: 'center', lineHeight: 34 },

  blockList: { flex: 1 },

  // Run bar
  runBar: {
    padding:         SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth:  1,
    borderTopColor:  '#E0E0E0',
  },
  runBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            SPACING.sm,
    backgroundColor: COLORS.success,
    borderRadius:   BORDER_RADIUS.large,
    paddingVertical: SPACING.md + 4,
    elevation:      4,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.2,
    shadowRadius:   4,
  },
  runBtnDisabled: { backgroundColor: '#BDBDBD' },
  runBtnText: { fontSize: FONT_SIZES.large, fontWeight: 'bold', color: '#fff' },

  runProgress: { gap: SPACING.xs },
  progressTrack: { height: 12, backgroundColor: '#E0E0E0', borderRadius: 6, overflow: 'hidden' },
  progressFill:  { height: 12, backgroundColor: COLORS.success, borderRadius: 6 },
  runProgressText: { fontSize: FONT_SIZES.medium, color: COLORS.textLight, textAlign: 'center', fontWeight: '600' },
});
