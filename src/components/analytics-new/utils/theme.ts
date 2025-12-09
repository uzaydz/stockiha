/**
 * ============================================
 * STOCKIHA ANALYTICS - DESIGN SYSTEM
 * نظام التصميم الموحد - Minimal Dark + Hybrid Modern
 * ============================================
 */

// ==================== Color Palette ====================

export const colors = {
  // Primary Colors - Sophisticated Blues
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Success - Emerald Green
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Warning - Amber
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Danger - Rose Red
  danger: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },

  // Purple - For Zakat & Special
  purple: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
  },

  // Cyan - For Info
  cyan: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63',
  },

  // Neutral - Zinc
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    850: '#1F1F23',
    900: '#18181B',
    950: '#09090B',
  },
} as const;

// ==================== Semantic Colors ====================

export const semanticColors = {
  // Revenue & Sales
  revenue: colors.primary[500],
  revenueLight: colors.primary[400],
  revenueDark: colors.primary[600],

  // Profit
  profit: colors.success[500],
  profitLight: colors.success[400],
  profitDark: colors.success[600],

  // Costs & Expenses
  costs: colors.danger[500],
  costsLight: colors.danger[400],
  costsDark: colors.danger[600],

  // Zakat
  zakat: colors.purple[500],
  zakatLight: colors.purple[400],
  zakatDark: colors.purple[600],

  // Inventory
  inventory: colors.cyan[500],
  inventoryLight: colors.cyan[400],
  inventoryDark: colors.cyan[600],

  // Customers
  customers: colors.warning[500],
  customersLight: colors.warning[400],
  customersDark: colors.warning[600],
} as const;

// ==================== Chart Color Palette ====================

export const chartColors = {
  // Main Series Colors (8 colors for pie charts, etc.)
  series: [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F43F5E', // Rose
    '#6366F1', // Indigo
  ],

  // Payment Method Colors
  payment: [
    '#3B82F6', // Blue - Cash
    '#10B981', // Green - Card
    '#8B5CF6', // Purple - Bank Transfer
    '#F59E0B', // Amber - CCP
    '#06B6D4', // Cyan - Baridimob
    '#EC4899', // Pink - Credit
    '#6366F1', // Indigo - Mixed
    '#F43F5E', // Rose - Other
  ],

  // Sale Type Colors
  saleType: [
    '#3B82F6', // Blue - Retail
    '#10B981', // Green - Wholesale
    '#8B5CF6', // Purple - Partial Wholesale
  ],

  // Gradient Pairs
  gradients: {
    revenue: ['#3B82F6', '#60A5FA'],
    profit: ['#10B981', '#34D399'],
    costs: ['#F43F5E', '#FB7185'],
    zakat: ['#8B5CF6', '#A78BFA'],
    inventory: ['#06B6D4', '#22D3EE'],
    customers: ['#F59E0B', '#FBBF24'],
  },

  // Comparison Colors
  comparison: {
    current: '#3B82F6',
    previous: '#94A3B8',
  },

  // Status Colors
  status: {
    positive: '#10B981',
    negative: '#F43F5E',
    neutral: '#71717A',
  },

  // Profit-related colors (array for charts)
  profit: [
    '#10B981', // Green
    '#34D399', // Light Green
    '#059669', // Dark Green
    '#6EE7B7', // Mint
    '#A7F3D0', // Pale Green
    '#D1FAE5', // Very Light Green
  ],

  // Inventory-related colors (array for charts)
  inventory: [
    '#06B6D4', // Cyan
    '#22D3EE', // Light Cyan
    '#0891B2', // Dark Cyan
    '#67E8F9', // Sky
    '#A5F3FC', // Pale Cyan
    '#CFFAFE', // Very Light Cyan
  ],

  // Capital-related colors (array for charts)
  capital: [
    '#6366F1', // Indigo
    '#818CF8', // Light Indigo
    '#4F46E5', // Dark Indigo
    '#A5B4FC', // Lavender
    '#C7D2FE', // Pale Indigo
    '#E0E7FF', // Very Light Indigo
  ],

  // Customer-related colors (array for charts)
  customer: [
    '#F59E0B', // Amber
    '#FBBF24', // Light Amber
    '#D97706', // Dark Amber
    '#FCD34D', // Yellow
    '#FDE68A', // Pale Amber
    '#FEF3C7', // Very Light Amber
  ],

  // Semantic single colors
  success: '#10B981',
  danger: '#F43F5E',
  warning: '#F59E0B',
  neutral: '#71717A',
  
  // Primary color for single series charts
  primary: '#3B82F6',
  
  // Purple for special charts
  purple: '#8B5CF6',
} as const;

// ==================== Dark Theme ====================

export const darkTheme = {
  // Backgrounds
  bg: {
    primary: '#09090B',     // Main background
    secondary: '#18181B',   // Cards background
    tertiary: '#27272A',    // Elevated elements
    hover: '#3F3F46',       // Hover state
    active: '#52525B',      // Active state
  },

  // Text
  text: {
    primary: '#FAFAFA',
    secondary: '#A1A1AA',
    muted: '#71717A',
    inverse: '#09090B',
  },

  // Borders
  border: {
    primary: '#27272A',
    secondary: '#3F3F46',
    focus: '#3B82F6',
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(59, 130, 246, 0.15)',
  },

  // Glass effect
  glass: {
    bg: 'rgba(24, 24, 27, 0.8)',
    border: 'rgba(63, 63, 70, 0.5)',
    blur: 'blur(12px)',
  },
} as const;

// ==================== Light Theme ====================

export const lightTheme = {
  // Backgrounds
  bg: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',
    tertiary: '#F4F4F5',
    hover: '#E4E4E7',
    active: '#D4D4D8',
  },

  // Text
  text: {
    primary: '#18181B',
    secondary: '#52525B',
    muted: '#71717A',
    inverse: '#FFFFFF',
  },

  // Borders
  border: {
    primary: '#E4E4E7',
    secondary: '#D4D4D8',
    focus: '#3B82F6',
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
    glow: '0 0 20px rgba(59, 130, 246, 0.1)',
  },

  // Glass effect
  glass: {
    bg: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(228, 228, 231, 0.5)',
    blur: 'blur(12px)',
  },
} as const;

// ==================== Spacing System ====================

export const spacing = {
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
} as const;

// ==================== Border Radius ====================

export const radius = {
  none: '0',
  sm: '0.25rem',    // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.625rem',   // 10px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem',  // 24px
  '4xl': '2rem',    // 32px
  full: '9999px',
} as const;

// ==================== Typography ====================

export const typography = {
  // Font Families
  fontFamily: {
    sans: '"Tajawal", "Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },

  // Font Sizes
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1' }],         // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
  },

  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ==================== Animation & Transitions ====================

export const animation = {
  // Durations
  duration: {
    fastest: '50ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '500ms',
  },

  // Easings
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  // Framer Motion Variants
  variants: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    slideIn: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    },
    stagger: {
      animate: {
        transition: {
          staggerChildren: 0.05,
        },
      },
    },
  },
} as const;

// ==================== Nivo Chart Theme ====================

export const nivoThemeDark = {
  background: 'transparent',
  text: {
    fontSize: 12,
    fill: colors.neutral[400],
    fontFamily: typography.fontFamily.sans,
  },
  axis: {
    domain: {
      line: {
        stroke: colors.neutral[700],
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fontSize: 12,
        fill: colors.neutral[400],
        fontFamily: typography.fontFamily.sans,
      },
    },
    ticks: {
      line: {
        stroke: colors.neutral[700],
        strokeWidth: 1,
      },
      text: {
        fontSize: 11,
        fill: colors.neutral[500],
        fontFamily: typography.fontFamily.sans,
      },
    },
  },
  grid: {
    line: {
      stroke: colors.neutral[800],
      strokeWidth: 1,
      strokeDasharray: '4 4',
    },
  },
  legends: {
    title: {
      text: {
        fontSize: 12,
        fill: colors.neutral[400],
        fontFamily: typography.fontFamily.sans,
      },
    },
    text: {
      fontSize: 11,
      fill: colors.neutral[400],
      fontFamily: typography.fontFamily.sans,
    },
    ticks: {
      line: {},
      text: {
        fontSize: 10,
        fill: colors.neutral[500],
        fontFamily: typography.fontFamily.sans,
      },
    },
  },
  annotations: {
    text: {
      fontSize: 12,
      fill: colors.neutral[300],
      fontFamily: typography.fontFamily.sans,
    },
    link: {
      stroke: colors.neutral[500],
      strokeWidth: 1,
    },
    outline: {
      stroke: colors.neutral[600],
      strokeWidth: 2,
    },
    symbol: {
      fill: colors.neutral[400],
    },
  },
  tooltip: {
    container: {
      background: colors.neutral[850],
      color: colors.neutral[100],
      fontSize: 12,
      borderRadius: 8,
      boxShadow: darkTheme.shadow.lg,
      padding: '12px 16px',
      fontFamily: typography.fontFamily.sans,
      border: `1px solid ${colors.neutral[700]}`,
    },
  },
  crosshair: {
    line: {
      stroke: colors.neutral[500],
      strokeWidth: 1,
      strokeOpacity: 0.5,
      strokeDasharray: '6 6',
    },
  },
};

export const nivoThemeLight = {
  ...nivoThemeDark,
  text: {
    ...nivoThemeDark.text,
    fill: colors.neutral[600],
  },
  axis: {
    ...nivoThemeDark.axis,
    domain: {
      line: {
        stroke: colors.neutral[300],
        strokeWidth: 1,
      },
    },
    ticks: {
      line: {
        stroke: colors.neutral[300],
        strokeWidth: 1,
      },
      text: {
        fontSize: 11,
        fill: colors.neutral[500],
        fontFamily: typography.fontFamily.sans,
      },
    },
  },
  grid: {
    line: {
      stroke: colors.neutral[200],
      strokeWidth: 1,
      strokeDasharray: '4 4',
    },
  },
  tooltip: {
    container: {
      background: colors.neutral[0],
      color: colors.neutral[900],
      fontSize: 12,
      borderRadius: 8,
      boxShadow: lightTheme.shadow.lg,
      padding: '12px 16px',
      fontFamily: typography.fontFamily.sans,
      border: `1px solid ${colors.neutral[200]}`,
    },
  },
};

// ==================== CSS Variables Generator ====================

export function generateCSSVariables(isDark: boolean = true): Record<string, string> {
  const theme = isDark ? darkTheme : lightTheme;

  return {
    '--analytics-bg-primary': theme.bg.primary,
    '--analytics-bg-secondary': theme.bg.secondary,
    '--analytics-bg-tertiary': theme.bg.tertiary,
    '--analytics-bg-hover': theme.bg.hover,
    '--analytics-text-primary': theme.text.primary,
    '--analytics-text-secondary': theme.text.secondary,
    '--analytics-text-muted': theme.text.muted,
    '--analytics-border-primary': theme.border.primary,
    '--analytics-border-secondary': theme.border.secondary,
    '--analytics-shadow-sm': theme.shadow.sm,
    '--analytics-shadow-md': theme.shadow.md,
    '--analytics-shadow-lg': theme.shadow.lg,
    '--analytics-color-revenue': semanticColors.revenue,
    '--analytics-color-profit': semanticColors.profit,
    '--analytics-color-costs': semanticColors.costs,
    '--analytics-color-zakat': semanticColors.zakat,
  };
}

// ==================== Utility Functions ====================

export function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? colors.neutral[900] : colors.neutral[50];
}

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
