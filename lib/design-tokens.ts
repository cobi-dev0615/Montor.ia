/**
 * Design Tokens for Mentor.ai
 * Based on design system requirements
 */

export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
  },
  mentor: {
    clarity: '#3b82f6',
    wisdom: '#8b5cf6',
    empathy: '#ec4899',
    purpose: '#f59e0b',
    virtue: '#10b981',
  },
  neutral: {
    background: '#f9fafb',
    card: '#ffffff',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
  },
  status: {
    error: {
      background: '#fee2e2',
      text: '#dc2626',
    },
    success: {
      background: '#d1fae5',
      text: '#10b981',
    },
    warning: {
      background: '#fef3c7',
      text: '#f59e0b',
    },
  },
} as const

export const typography = {
  fontFamily: {
    sans: ['Inter', 'sans-serif'],
    serif: ['Merriweather', 'serif'],
  },
  fontSize: {
    '3xl': '30px',
    '2xl': '24px',
    xl: '20px',
    lg: '18px',
    base: '16px',
    sm: '14px',
    xs: '12px',
  },
  lineHeight: {
    body: 1.6,
    heading: 1.2,
  },
} as const

export const spacing = {
  base: 4,
  scale: [4, 8, 12, 16, 24, 32, 48, 64],
} as const

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
} as const

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
} as const

export const transitions = {
  default: '200ms ease-in-out',
  smooth: '300ms ease-in-out',
} as const

export const breakpoints = {
  mobile: '375px',
  tablet: '768px',
  desktop: '1280px',
} as const
