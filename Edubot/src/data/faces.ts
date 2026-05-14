
export type EmotionType =
  | 'happy' | 'sad' | 'excited' | 'sleeping' | 'angry'
  | 'confused' | 'surprised' | 'laughing' | 'winking'
  | 'cool' | 'love' | 'nervous' | 'thinking' | 'silly' | 'robot';

export type EyeShape =
  | 'open' | 'closed' | 'wide' | 'dot' | 'x' | 'heart'
  | 'star' | 'half' | 'wink' | 'squint' | 'spiral';

export type MouthShape =
  | 'smile' | 'big_smile' | 'frown' | 'big_frown' | 'open'
  | 'flat' | 'o_shape' | 'teeth' | 'tongue' | 'kiss' | 'wavy';

export interface FaceFrame {
  leftEye:  EyeShape;
  rightEye: EyeShape;
  mouth:    MouthShape;
  cheeks?:  boolean;
}

export interface RobotFace {
  id:      string;
  name:    string;
  emotion: EmotionType;
  emoji:   string;
  color:   string;
  frames:  FaceFrame[];
  looping: boolean;
  frameMs: number;
}

// ─── Frame builders ───────────────────────────────────────────────────────────

const fr = (l: EyeShape, r: EyeShape, m: MouthShape, c = false): FaceFrame =>
  ({ leftEye: l, rightEye: r, mouth: m, cheeks: c });

const blink = (m: MouthShape, c = false): FaceFrame[] => [
  fr('open','open', m, c),
  fr('open','open', m, c),
  fr('open','open', m, c),
  fr('closed','closed', m, c),
  fr('open','open', m, c),
];

const slowBlink = (m: MouthShape, c = false): FaceFrame[] => [
  fr('open','open', m, c),
  fr('open','open', m, c),
  fr('open','open', m, c),
  fr('open','open', m, c),
  fr('closed','closed', m, c),
  fr('open','open', m, c),
];

const excite = (m: MouthShape): FaceFrame[] => [
  fr('wide','wide', m),
  fr('wide','wide', m),
  fr('closed','closed', m),
  fr('wide','wide', m),
];

const sleep = (): FaceFrame[] => [
  fr('closed','closed','flat'),
  fr('closed','closed','flat'),
  fr('closed','closed','flat'),
  fr('closed','closed','open'),
  fr('closed','closed','flat'),
];

const angry = (fast = false): FaceFrame[] => [
  fr('squint','squint','frown'),
  fr('squint','squint','big_frown'),
  fr('squint','squint','frown'),
  ...(fast ? [fr('squint','squint','big_frown')] : []),
];

const confused = (): FaceFrame[] => [
  fr('open','open','flat'),
  fr('squint','open','wavy'),
  fr('open','open','flat'),
  fr('open','squint','wavy'),
  fr('open','open','flat'),
];

const surprised = (): FaceFrame[] => [
  fr('wide','wide','o_shape'),
  fr('wide','wide','open'),
  fr('wide','wide','o_shape'),
];

const laugh = (): FaceFrame[] => [
  fr('closed','closed','teeth'),
  fr('closed','closed','big_smile'),
  fr('closed','closed','teeth'),
];

const wink = (m: MouthShape, c = false): FaceFrame[] => [
  fr('open','open', m, c),
  fr('open','open', m, c),
  fr('open','wink', m, c),
  fr('open','open', m, c),
];

const love = (): FaceFrame[] => [
  fr('heart','heart','smile',true),
  fr('heart','heart','kiss',true),
  fr('heart','heart','smile',true),
];

const nervous = (): FaceFrame[] => [
  fr('open','open','wavy'),
  fr('squint','squint','wavy'),
  fr('open','open','wavy'),
];

const halfBlink = (m: MouthShape): FaceFrame[] => [
  fr('half','half', m),
  fr('half','half', m),
  fr('closed','closed', m),
  fr('half','half', m),
];

// ─── Face factory ─────────────────────────────────────────────────────────────

const mk = (
  id: string, name: string, emotion: EmotionType, emoji: string, color: string,
  frames: FaceFrame[], frameMs = 600,
): RobotFace => ({ id, name, emotion, emoji, color, frames, looping: true, frameMs });

// ─── 112 Expressions ──────────────────────────────────────────────────────────

export const FACES: RobotFace[] = [

  // ── HAPPY (12) ──────────────────────────────────────────────────────────────
  mk('happy_1',     'Happy',        'happy', '😊', '#FFD700', blink('smile', true)),
  mk('happy_2',     'Big Happy',    'happy', '😄', '#FFC107', excite('big_smile')),
  mk('happy_3',     'Super Happy',  'happy', '😁', '#FFEB3B', blink('teeth', true), 500),
  mk('cheerful',    'Cheerful',     'happy', '🙂', '#FFB300', blink('smile', true), 700),
  mk('grin',        'Big Grin',     'happy', '😀', '#FF9800', blink('teeth'), 600),
  mk('beaming',     'Beaming',      'happy', '😃', '#FFD740', excite('smile'), 500),
  mk('delighted',   'Delighted',    'happy', '😍', '#FFF176', slowBlink('big_smile', true), 800),
  mk('joyful',      'Joyful',       'happy', '😊', '#FFE082', blink('smile', true), 600),
  mk('blissful',    'Blissful',     'happy', '😌', '#FFF9C4', slowBlink('smile', true), 900),
  mk('content',     'Content',      'happy', '🙂', '#FFECB3', slowBlink('smile'), 1000),
  mk('gleeful',     'Gleeful',      'happy', '😂', '#FFA726', excite('big_smile'), 450),
  mk('radiant',     'Radiant',      'happy', '✨', '#FFD600', [
    fr('wide','wide','smile',true),
    fr('open','open','smile',true),
    fr('wide','wide','smile',true),
  ], 700),

  // ── SAD (10) ────────────────────────────────────────────────────────────────
  mk('sad_1',        'Sad',          'sad', '😢', '#5C6BC0', [
    fr('open','open','frown'), fr('half','half','frown'), fr('open','open','frown'),
  ], 700),
  mk('sad_2',        'Sad Face',     'sad', '😞', '#7986CB', halfBlink('frown'), 800),
  mk('crying',       'Crying',       'sad', '😭', '#42A5F5', [
    fr('open','open','big_frown',true), fr('closed','closed','big_frown',true), fr('open','open','big_frown',true),
  ], 600),
  mk('tearful',      'Tearful',      'sad', '🥺', '#64B5F6', blink('frown'), 700),
  mk('disappointed', 'Disappointed', 'sad', '😟', '#78909C', slowBlink('frown'), 900),
  mk('miserable',    'Miserable',    'sad', '😩', '#546E7A', [
    fr('squint','squint','big_frown'), fr('squint','squint','frown'), fr('squint','squint','big_frown'),
  ], 700),
  mk('heartbroken',  'Heartbroken',  'sad', '💔', '#5E35B1', [
    fr('open','open','big_frown'), fr('closed','closed','big_frown'), fr('open','open','big_frown'),
  ], 600),
  mk('gloomy',       'Gloomy',       'sad', '😔', '#4A5568', halfBlink('frown'), 1000),
  mk('melancholy',   'Melancholy',   'sad', '😒', '#607D8B', slowBlink('frown'), 1000),
  mk('blue_face',    'Feeling Blue', 'sad', '🔵', '#4FC3F7', [
    fr('open','open','flat'), fr('half','half','flat'), fr('open','open','flat'),
  ], 800),

  // ── EXCITED (10) ────────────────────────────────────────────────────────────
  mk('excited_1', 'Excited!',      'excited', '🤩', '#FF4081', excite('big_smile'), 400),
  mk('excited_2', 'Super Excited', 'excited', '😝', '#FF6B35', excite('teeth'), 350),
  mk('thrilled',  'Thrilled',      'excited', '🎉', '#E91E63', excite('big_smile'), 380),
  mk('ecstatic',  'Ecstatic',      'excited', '🤪', '#AB47BC', [
    fr('wide','wide','big_smile'), fr('wide','wide','teeth'), fr('closed','closed','teeth'), fr('wide','wide','big_smile'),
  ], 350),
  mk('pumped',    'Pumped Up',     'excited', '💪', '#F44336', excite('teeth'), 400),
  mk('energized', 'Energized',     'excited', '⚡', '#FF7043', excite('big_smile'), 420),
  mk('hyped',     'Hyped!',        'excited', '🔥', '#2979FF', excite('teeth'), 350),
  mk('buzzing',   'Buzzing',       'excited', '🐝', '#00E676', excite('big_smile'), 380),
  mk('wild',      'Wild!',         'excited', '🤯', '#FF6D00', [
    fr('wide','wide','teeth'), fr('wide','wide','open'), fr('wide','wide','teeth'),
  ], 400),
  mk('electric',  'Electric',      'excited', '✨', '#448AFF', [
    fr('wide','wide','open'), fr('star','star','open'), fr('wide','wide','open'),
  ], 450),

  // ── SLEEPING (8) ────────────────────────────────────────────────────────────
  mk('sleeping_1', 'Sleeping',   'sleeping', '😴', '#3F51B5', sleep(), 1000),
  mk('sleeping_2', 'Deep Sleep', 'sleeping', '💤', '#1A237E', sleep(), 1200),
  mk('yawning',    'Yawning',    'sleeping', '🥱', '#9575CD', [
    fr('half','half','flat'), fr('open','open','open'), fr('half','half','flat'), fr('closed','closed','flat'),
  ], 900),
  mk('drowsy',   'Drowsy',    'sleeping', '😪', '#CE93D8', halfBlink('flat'), 900),
  mk('tired_1',  'Tired',     'sleeping', '😫', '#78909C', halfBlink('flat'), 800),
  mk('tired_2',  'Very Tired','sleeping', '😩', '#546E7A', halfBlink('frown'), 900),
  mk('dozing',   'Dozing Off','sleeping', '😴', '#303F9F', [
    fr('closed','closed','flat'), fr('closed','closed','flat'), fr('half','half','flat'), fr('closed','closed','flat'),
  ], 1100),
  mk('snoozing', 'Snoozing',  'sleeping', '💤', '#1565C0', sleep(), 1300),

  // ── ANGRY (8) ───────────────────────────────────────────────────────────────
  mk('angry_1', 'Angry',        'angry', '😠', '#F44336', angry(), 500),
  mk('angry_2', 'Really Angry', 'angry', '😡', '#B71C1C', angry(true), 400),
  mk('furious', 'Furious',      'angry', '🤬', '#C62828', angry(true), 350),
  mk('annoyed', 'Annoyed',      'angry', '😤', '#E53935', [
    fr('squint','squint','flat'), fr('squint','squint','frown'), fr('squint','squint','flat'),
  ], 600),
  mk('grumpy',  'Grumpy',       'angry', '😾', '#BF360C', [
    fr('squint','squint','frown'), fr('squint','squint','frown'),
  ], 700),
  mk('mad',     'Mad!',         'angry', '👿', '#D32F2F', angry(true), 450),
  mk('cross',   'Cross',        'angry', '😒', '#FF3D00', [
    fr('squint','squint','frown'), fr('open','open','frown'), fr('squint','squint','frown'),
  ], 600),
  mk('livid',   'Livid',        'angry', '💢', '#FF1744', angry(true), 350),

  // ── CONFUSED (8) ────────────────────────────────────────────────────────────
  mk('confused_1',  'Confused',      'confused', '😕', '#00BCD4', confused(), 700),
  mk('confused_2',  'Very Confused', 'confused', '🤔', '#0097A7', confused(), 550),
  mk('puzzled',     'Puzzled',       'confused', '❓', '#26C6DA', [
    fr('open','open','wavy'), fr('squint','open','wavy'), fr('open','open','wavy'),
  ], 700),
  mk('lost',        'Lost',          'confused', '😶', '#00ACC1', confused(), 750),
  mk('baffled',     'Baffled',       'confused', '😵', '#4DB6AC', [
    fr('wide','open','wavy'), fr('open','open','flat'), fr('open','wide','wavy'), fr('open','open','flat'),
  ], 600),
  mk('dazed',       'Dazed',         'confused', '😵', '#26A69A', [
    fr('spiral','spiral','flat'), fr('open','open','flat'), fr('spiral','spiral','flat'),
  ], 700),
  mk('dizzy',       'Dizzy',         'confused', '😵', '#80CBC4', [
    fr('x','x','flat'), fr('spiral','spiral','flat'), fr('x','x','flat'),
  ], 600),
  mk('questioning', 'Questioning',   'confused', '🧐', '#80DEEA', [
    fr('open','open','flat'), fr('open','squint','flat'), fr('open','open','flat'),
  ], 700),

  // ── SURPRISED (8) ───────────────────────────────────────────────────────────
  mk('surprised_1', 'Surprised!',    'surprised', '😮', '#FF9800', surprised(), 500),
  mk('surprised_2', 'Very Surprised','surprised', '😲', '#FFA726', surprised(), 450),
  mk('shocked',     'Shocked',       'surprised', '😱', '#FF8F00', [
    fr('wide','wide','o_shape'), fr('wide','wide','o_shape'), fr('wide','wide','open'),
  ], 500),
  mk('amazed',      'Amazed',        'surprised', '🤩', '#FFB74D', [
    fr('wide','wide','big_smile'), fr('star','star','big_smile'), fr('wide','wide','big_smile'),
  ], 500),
  mk('astonished',  'Astonished',    'surprised', '😯', '#FFC107', [
    fr('wide','wide','open'), fr('wide','wide','o_shape'), fr('wide','wide','open'),
  ], 550),
  mk('startled',    'Startled',      'surprised', '😬', '#FFCA28', surprised(), 450),
  mk('gasping',     'Gasping',       'surprised', '😤', '#FFD740', [
    fr('wide','wide','o_shape'), fr('wide','wide','open'), fr('wide','wide','o_shape'),
  ], 400),
  mk('wide_eyed',   'Wide Eyed',     'surprised', '👀', '#FF9E40', [
    fr('wide','wide','flat'), fr('wide','wide','flat'),
  ], 800),

  // ── LAUGHING (8) ────────────────────────────────────────────────────────────
  mk('laughing_1',  'Laughing',    'laughing', '😂', '#8BC34A', laugh(), 400),
  mk('laughing_2',  'Big Laugh',   'laughing', '🤣', '#7CB342', laugh(), 300),
  mk('giggling',    'Giggling',    'laughing', '😄', '#9CCC65', [
    fr('closed','closed','big_smile'), fr('open','open','big_smile'), fr('closed','closed','big_smile'),
  ], 450),
  mk('chuckling',   'Chuckling',   'laughing', '😆', '#AED581', laugh(), 500),
  mk('rofl',        'ROFL!',       'laughing', '🤣', '#76FF03', laugh(), 280),
  mk('hysterical',  'Hysterical',  'laughing', '😹', '#69F0AE', [
    fr('closed','closed','teeth'), fr('closed','closed','teeth'),
  ], 250),
  mk('cracking_up', 'Cracking Up', 'laughing', '😂', '#B9F6CA', laugh(), 350),
  mk('in_stitches', 'In Stitches', 'laughing', '🤣', '#64DD17', [
    fr('closed','closed','big_smile',true), fr('open','open','big_smile',true), fr('closed','closed','big_smile',true),
  ], 350),

  // ── WINKING (6) ─────────────────────────────────────────────────────────────
  mk('winking_1', 'Winking',  'winking', '😉', '#9C27B0', wink('smile'), 700),
  mk('winking_2', 'Big Wink', 'winking', '😜', '#7B1FA2', wink('big_smile'), 650),
  mk('sly',       'Sly',      'winking', '🤫', '#4A148C', wink('smile'), 800),
  mk('cheeky',    'Cheeky',   'winking', '😏', '#CE93D8', wink('smile', true), 700),
  mk('flirty',    'Flirty',   'winking', '😘', '#E040FB', wink('kiss', true), 650),
  mk('playful',   'Playful',  'winking', '😝', '#EA80FC', wink('tongue'), 600),

  // ── COOL (6) ────────────────────────────────────────────────────────────────
  mk('cool_1',    'Cool',      'cool', '😎', '#1565C0', [
    fr('dot','dot','flat'), fr('dot','dot','smile'), fr('dot','dot','flat'),
  ], 800),
  mk('cool_2',    'Super Cool','cool', '🕶️', '#0D47A1', [fr('dot','dot','smile')], 900),
  mk('suave',     'Suave',     'cool', '😏', '#1976D2', [fr('half','half','smile'), fr('half','half','smile')], 1000),
  mk('chill',     'Chill',     'cool', '🧊', '#2196F3', [fr('half','half','flat'), fr('half','half','flat')], 1100),
  mk('swag',      'Swag',      'cool', '😈', '#283593', [fr('dot','dot','flat'), fr('dot','dot','flat')], 900),
  mk('laid_back', 'Laid Back', 'cool', '🤙', '#37474F', [
    fr('half','half','smile'), fr('half','half','flat'), fr('half','half','smile'),
  ], 1000),

  // ── LOVE (6) ────────────────────────────────────────────────────────────────
  mk('love_1',     'In Love',    'love', '😍', '#E91E63', love(), 600),
  mk('love_2',     'Big Love',   'love', '🥰', '#D81B60', love(), 500),
  mk('adoring',    'Adoring',    'love', '💖', '#F06292', [
    fr('heart','heart','kiss',true), fr('heart','heart','smile',true), fr('heart','heart','kiss',true),
  ], 600),
  mk('smitten',    'Smitten',    'love', '💗', '#EC407A', love(), 650),
  mk('lovesick',   'Lovesick',   'love', '💝', '#AD1457', [
    fr('heart','heart','frown',true), fr('heart','heart','smile',true), fr('heart','heart','frown',true),
  ], 700),
  mk('heart_eyes', 'Heart Eyes', 'love', '❤️', '#C2185B', [
    fr('heart','heart','big_smile',true), fr('heart','heart','teeth',true), fr('heart','heart','big_smile',true),
  ], 500),

  // ── NERVOUS (5) ─────────────────────────────────────────────────────────────
  mk('nervous_1', 'Nervous',      'nervous', '😬', '#4CAF50', nervous(), 600),
  mk('nervous_2', 'Very Nervous', 'nervous', '😰', '#388E3C', nervous(), 450),
  mk('anxious',   'Anxious',      'nervous', '😟', '#66BB6A', [
    fr('squint','squint','wavy'), fr('open','open','wavy'), fr('squint','squint','wavy'),
  ], 550),
  mk('worried',   'Worried',      'nervous', '😥', '#A5D6A7', [
    fr('open','open','frown'), fr('squint','squint','wavy'), fr('open','open','frown'),
  ], 650),
  mk('sweating',  'Sweating',     'nervous', '😓', '#C8E6C9', [
    fr('open','open','wavy'), fr('open','open','flat'), fr('open','open','wavy'),
  ], 500),

  // ── THINKING (5) ────────────────────────────────────────────────────────────
  mk('thinking_1',    'Thinking',      'thinking', '🤔', '#03A9F4', [
    fr('open','squint','flat'), fr('open','open','flat'), fr('open','squint','flat'),
  ], 800),
  mk('thinking_2',    'Deep Think',    'thinking', '💭', '#0288D1', [
    fr('squint','open','flat'), fr('open','open','flat'), fr('squint','open','flat'),
  ], 900),
  mk('pondering',     'Pondering',     'thinking', '🧠', '#29B6F6', [
    fr('open','open','flat'), fr('open','open','flat'), fr('open','squint','flat'), fr('open','open','flat'),
  ], 900),
  mk('contemplating', 'Contemplating', 'thinking', '💡', '#039BE5', [
    fr('half','half','flat'), fr('open','open','flat'), fr('half','half','flat'),
  ], 1000),
  mk('calculating',   'Calculating',   'thinking', '🔢', '#4FC3F7', [
    fr('dot','dot','flat'), fr('open','open','flat'), fr('dot','dot','flat'),
  ], 700),

  // ── SILLY / PARTY (7) ───────────────────────────────────────────────────────
  mk('silly_1', 'Silly!',      'silly', '🤪', '#FF9800', [
    fr('x','x','tongue'), fr('open','open','tongue'), fr('x','x','tongue'),
  ], 450),
  mk('silly_2', 'Goofball',    'silly', '🤡', '#F57C00', [
    fr('x','open','big_smile'), fr('open','x','big_smile'), fr('x','open','big_smile'),
  ], 500),
  mk('party_1', 'Party Time!', 'silly', '🎉', '#FFD700', [
    fr('wide','wide','teeth'), fr('star','star','teeth'), fr('wide','wide','teeth'),
  ], 400),
  mk('party_2', 'Party Mode',  'silly', '🎊', '#FF5722', excite('big_smile'), 380),
  mk('sick',    'Not Well',    'silly', '🤢', '#7CB342', [
    fr('x','x','flat'), fr('squint','squint','flat'), fr('x','x','flat'),
  ], 700),
  mk('eww',     'Ewww!',       'silly', '🤮', '#9E9D24', [
    fr('x','x','frown'), fr('squint','squint','frown'), fr('x','x','frown'),
  ], 600),
  mk('hungry',  'Hungry!',     'silly', '😋', '#FF8F00', [
    fr('open','open','tongue'), fr('open','open','big_smile'), fr('open','open','tongue'),
  ], 500),

  // ── ROBOT (5) ───────────────────────────────────────────────────────────────
  mk('robot_1',  'Robot Mode', 'robot', '🤖', '#9E9E9E', [fr('dot','dot','flat')], 1000),
  mk('robot_2',  'Computing',  'robot', '💻', '#78909C', [
    fr('x','dot','flat'), fr('dot','x','flat'), fr('dot','dot','flat'),
  ], 600),
  mk('scanning', 'Scanning',   'robot', '🔍', '#546E7A', [
    fr('spiral','open','flat'), fr('open','spiral','flat'), fr('spiral','open','flat'),
  ], 700),
  mk('charging', 'Charging',   'robot', '🔋', '#1565C0', [
    fr('half','half','flat'), fr('closed','closed','flat'), fr('half','half','flat'),
  ], 800),
  mk('power_up', 'Power Up!',  'robot', '⚡', '#37474F', [
    fr('wide','wide','open'), fr('star','star','big_smile'), fr('wide','wide','open'),
  ], 500),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getFaceById = (id: string): RobotFace | undefined =>
  FACES.find(f => f.id === id);

export const getFacesByEmotion = (emotion: EmotionType): RobotFace[] =>
  FACES.filter(f => f.emotion === emotion);

export const EMOTIONS: EmotionType[] = [
  'happy','sad','excited','sleeping','angry',
  'confused','surprised','laughing','winking',
  'cool','love','nervous','thinking','silly','robot',
];

export const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: 'Happy', sad: 'Sad', excited: 'Excited', sleeping: 'Sleeping',
  angry: 'Angry', confused: 'Confused', surprised: 'Surprised',
  laughing: 'Laughing', winking: 'Winking', cool: 'Cool', love: 'Love',
  nervous: 'Nervous', thinking: 'Thinking', silly: 'Silly', robot: 'Robot',
};

export const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#FFD700', sad: '#5C6BC0', excited: '#FF4081', sleeping: '#3F51B5',
  angry: '#F44336', confused: '#00BCD4', surprised: '#FF9800',
  laughing: '#8BC34A', winking: '#9C27B0', cool: '#1565C0', love: '#E91E63',
  nervous: '#4CAF50', thinking: '#03A9F4', silly: '#FF5722', robot: '#607D8B',
};
