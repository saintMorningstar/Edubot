import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { bleService, type ConnectionState, type TelemetryData } from '../services/BLEService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationEntry {
  id:        string;
  role:      'robot' | 'user';
  text:      string;
  timestamp: number;
}

export interface RobotStatus {
  state: 'IDLE' | 'WALKING' | 'DANCING' | 'SLEEPING' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'UNKNOWN';
}

interface RobotContextValue {
  // Connection
  connectionState: ConnectionState;
  isConnected:     boolean;
  scan:            () => void;
  disconnect:      () => void;

  // Sensor telemetry (live from BLE NOTIFY)
  telemetry: TelemetryData;

  // Command shortcuts (all map to BLE commands)
  sendMove:     (direction: 'forward' | 'backward' | 'left' | 'right' | 'stop') => void;
  sendEmotion:  (name: string) => void;
  sendFace:     (name: string) => void;
  sendDance:    () => void;
  sendStopDance:() => void;
  sendWave:     () => void;
  sendStop:     () => void;
  sendSleep:    () => void;
  sendWake:     () => void;
  sendSound:    (n: number) => void;
  sendVolume:   (vol: number) => void;
  sendServo:    (channel: number, angle: number) => void;
  requestStatus:() => void;

  // Conversation
  conversation:     ConversationEntry[];
  clearConversation:() => void;
  requestVoice:     () => void;
  robotStatus:      RobotStatus | null;

  // Nursery rhymes
  isPlayingRhyme: boolean;
  activeRhyme:    string | null;
  playRhyme:      (id: string) => void;
  stopRhyme:      () => void;

  // Legacy aliases (keep screens from breaking)
  sendLed:      (state: string) => void;
  sendDanceCmd: () => void;
  robotIP:      string;
}

// ─── Context setup ────────────────────────────────────────────────────────────

const RobotContext = createContext<RobotContextValue | null>(null);

const DEFAULT_TELEMETRY: TelemetryData = {
  batteryVoltage: 0,
  distanceCM:     0,
  heartRate:      0,
  spO2:           0,
  temperature:    0,
  humidity:       0,
};

// Firmware only exposes PLAY_SOUND_1..5 via BLE; map rhyme IDs to those tracks
const RHYME_SOUNDS: Record<string, number> = {
  twinkle: 4, humpty: 5, baa_baa: 1, jack_jill: 2,
  old_mcdonald: 3, itsy_bitsy: 4, row_your_boat: 5,
  wheels_bus: 1, mary_lamb: 2, heads_shoulders: 3,
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function RobotProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [telemetry,       setTelemetry]       = useState<TelemetryData>(DEFAULT_TELEMETRY);
  const [conversation,    setConversation]    = useState<ConversationEntry[]>([]);
  const [robotStatus,     setRobotStatus]     = useState<RobotStatus | null>(null);
  const entryIdRef = useRef(0);

  const addEntry = useCallback((role: 'robot' | 'user', text: string) => {
    const entry: ConversationEntry = {
      id:        String(entryIdRef.current++),
      role,
      text,
      timestamp: Date.now(),
    };
    setConversation(prev => [...prev, entry]);
  }, []);

  useEffect(() => {
    bleService.onConnectionChange(setConnectionState);
    bleService.onTelemetryUpdate(setTelemetry);
    bleService.onStatusMessage((msg: string) => {
      // Firmware sends JSON: {"state":"IDLE"} or {"event":"CONNECTED","robot":"Edubot"}
      try {
        const parsed = JSON.parse(msg);
        if (parsed.state) {
          setRobotStatus({ state: parsed.state as RobotStatus['state'] });
        }
        // {"event":"CONNECTED"} — no state change needed
      } catch {
        console.log('[BLE Status]', msg);
      }
    });
  }, [addEntry]);

  const scan       = useCallback(() => { bleService.scan(); }, []);
  const disconnect = useCallback(() => { bleService.disconnect(); }, []);

  const [activeRhyme,    setActiveRhyme]    = useState<string | null>(null);
  const rhymeTimerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const rhymeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const _clearRhymeTimers = useCallback(() => {
    if (rhymeTimerRef.current)    { clearTimeout(rhymeTimerRef.current);   rhymeTimerRef.current = null; }
    if (rhymeIntervalRef.current) { clearInterval(rhymeIntervalRef.current); rhymeIntervalRef.current = null; }
  }, []);

  const stopRhyme = useCallback(() => {
    _clearRhymeTimers();
    bleService.sendStopSound();
    setActiveRhyme(null);
  }, [_clearRhymeTimers]);

  const playRhyme = useCallback((id: string) => {
    _clearRhymeTimers();
    const trackNum = RHYME_SOUNDS[id] ?? 1;
    bleService.sendSound(trackNum);
    setActiveRhyme(id);
    // Resend every 25 s so short tracks loop within the 60 s window
    rhymeIntervalRef.current = setInterval(() => bleService.sendSound(trackNum), 25000);
    // Auto-stop after 60 s
    rhymeTimerRef.current = setTimeout(() => {
      if (rhymeIntervalRef.current) { clearInterval(rhymeIntervalRef.current); rhymeIntervalRef.current = null; }
      bleService.sendStopSound();
      setActiveRhyme(null);
    }, 60000);
  }, [_clearRhymeTimers]);

  const value: RobotContextValue = {
    connectionState,
    isConnected: connectionState === 'connected',
    scan,
    disconnect,
    telemetry,

    sendMove:      (dir) => bleService.sendMove(dir),
    sendEmotion:   (name) => bleService.sendEmotion(name),
    sendFace:      (name) => bleService.sendFace(name),
    sendDance:     () => bleService.sendDance(),
    sendStopDance: () => bleService.sendStopDance(),
    sendWave:      () => bleService.sendWave(),
    sendStop:      () => bleService.sendStop(),
    sendSleep:     () => bleService.sendSleep(),
    sendWake:      () => bleService.sendWake(),
    sendSound:     (n) => bleService.sendSound(n),
    sendVolume:    (vol) => bleService.sendVolume(vol),
    sendServo:     (ch, angle) => bleService.sendServo(ch, angle),
    requestStatus: () => bleService.requestStatus(),

    // Conversation
    conversation,
    clearConversation: () => setConversation([]),
    requestVoice:      () => bleService.sendCommand('STATUS'),
    robotStatus,

    // Nursery rhymes
    isPlayingRhyme: activeRhyme !== null,
    activeRhyme,
    playRhyme,
    stopRhyme,

    // Legacy aliases
    sendLed:      (_state: string) => {},
    sendDanceCmd: () => bleService.sendDance(),
    robotIP:      'BLE',
  };

  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRobot(): RobotContextValue {
  const ctx = useContext(RobotContext);
  if (!ctx) throw new Error('useRobot must be inside <RobotProvider>');
  return ctx;
}
