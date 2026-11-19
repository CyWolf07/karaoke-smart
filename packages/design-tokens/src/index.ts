/** Tokens de diseño compartidos (web + móvil). Modo oscuro como diseño principal. */
export const colors = {
  background: '#0a0a0b',
  surface: '#141416',
  surfaceRaised: '#1d1d21',
  border: '#2a2a30',
  text: '#f5f5f7',
  textMuted: '#9a9aa3',
  primary: '#1ed760',
  primaryText: '#04110a',
  danger: '#ff4d5e',
  warning: '#ffb020',
} as const;

export const radii = { sm: 6, md: 12, lg: 20, full: 9999 } as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;
export const fontFamily = { sans: 'Inter, system-ui, sans-serif' } as const;
