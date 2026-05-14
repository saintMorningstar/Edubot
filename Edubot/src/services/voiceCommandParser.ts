/**
 * src/services/voiceCommandParser.ts
 *
 * Converts a raw speech-recognition transcript into a structured robot command.
 * Designed for children aged 1–5: tolerant keyword matching, friendly phrases.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type VoiceCommandResult =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'stop'
  | 'dance'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'excited'
  | 'sleepy'
  | 'wave'
  | 'sleep'
  | 'wake'
  | 'unknown';

export interface ParsedCommand {
  command:            VoiceCommandResult;
  confirmationPhrase: string;
  emoji:              string;
  displayLabel:       string;
}

// ── Confirmation phrase pools ─────────────────────────────────────────────────

const PHRASES: Record<Exclude<VoiceCommandResult, 'unknown'>, string[]> = {
  forward: [
    "Okay! Let's go forward!",
    "Moving forward! Here we go!",
    "Forward! Woohoo!",
    "Vroom! Moving forward!",
  ],
  backward: [
    "Going backward! Beep beep!",
    "Reversing! Watch out behind me!",
    "Moving backward!",
  ],
  left: [
    "Turning left!",
    "Going left — good idea!",
    "Left turn! Wheee!",
  ],
  right: [
    "Turning right!",
    "Going right — nice one!",
    "Right turn! Here we go!",
  ],
  stop: [
    "Stopping now!",
    "Whoa! I'll stop!",
    "Okay, stopping!",
    "Freeze! Good call!",
  ],
  dance: [
    "Let's dance! Woohoo!",
    "Dancing time! Shake it!",
    "I love dancing! Watch me!",
    "Party time! Here I go!",
  ],
  happy: [
    "Yay! I'm so happy!",
    "Happiness mode on! Wheee!",
    "Happy happy happy! This is great!",
  ],
  sad: [
    "Oh... feeling sad now.",
    "Aww, sad face. It's okay!",
    "Sad mode... need a hug?",
  ],
  angry: [
    "Rawr! Angry mode!",
    "Grr! Watch out!",
    "I'm angry! Raaawr!",
  ],
  excited: [
    "Woohoo! So excited!",
    "Yay yay yay! Super excited!",
    "Eeeek! I'm so excited!",
  ],
  sleepy: [
    "Yawwwn... getting sleepy.",
    "Zzz... feeling so tired.",
    "So sleepy... eyes closing...",
  ],
  wave: [
    "Hello! Waving at you!",
    "Hi there! Wave wave wave!",
    "Hiii! Nice to meet you!",
  ],
  sleep: [
    "Goodnight! Going to sleep now...",
    "Zzz... sleeping. Shh!",
    "Nighty night! See you soon!",
  ],
  wake: [
    "Good morning! I'm awake!",
    "Waking up! Hello world!",
    "Rise and shine! I'm back!",
  ],
};

const UNKNOWN_PHRASES: string[] = [
  "I didn't understand. Try saying forward, dance, or stop!",
  "Hmm, I couldn't hear that clearly. Say forward, left, or dance!",
  "What was that? Try again — say stop or wave!",
  "I missed that! Can you say it again?",
];

// ── Keyword rules (first match wins) ─────────────────────────────────────────

const KEYWORD_RULES: Array<{ keywords: string[]; command: Exclude<VoiceCommandResult, 'unknown'> }> = [
  // Movement — specific phrases first to avoid partial matches
  { keywords: ['go forward', 'move forward', 'go ahead', 'move ahead', 'forward', 'straight', 'go go'], command: 'forward'  },
  { keywords: ['go back', 'move back', 'backward', 'backwards', 'reverse', 'back up'],                  command: 'backward' },
  { keywords: ['turn left', 'go left', 'left'],                                                         command: 'left'     },
  { keywords: ['turn right', 'go right', 'right'],                                                      command: 'right'    },
  { keywords: ['stop', 'halt', 'freeze', 'no more', 'cease'],                                           command: 'stop'     },
  // Emotions & expressions
  { keywords: ['start dancing', 'lets dance', "let's dance", 'dance', 'boogie'],                        command: 'dance'    },
  { keywords: ['be happy', 'feel happy', 'happy', 'smile'],                                             command: 'happy'    },
  { keywords: ['be sad', 'feel sad', 'sad', 'unhappy'],                                                 command: 'sad'      },
  { keywords: ['be angry', 'feel angry', 'angry', 'mad', 'be mad'],                                     command: 'angry'    },
  { keywords: ['get excited', 'be excited', 'excited'],                                                  command: 'excited'  },
  { keywords: ['feel sleepy', 'sleepy', 'tired', 'drowsy'],                                              command: 'sleepy'   },
  // Actions
  { keywords: ['wave hello', 'wave hi', 'say hello', 'wave', 'hello', 'hi robot'],                      command: 'wave'     },
  { keywords: ['go to sleep', 'sleep now', 'sleep', 'bedtime', 'night night'],                          command: 'sleep'    },
  { keywords: ['wake up now', 'wake up', 'wake', 'good morning'],                                       command: 'wake'     },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function parseVoiceCommand(transcript: string): ParsedCommand {
  const text = transcript.toLowerCase().trim();

  for (const { keywords, command } of KEYWORD_RULES) {
    if (keywords.some(kw => text.includes(kw))) {
      return {
        command,
        confirmationPhrase: pick(PHRASES[command]),
        emoji:              COMMAND_EMOJI[command],
        displayLabel:       COMMAND_LABEL[command],
      };
    }
  }

  return {
    command:            'unknown',
    confirmationPhrase: pick(UNKNOWN_PHRASES),
    emoji:              '🤔',
    displayLabel:       'Unknown',
  };
}

// ── Display metadata ──────────────────────────────────────────────────────────

export const COMMAND_EMOJI: Record<Exclude<VoiceCommandResult, 'unknown'>, string> = {
  forward:  '⬆️',
  backward: '⬇️',
  left:     '↰',
  right:    '↱',
  stop:     '✋',
  dance:    '💃',
  happy:    '😊',
  sad:      '😢',
  angry:    '😠',
  excited:  '🤩',
  sleepy:   '😴',
  wave:     '👋',
  sleep:    '💤',
  wake:     '☀️',
};

export const COMMAND_LABEL: Record<Exclude<VoiceCommandResult, 'unknown'>, string> = {
  forward:  'Forward',
  backward: 'Backward',
  left:     'Turn Left',
  right:    'Turn Right',
  stop:     'Stop',
  dance:    'Dance',
  happy:    'Happy',
  sad:      'Sad',
  angry:    'Angry',
  excited:  'Excited',
  sleepy:   'Sleepy',
  wave:     'Wave',
  sleep:    'Sleep',
  wake:     'Wake Up',
};

export const COMMAND_COLOR: Record<Exclude<VoiceCommandResult, 'unknown'>, string> = {
  forward:  '#1E88E5',
  backward: '#039BE5',
  left:     '#43A047',
  right:    '#FB8C00',
  stop:     '#E53935',
  dance:    '#E91E63',
  happy:    '#FFC107',
  sad:      '#5C6BC0',
  angry:    '#B71C1C',
  excited:  '#FF6F00',
  sleepy:   '#7B1FA2',
  wave:     '#00897B',
  sleep:    '#3949AB',
  wake:     '#F9A825',
};
