import { colors } from '@ks/design-tokens';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        surface: colors.surface,
        'surface-raised': colors.surfaceRaised,
        border: colors.border,
        foreground: colors.text,
        muted: colors.textMuted,
        primary: { DEFAULT: colors.primary, foreground: colors.primaryText },
        danger: colors.danger,
        warning: colors.warning,
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { lg: '20px', md: '12px', sm: '6px' },
    },
  },
  plugins: [],
};
