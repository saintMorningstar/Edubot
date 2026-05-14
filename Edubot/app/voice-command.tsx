/**
 * app/voice-command.tsx  –  Voice Command Mode
 *
 * Children control the robot by speaking commands.
 * Designed for ages 1–5: one giant mic button, big text, playful feedback.
 *
 * Supported commands (via voiceCommandParser.ts):
 *   "forward" / "go"  → move robot forward
 *   "left"            → turn left
 *   "right"           → turn right
 *   "stop" / "halt"   → stop robot
 *   "grab" / "pick up"→ activate gripper
 *
 * Speech engine:  expo-speech-recognition  (v3, works with Expo Go SDK 54)
 * Voice feedback: expo-speech
 * Robot control:  HTTP via robotAPI.ts (optional — works without real robot)
 *
 * How a single voice interaction works:
 *   1. Child taps the mic button.
 *   2. ExpoSpeechRecognitionModule.start() opens the microphone.
 *   3. The "result" event fires with a final transcript.
 *   4. parseVoiceCommand() maps it to a command.
 *   5. The robot speaks back, plays a sound, and sends the HTTP command.
 *   6. The mic closes automatically (continuous: false).
 *
 * Expo Go note:
 *   expo-speech-recognition requires a development build for full native support.
 *   If the module is unavailable, a graceful fallback banner is shown.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { router }             from 'expo-router';
import { useSafeAreaInsets }  from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import EmojiIcon from '../src/components/icons/EmojiIcon';
// ─── GUARDED IMPORT ──────────────────────────────────────────────────────────
// expo-speech-recognition requires a custom development build (EAS Build or
// `expo run:android` / `expo run:ios`).  The native module is NOT included in
// the standard Expo Go app.
//
// A top-level `import` would throw "Cannot find native module" at load time,
// crashing the entire route before the component can mount.  Using require()
// inside a try/catch lets the file load cleanly in Expo Go and shows a
// "build required" banner instead of a blank screen or error overlay.

let _SpeechModule: any        = null;
let _useEvent:     (name: string, cb: (e: any) => void) => void = () => {};

/** True only when the native ExpoSpeechRecognition module is present (dev build). */
const SPEECH_AVAILABLE_IN_ENV: boolean = (() => {
  try {
    const m        = require('expo-speech-recognition');
    _SpeechModule  = m.ExpoSpeechRecognitionModule;
    _useEvent      = m.useSpeechRecognitionEvent;
    return true;
  } catch {
    return false;   // Expo Go — native module absent
  }
})();

const SpeechModule              = _SpeechModule;
// Renamed so it reads as a hook call at the call-site while remaining a no-op
// when the native module is absent (no React hook machinery → rules satisfied).
const useSpeechRecognitionEvent = _useEvent;

import {
  parseVoiceCommand,
  ParsedCommand,
  COMMAND_EMOJI,
  COMMAND_LABEL,
  COMMAND_COLOR,
  VoiceCommandResult,
} from '../src/services/voiceCommandParser';
import { speak }                                  from '../src/services/voiceService';
import { soundService }                           from '../src/services/soundService';
import { tapFeedback }                            from '../src/services/feedbackService';
import { useRobot }                               from '../src/context/RobotContext';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../src/utils/constants';

// ── Layout ────────────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');
const MIC_SIZE      = Math.min(W * 0.46, 200);   // the big mic button diameter
const MIC_RADIUS    = MIC_SIZE / 2;

// ── Hint chips shown below the history row ────────────────────────────────────

const HINT_COMMANDS: Array<{ label: string; emoji: string }> = [
  { label: 'Forward', emoji: '⬆️' },
  { label: 'Left',    emoji: '↰'  },
  { label: 'Right',   emoji: '↱'  },
  { label: 'Stop',    emoji: '✋' },
  { label: 'Dance',   emoji: '💃' },
  { label: 'Wave',    emoji: '👋' },
];

// ── Tiny helpers ──────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceCommandScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);

  const {
    isConnected,
    sendMove,
    sendEmotion,
    sendDance,
    sendWave,
    sendSleep,
    sendWake,
  } = useRobot();

  // ── Screen state ──
  const [isListening,    setIsListening]    = useState(false);
  const [transcript,     setTranscript]     = useState('');
  const [lastCommand,    setLastCommand]    = useState<ParsedCommand | null>(null);
  const [responseText,   setResponseText]   = useState('Tap the mic and say a command!');
  const [history,        setHistory]        = useState<VoiceCommandResult[]>([]);
  const [hasPermission,  setHasPermission]  = useState<boolean | null>(null);
  const [isAvailable,    setIsAvailable]    = useState(true);
  const [robotStatus,    setRobotStatus]    = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Prevent double-processing when interimResults arrive before isFinal
  const processedRef = useRef(false);

  // ── Animated values ──
  // Mic button scale pulse while listening
  const micScale      = useRef(new Animated.Value(1)).current;
  // Two expanding rings for the "listening" ripple effect
  const ring1Scale    = useRef(new Animated.Value(1)).current;
  const ring1Opacity  = useRef(new Animated.Value(0)).current;
  const ring2Scale    = useRef(new Animated.Value(1)).current;
  const ring2Opacity  = useRef(new Animated.Value(0)).current;
  // Robot character bounce on command detection
  const robotY        = useRef(new Animated.Value(0)).current;
  const robotScale    = useRef(new Animated.Value(1)).current;
  // Response card fade-in
  const responseAlpha = useRef(new Animated.Value(1)).current;

  // Refs for running animation loops so we can stop them cleanly
  const listeningAnimsRef = useRef<Array<() => void>>([]);

  // ── Permission + availability check on mount ──────────────────────────────

  useEffect(() => {
    // When running in Expo Go the native module is absent — show build banner.
    if (!SPEECH_AVAILABLE_IN_ENV || !SpeechModule) {
      setIsAvailable(false);
      setResponseText('Voice recognition needs a development build. See the banner below.');
      return;
    }

    try {
      const available = SpeechModule.isRecognitionAvailable();
      setIsAvailable(available);
      if (!available) {
        setResponseText('Speech recognition is not supported on this device.');
        return;
      }
    } catch {
      setIsAvailable(false);
      return;
    }

    SpeechModule.getPermissionsAsync()
      .then((p: { granted: boolean }) => {
        setHasPermission(p.granted);
        if (!p.granted) {
          setResponseText('Microphone permission is needed. Tap the mic to allow it!');
        }
      })
      .catch(() => setHasPermission(false));
  }, []);

  // ── Listening ripple animations ───────────────────────────────────────────

  useEffect(() => {
    if (!isListening) {
      // Stop all loop functions
      listeningAnimsRef.current.forEach(stop => stop());
      listeningAnimsRef.current = [];
      // Reset values
      micScale.setValue(1);
      ring1Scale.setValue(1);   ring1Opacity.setValue(0);
      ring2Scale.setValue(1);   ring2Opacity.setValue(0);
      return;
    }

    let alive = true;

    // Mic button gentle pulse
    const pulseMic = async () => {
      while (alive) {
        await new Promise<void>(r =>
          Animated.sequence([
            Animated.timing(micScale, { toValue: 1.08, duration: 500, useNativeDriver: true }),
            Animated.timing(micScale, { toValue: 1.00, duration: 500, useNativeDriver: true }),
          ]).start(() => r()),
        );
      }
    };

    // Factory for a ripple ring loop with an initial delay
    const pulseRing = async (
      scale:   Animated.Value,
      opacity: Animated.Value,
      startDelay: number,
    ) => {
      await delay(startDelay);
      while (alive) {
        scale.setValue(1);
        opacity.setValue(0.55);
        await new Promise<void>(r =>
          Animated.parallel([
            Animated.timing(scale,   { toValue: 2.4, duration: 1300, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration: 1300, useNativeDriver: true }),
          ]).start(() => r()),
        );
      }
    };

    pulseMic();
    pulseRing(ring1Scale, ring1Opacity, 0);
    pulseRing(ring2Scale, ring2Opacity, 650);

    // Capture the stop function
    listeningAnimsRef.current = [() => { alive = false; }];

    return () => { alive = false; };
  }, [isListening]);

  // ── Robot bounce animation ────────────────────────────────────────────────

  const bounceRobot = useCallback(() => {
    Animated.sequence([
      Animated.timing(robotY,     { toValue: -22, duration: 180, useNativeDriver: true }),
      Animated.spring(robotY,     { toValue: 0,   friction: 4, tension: 100, useNativeDriver: true }),
      Animated.timing(robotScale, { toValue: 1.25, duration: 100, useNativeDriver: true }),
      Animated.timing(robotScale, { toValue: 1.00, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Response card flash ───────────────────────────────────────────────────

  const flashResponse = useCallback((text: string) => {
    setResponseText(text);
    responseAlpha.setValue(0);
    Animated.timing(responseAlpha, {
      toValue:         1,
      duration:        300,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Execute robot command via BLE ────────────────────────────────────────────

  const sendToRobot = useCallback(async (cmd: VoiceCommandResult) => {
    if (cmd === 'unknown' || !isConnected) return;

    setRobotStatus('sending');
    try {
      switch (cmd) {
        case 'forward':  sendMove('forward');   break;
        case 'backward': sendMove('backward');  break;
        case 'left':     sendMove('left');      break;
        case 'right':    sendMove('right');     break;
        case 'stop':     sendMove('stop');      break;
        case 'dance':    sendDance();           break;
        case 'happy':    sendEmotion('HAPPY');  break;
        case 'sad':      sendEmotion('SAD');    break;
        case 'angry':    sendEmotion('ANGRY');  break;
        case 'excited':  sendEmotion('EXCITED');break;
        case 'sleepy':   sendEmotion('SLEEPY'); break;
        case 'wave':     sendWave();            break;
        case 'sleep':    sendSleep();           break;
        case 'wake':     sendWake();            break;
      }
      setRobotStatus('sent');
    } catch {
      setRobotStatus('error');
    }
    await delay(2000);
    setRobotStatus('idle');
  }, [isConnected, sendMove, sendDance, sendEmotion, sendWave, sendSleep, sendWake]);

  // ── Core command handler ──────────────────────────────────────────────────

  const handleCommand = useCallback(async (parsed: ParsedCommand) => {
    setLastCommand(parsed);

    if (parsed.command === 'unknown') {
      flashResponse(parsed.confirmationPhrase);
      soundService.play('wrong');
      speak(parsed.confirmationPhrase, 'calm');
      return;
    }

    // Visual + audio feedback
    flashResponse(parsed.confirmationPhrase);
    soundService.play('correct');
    speak(parsed.confirmationPhrase, 'excited');
    bounceRobot();

    // Append to history (max 6 entries)
    setHistory(prev => [parsed.command as VoiceCommandResult, ...prev].slice(0, 6));

    // Fire-and-forget robot command
    sendToRobot(parsed.command);
  }, [bounceRobot, flashResponse, sendToRobot]);

  // ── Speech recognition event listeners ───────────────────────────────────

  useSpeechRecognitionEvent('start', () => {
    processedRef.current = false;
    setIsListening(true);
    setTranscript('');
    flashResponse('I am listening…');
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    // If the session ended without a final result (e.g. no-speech), restore hint
    if (!processedRef.current) {
      flashResponse("I didn't hear anything. Tap the mic and try again!");
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);

    // Only act on the final result once
    if (event.isFinal && !processedRef.current) {
      processedRef.current = true;
      handleCommand(parseVoiceCommand(text));
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    processedRef.current = true;   // prevent duplicate handling via 'end'

    if (event.error === 'no-speech' || event.error === 'speech-timeout') {
      flashResponse("I didn't hear anything. Tap the mic and try again!");
    } else if (event.error === 'not-allowed') {
      setHasPermission(false);
      flashResponse('Microphone permission was denied. Please allow it in Settings.');
    } else if (event.error === 'aborted') {
      flashResponse('Tap the mic and say a command!');
    } else {
      flashResponse("Hmm, something went wrong. Tap the mic to try again!");
    }
  });

  useSpeechRecognitionEvent('nomatch', () => {
    if (!processedRef.current) {
      processedRef.current = true;
      handleCommand(parseVoiceCommand(''));   // will return 'unknown'
    }
  });

  // ── Toggle mic ────────────────────────────────────────────────────────────

  const toggleListening = async () => {
    tapFeedback();

    // Guard: show a friendly message when running in Expo Go
    if (!SPEECH_AVAILABLE_IN_ENV || !SpeechModule) {
      flashResponse('Voice recognition needs a development build. Check the banner below!');
      return;
    }

    if (isListening) {
      SpeechModule.abort();
      return;
    }

    // Request permission on first tap if not yet granted
    if (hasPermission === false || hasPermission === null) {
      const result = await SpeechModule.requestPermissionsAsync();
      setHasPermission(result.granted);
      if (!result.granted) {
        flashResponse('Microphone permission was not granted. Please allow it in Settings.');
        return;
      }
    }

    if (!isAvailable) {
      flashResponse('Speech recognition is not available on this device.');
      return;
    }

    setTranscript('');

    SpeechModule.start({
      lang:                        'en-US',
      interimResults:              true,   // show partial text while child speaks
      continuous:                  false,  // stop after one utterance
      requiresOnDeviceRecognition: false,
    });
  };

  // ── Derived display ───────────────────────────────────────────────────────

  const micColor    = isListening ? '#E91E63' : '#6C63FF';
  const micIcon     = isListening ? 'mic'     : 'mic-outline';

  const robotStatusLabel =
    robotStatus === 'sending' ? 'Sending…'              :
    robotStatus === 'sent'    ? 'Command sent!'         :
    robotStatus === 'error'   ? 'Robot unreachable'     :
    isConnected               ? 'Robot connected via BLE':
                                'Robot not connected';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.bg, { paddingTop: topPad }]}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { tapFeedback(); router.replace('/dashboard'); }}
          hitSlop={14}
        >
          <Ionicons name="arrow-back" size={26} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Ionicons name="mic" size={24} color={COLORS.white} />
          <Text style={styles.headerTitle}>Voice Command</Text>
        </View>

        {/* Robot connection badge */}
        <View style={[
          styles.connBadge,
          robotStatus === 'sent'  && styles.connBadgeGreen,
          robotStatus === 'error' && styles.connBadgeRed,
        ]}>
          <Ionicons
            name="ellipse"
            size={14}
            color={isConnected ? '#4CAF50' : '#9E9E9E'}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + SPACING.xl }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        {/* ═══════════════ BUILD REQUIRED BANNER ═══════════════ */}
        {/* Shown only in standard Expo Go where the native module is absent */}
        {!SPEECH_AVAILABLE_IN_ENV && (
          <View style={styles.buildBanner}>
            <MaterialCommunityIcons name="hammer" size={28} color="#795548" style={styles.buildBannerIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.buildBannerTitle}>Development Build Required</Text>
              <Text style={styles.buildBannerBody}>
                Voice recognition needs a custom Expo build — it is NOT included
                in standard Expo Go.{'\n\n'}
                To enable it, run:{'\n'}
                {'  '}
                <Text style={styles.buildBannerCode}>npx expo run:android</Text>
                {'\n'}or{'\n'}
                {'  '}
                <Text style={styles.buildBannerCode}>npx expo run:ios</Text>
              </Text>
            </View>
          </View>
        )}

        {/* ═══════════════ ROBOT CHARACTER ═══════════════ */}
        <Animated.View
          style={[
            styles.robotWrap,
            { transform: [{ translateY: robotY }, { scale: robotScale }] },
          ]}
        >
          <MaterialCommunityIcons name="robot-happy" size={80} color="#6C63FF" />
        </Animated.View>

        {/* ═══════════════ RESPONSE BUBBLE ═══════════════ */}
        <Animated.View style={[styles.responseBubble, { opacity: responseAlpha }]}>
          <Text style={styles.responseText}>{responseText}</Text>
        </Animated.View>

        {/* ═══════════════ TRANSCRIPT & PARSED COMMAND ═══════════════ */}
        <View style={styles.transcriptCard}>
          {transcript !== '' ? (
            <>
              <Text style={styles.transcriptLabel}>You said:</Text>
              <Text style={styles.transcriptText} numberOfLines={2}>
                &quot;{transcript}&quot;
              </Text>
            </>
          ) : (
            <Text style={styles.transcriptLabel}>
              {isListening ? 'Listening for your command…' : 'Say a command to get started!'}
            </Text>
          )}

          {lastCommand && lastCommand.command !== 'unknown' && (
            <View style={[styles.commandChip, { backgroundColor: COMMAND_COLOR[lastCommand.command as Exclude<VoiceCommandResult,'unknown'>] }]}>
              <EmojiIcon emoji={lastCommand.emoji} size={22} color="#fff" />
              <Text style={styles.commandChipLabel}>{lastCommand.displayLabel}</Text>
            </View>
          )}
        </View>

        {/* ═══════════════ MIC BUTTON ═══════════════ */}
        <View style={styles.micArea}>

          {/* Ripple ring 1 */}
          <Animated.View
            style={[
              styles.ring,
              {
                width:           MIC_SIZE,
                height:          MIC_SIZE,
                borderRadius:    MIC_RADIUS,
                borderColor:     micColor,
                opacity:         ring1Opacity,
                transform:       [{ scale: ring1Scale }],
              },
            ]}
          />

          {/* Ripple ring 2 */}
          <Animated.View
            style={[
              styles.ring,
              {
                width:           MIC_SIZE,
                height:          MIC_SIZE,
                borderRadius:    MIC_RADIUS,
                borderColor:     micColor,
                opacity:         ring2Opacity,
                transform:       [{ scale: ring2Scale }],
              },
            ]}
          />

          {/* The mic button itself */}
          <Animated.View style={{ transform: [{ scale: micScale }] }}>
            <TouchableOpacity
              style={[
                styles.micButton,
                { width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_RADIUS, backgroundColor: micColor },
                isListening && styles.micButtonActive,
              ]}
              onPress={toggleListening}
              activeOpacity={0.85}
              disabled={!isAvailable}
            >
              <Ionicons name={micIcon as any} size={MIC_SIZE * 0.40} color={COLORS.white} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Status text below the button */}
        <Text style={styles.micStatusText}>
          {!SPEECH_AVAILABLE_IN_ENV
            ? 'Needs development build — see banner'
            : !isAvailable
            ? 'Speech recognition unavailable on this device'
            : isListening
            ? 'Listening — speak now!'
            : hasPermission === false
            ? 'Tap to allow microphone'
            : 'Tap to speak a command'}
        </Text>

        {/* ═══════════════ COMMAND HISTORY ═══════════════ */}
        {history.length > 0 && (
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Recent:</Text>
            {history.map((cmd, i) => (
              <View
                key={i}
                style={[
                  styles.historyChip,
                  { backgroundColor: cmd !== 'unknown' ? COMMAND_COLOR[cmd as Exclude<VoiceCommandResult,'unknown'>] + 'CC' : '#607D8B' },
                ]}
              >
                <EmojiIcon
                  emoji={cmd !== 'unknown' ? COMMAND_EMOJI[cmd as Exclude<VoiceCommandResult,'unknown'>] : '❓'}
                  size={18}
                  color="#fff"
                />
              </View>
            ))}
          </View>
        )}

        {/* ═══════════════ COMMAND HINT CHIPS ═══════════════ */}
        <View style={styles.hintSection}>
          <Text style={styles.hintTitle}>Say one of these:</Text>
          <View style={styles.hintRow}>
            {HINT_COMMANDS.map(({ label, emoji }) => (
              <View key={label} style={styles.hintChip}>
                <EmojiIcon emoji={emoji} size={18} color="#fff" />
                <Text style={styles.hintLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══════════════ ROBOT STATUS BAR ═══════════════ */}
        <View style={styles.robotStatusBar}>
          <Text style={styles.robotStatusTxt}>{robotStatusLabel}</Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg: {
    flex:            1,
    backgroundColor: '#0A0A2E',
  },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#6C63FF',
    paddingVertical:   14,
    paddingHorizontal: SPACING.md,
    elevation:         6,
    shadowColor:       '#6C63FF',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.45,
    shadowRadius:      8,
  },
  backBtn: { padding: 4, marginRight: 4 },
  headerCenter: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  headerTitle: {
    color:      COLORS.white,
    fontSize:   FONT_SIZES.xlarge,
    fontWeight: 'bold',
  },
  connBadge: {
    width:          34,
    height:         34,
    borderRadius:   17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  connBadgeGreen: { backgroundColor: 'rgba(76,175,80,0.40)' },
  connBadgeRed:   { backgroundColor: 'rgba(229,57,53,0.40)' },
  connBadgeTxt:   { fontSize: 16 },

  // Main scroll
  scroll: {
    alignItems:        'center',
    paddingHorizontal: SPACING.lg,
    paddingTop:        SPACING.lg,
    gap:               SPACING.md,
  },

  // Robot character
  robotWrap: {
    width:          110,
    height:         110,
    borderRadius:   55,
    backgroundColor: 'rgba(108,99,255,0.20)',
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    2,
    borderColor:    'rgba(108,99,255,0.40)',
  },

  // Response speech bubble
  responseBubble: {
    backgroundColor:   '#1A1A4E',
    borderRadius:      BORDER_RADIUS.large,
    paddingVertical:   SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth:       1,
    borderColor:       'rgba(108,99,255,0.30)',
    width:             '100%',
    minHeight:         56,
    alignItems:        'center',
    justifyContent:    'center',
    // Small tail pointing up toward the robot
    marginTop:         -4,
  },
  responseText: {
    color:      COLORS.white,
    fontSize:   FONT_SIZES.large,
    fontWeight: 'bold',
    textAlign:  'center',
    lineHeight: 28,
  },

  // Transcript card
  transcriptCard: {
    backgroundColor:   'rgba(255,255,255,0.06)',
    borderRadius:      BORDER_RADIUS.medium,
    paddingVertical:   SPACING.sm,
    paddingHorizontal: SPACING.md,
    width:             '100%',
    minHeight:         48,
    gap:               6,
  },
  transcriptLabel: {
    color:      'rgba(255,255,255,0.45)',
    fontSize:   FONT_SIZES.small,
    fontWeight: '600',
  },
  transcriptText: {
    color:      'rgba(255,255,255,0.85)',
    fontSize:   FONT_SIZES.medium,
    fontStyle:  'italic',
  },
  commandChip: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    borderRadius:      BORDER_RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical:   6,
    gap:               6,
    marginTop:         4,
  },
  commandChipEmoji: { fontSize: 18 },
  commandChipLabel: {
    color:      '#fff',
    fontWeight: 'bold',
    fontSize:   FONT_SIZES.medium,
  },

  // Mic area (rings + button, all absolutely centred)
  micArea: {
    width:          MIC_SIZE * 2.6,
    height:         MIC_SIZE * 2.6,
    alignItems:     'center',
    justifyContent: 'center',
    marginVertical: SPACING.sm,
  },
  ring: {
    position:    'absolute',
    borderWidth: 3,
  },
  micButton: {
    alignItems:     'center',
    justifyContent: 'center',
    elevation:       14,
    shadowColor:    '#6C63FF',
    shadowOffset:   { width: 0, height: 6 },
    shadowOpacity:  0.55,
    shadowRadius:   14,
  },
  micButtonActive: {
    shadowColor:   '#E91E63',
    shadowOpacity: 0.70,
    elevation:     18,
  },

  // Status below button
  micStatusText: {
    color:     'rgba(255,255,255,0.55)',
    fontSize:  FONT_SIZES.medium,
    textAlign: 'center',
    marginTop: -SPACING.sm,
  },

  // Command history row
  historyRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            SPACING.xs,
    flexWrap:       'wrap',
    justifyContent: 'center',
  },
  historyLabel: {
    color:      'rgba(255,255,255,0.40)',
    fontSize:   FONT_SIZES.small,
    fontWeight: '600',
  },
  historyChip: {
    width:          38,
    height:         38,
    borderRadius:   19,
    alignItems:     'center',
    justifyContent: 'center',
  },
  historyEmoji: { fontSize: 18 },

  // Hint chips
  hintSection: {
    width: '100%',
    gap:   SPACING.sm,
  },
  hintTitle: {
    color:     'rgba(255,255,255,0.40)',
    fontSize:  FONT_SIZES.small,
    fontWeight: '600',
    textAlign: 'center',
  },
  hintRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            SPACING.sm,
    flexWrap:       'wrap',
  },
  hintChip: {
    backgroundColor:   'rgba(255,255,255,0.08)',
    borderRadius:      BORDER_RADIUS.medium,
    paddingVertical:   8,
    paddingHorizontal: 12,
    alignItems:        'center',
    gap:               2,
    minWidth:          56,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.12)',
  },
  hintEmoji: { fontSize: 20 },
  hintLabel: {
    color:      'rgba(255,255,255,0.55)',
    fontSize:   10,
    fontWeight: '600',
    textAlign:  'center',
  },

  // Robot status bar
  robotStatusBar: {
    backgroundColor:   'rgba(255,255,255,0.05)',
    borderRadius:      BORDER_RADIUS.pill,
    paddingVertical:   8,
    paddingHorizontal: SPACING.lg,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.10)',
  },
  robotStatusTxt: {
    color:     'rgba(255,255,255,0.45)',
    fontSize:  FONT_SIZES.small,
    textAlign: 'center',
  },

  // "Build required" banner shown in Expo Go
  buildBanner: {
    flexDirection:     'row',
    backgroundColor:   'rgba(255,165,0,0.15)',
    borderRadius:      BORDER_RADIUS.medium,
    borderWidth:       1,
    borderColor:       'rgba(255,165,0,0.40)',
    padding:           SPACING.md,
    gap:               SPACING.sm,
    width:             '100%',
    marginBottom:      SPACING.sm,
  },
  buildBannerIcon:  { fontSize: 28 },
  buildBannerTitle: {
    color:      '#FFA726',
    fontWeight: 'bold',
    fontSize:   FONT_SIZES.medium,
    marginBottom: 4,
  },
  buildBannerBody: {
    color:      'rgba(255,255,255,0.60)',
    fontSize:   12,
    lineHeight: 18,
  },
  buildBannerCode: {
    color:           '#FFD54F',
    fontFamily:      Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});
