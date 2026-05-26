// constants/theme.js
// Single source of truth for all design tokens

export const colors = {
  cream:     '#FAF8F5',
  cream2:    '#F2EFE9',
  cream3:    '#E8E3DA',
  ink:       '#1A1916',
  ink2:      '#6B6760',
  ink3:      '#AAA49D',
  ink4:      '#D4D0CA',
  gold:      '#C4956A',
  goldBg:    '#FBF5EE',
  goldLight: '#F0E4D4',
  green:     '#2D6A4F',
  greenBg:   '#EDF7F2',
  red:       '#C0392B',
  redBg:     '#FDECEA',
  blue:      '#2563EB',
  blueBg:    '#EEF4FF',
  border:    'rgba(26,25,22,0.09)',
  border2:   'rgba(26,25,22,0.16)',
  white:     '#FFFFFF',
};

export const radius = {
  xs:   8,
  sm:   12,
  md:   16,
  lg:   18,
  xl:   24,
  pill: 100,
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
};

export const fontSize = {
  xs:   10,
  sm:   12,
  md:   13,
  base: 14,
  lg:   15,
  xl:   16,
  xxl:  18,
  h3:   20,
  h2:   24,
  h1:   28,
  display: 34,
};

export const fontWeight = {
  regular: '400',
  medium:  '500',
  semibold:'600',
};

// Screenshot categories
export const CATEGORIES = {
  shopping: {
    label: 'Shopping',
    emoji: '🛍️',
    colors: { bg: '#FFF8F0', accent: '#CC8844', dark: '#331100' },
  },
  food: {
    label: 'Food',
    emoji: '🍔',
    colors: { bg: '#F0FFF4', accent: '#338844', dark: '#001A00' },
  },
  ticket: {
    label: 'Travel',
    emoji: '✈️',
    colors: { bg: '#F0F4FF', accent: '#3355CC', dark: '#001033' },
  },
  quote: {
    label: 'Quote',
    emoji: '💬',
    colors: { bg: '#F8F8F8', accent: '#666666', dark: '#111111' },
  },
  social: {
    label: 'Social',
    emoji: '📱',
    colors: { bg: '#FFF0F8', accent: '#CC3388', dark: '#1A0030' },
  },
  work: {
    label: 'Work',
    emoji: '💼',
    colors: { bg: '#F0FFFE', accent: '#336677', dark: '#001015' },
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

// Stack templates shown when creating a new stack
export const STACK_TEMPLATES = [
  { name: 'Holiday inspo',  emoji: '✈️' },
  { name: 'Home ideas',     emoji: '🏠' },
  { name: 'Gift wishlist',  emoji: '🎁' },
  { name: 'Recipes to try', emoji: '🍔' },
  { name: 'Things to buy',  emoji: '🛍️' },
  { name: 'Work notes',     emoji: '💼' },
];

// Emoji options for custom stacks
export const EMOJI_OPTIONS = [
  '📁','🛍️','🍔','✈️','💬','📌','💼','❤️',
  '⭐','📝','🎵','🏠','💰','📸','🎮','🧳',
  '🎨','🌿','💡','🔖','📦','🎯','🌟','🔑',
];

export const shadows = {
  sm: {
    shadowColor: '#1A1916',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1916',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1A1916',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
};
