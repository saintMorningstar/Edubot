

import { IconFamily } from '../components/AppIcon';

// ─── Colour palette ────────────────────────────────────────────────────────────
export const COLORS = {
  primary:    '#6C63FF',
  secondary:  '#FF6584',
  success:    '#4CAF50',
  warning:    '#FF9800',
  danger:     '#F44336',
  background: '#F5F5F5',
  card:       '#FFFFFF',
  text:       '#333333',
  textLight:  '#888888',
  white:      '#FFFFFF',
  black:      '#000000',

  
  red:    '#F44336',
  blue:   '#2196F3',
  green:  '#4CAF50',
  yellow: '#FFEB3B',
  orange: '#FF9800',
  purple: '#9C27B0',
  pink:   '#E91E63',
  cyan:   '#00BCD4',
} as const;


export const FONT_SIZES = {
  small:   16,
  medium:  20,
  large:   28,
  xlarge:  36,
  xxlarge: 48,
} as const;


export const BORDER_RADIUS = {
  small:  8,
  medium: 16,
  large:  24,
  pill:   50,
} as const;

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;


export const ACTIVITIES = {
  colors: {
    key: 'colors', label: 'Colors',
    iconName: 'palette', iconFamily: 'MaterialCommunityIcons' as IconFamily,
    color: '#F44336',
  },
  numbers: {
    key: 'numbers', label: 'Numbers',
    iconName: 'numeric', iconFamily: 'MaterialCommunityIcons' as IconFamily,
    color: '#2196F3',
  },
  shapes: {
    key: 'shapes', label: 'Shapes',
    iconName: 'shape', iconFamily: 'MaterialCommunityIcons' as IconFamily,
    color: '#4CAF50',
  },
  coding: {
    key: 'coding', label: 'Coding',
    iconName: 'code-slash-outline', iconFamily: 'Ionicons' as IconFamily,
    color: '#9C27B0',
  },
} as const;


export const COLOR_GAME_COLORS = [
  { name: 'Red',    value: '#F44336', command: 'red'    },
  { name: 'Blue',   value: '#2196F3', command: 'blue'   },
  { name: 'Green',  value: '#4CAF50', command: 'green'  },
  { name: 'Yellow', value: '#FFEB3B', command: 'yellow' },
  { name: 'Orange', value: '#FF9800', command: 'orange' },
  { name: 'Purple', value: '#9C27B0', command: 'purple' },
] as const;

export type ColorItem = (typeof COLOR_GAME_COLORS)[number];

export const NUMBER_GAME_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const NUMBER_WORDS: Record<number, string> = {
  1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE',
  6: 'SIX', 7: 'SEVEN', 8: 'EIGHT', 9: 'NINE', 10: 'TEN',
};


export const SHAPE_GAME_SHAPES = [
  { name: 'Circle',   iconName: 'circle-outline',   description: 'A perfectly round shape' },
  { name: 'Square',   iconName: 'square-outline',   description: 'Four equal sides'         },
  { name: 'Triangle', iconName: 'triangle-outline', description: 'Three sides'              },
  { name: 'Star',     iconName: 'star-outline',     description: 'A pointy star shape'      },
  { name: 'Heart',    iconName: 'heart-outline',    description: 'A heart shape'            },
  { name: 'Diamond',  iconName: 'diamond-outline',  description: 'A tilted square'          },
] as const;

export type ShapeItem = (typeof SHAPE_GAME_SHAPES)[number];


export const CODING_BLOCKS = [
  { id: 'forward',       label: 'Move Forward', iconName: 'arrow-up-bold',       command: 'forward',       color: '#2196F3' },
  { id: 'backward',      label: 'Move Back',    iconName: 'arrow-down-bold',     command: 'backward',      color: '#FF9800' },
  { id: 'left',          label: 'Turn Left',    iconName: 'arrow-left-bold',     command: 'left',          color: '#4CAF50' },
  { id: 'right',         label: 'Turn Right',   iconName: 'arrow-right-bold',    command: 'right',         color: '#43A047' },
  { id: 'wave',          label: 'Wave',         iconName: 'hand-wave',           command: 'wave',          color: '#E91E63' },
  { id: 'dance',         label: 'Dance',        iconName: 'music-note',          command: 'dance',         color: '#9C27B0' },
  { id: 'face_happy',    label: 'Happy Face',   iconName: 'emoticon-happy',      command: 'face_happy',    color: '#00BCD4' },
  { id: 'face_excited',  label: 'Excited!',     iconName: 'emoticon-excited',    command: 'face_excited',  color: '#FF5722' },
  { id: 'wait',          label: 'Wait 1 sec',   iconName: 'timer-sand',          command: 'wait',          color: '#607D8B' },
] as const;

export type CodingBlock = (typeof CODING_BLOCKS)[number];
