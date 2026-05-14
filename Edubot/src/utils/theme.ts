// Edubot Design System – child-friendly UI (ages 3–5)
// Soft teal primary, warm yellow secondary, coral accent

export const THEME = {
  colors: {
    // Primary – soft teal / mint
    primary:      '#4ECDC4',
    primaryDark:  '#38B2AC',
    primaryLight: '#B2F5EA',

    // Secondary – warm yellow
    secondary:      '#FFD166',
    secondaryDark:  '#F59E0B',
    secondaryLight: '#FEF3C7',

    // Accent – coral
    accent:      '#FF6B6B',
    accentLight: '#FED7D7',

    // Backgrounds
    background:    '#EEF6FF',
    backgroundAlt: '#F8FAFF',

    // Surfaces
    card:    '#FFFFFF',
    cardAlt: '#F7FAFF',

    // Text
    text:      '#1A2340',
    textMuted: '#5A6B8A',
    textLight: '#A0AEC0',

    // Utility
    border:  '#E2ECF8',
    divider: '#EDF2F7',
    success: '#06D6A0',
    warning: '#FFD166',
    danger:  '#FF6B6B',
    white:   '#FFFFFF',
    black:   '#000000',

    // Named colours preserved for learning games backward-compat
    red:    '#FF6B6B',
    blue:   '#4ECDC4',
    green:  '#06D6A0',
    yellow: '#FFD166',
    orange: '#FF9F43',
    purple: '#A78BFA',
    pink:   '#F472B6',
    cyan:   '#4ECDC4',
  },

  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },

  radius: {
    xs:   6,
    sm:   12,
    md:   18,
    lg:   26,
    xl:   36,
    full: 9999,
  },

  fontSize: {
    xs:   12,
    sm:   14,
    md:   16,
    lg:   20,
    xl:   26,
    xxl:  34,
    xxxl: 44,
  },

  shadow: {
    sm: {
      shadowColor:   '#4ECDC4',
      shadowOffset:  { width: 0, height: 2 } as const,
      shadowOpacity: 0.15,
      shadowRadius:  6,
      elevation:     3,
    },
    md: {
      shadowColor:   '#1A2340',
      shadowOffset:  { width: 0, height: 4 } as const,
      shadowOpacity: 0.10,
      shadowRadius:  10,
      elevation:     5,
    },
    lg: {
      shadowColor:   '#1A2340',
      shadowOffset:  { width: 0, height: 6 } as const,
      shadowOpacity: 0.12,
      shadowRadius:  16,
      elevation:     8,
    },
  },
};

export type Theme = typeof THEME;
