/**
 * Brand tokens shared by every screen. Colours mirror the web app so the
 * mobile experience feels like the same product.
 */

export type ColorSchemeName = 'light' | 'dark';

export type Palette = {
  background: string;
  surface: string;
  card: string;
  cardMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  gold: string;
  lime: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
};

const light: Palette = {
  background: '#F7F3EC',
  surface: '#FFFDF8',
  card: '#FFFFFF',
  cardMuted: '#F1EAE0',
  text: '#14231C',
  textMuted: '#6B7A72',
  border: '#E4DCCF',
  primary: '#145C43',
  primaryPressed: '#0F4632',
  primarySoft: '#E2EFE8',
  onPrimary: '#FFFFFF',
  accent: '#E8742A',
  accentSoft: '#FCE8D8',
  gold: '#E3B04B',
  lime: '#D7EFA9',
  success: '#1F7A4D',
  successSoft: '#E1F3E7',
  warning: '#A66A12',
  warningSoft: '#FBEFD3',
  danger: '#B23B3B',
  dangerSoft: '#FBE4E1',
  info: '#2B5F8A',
  infoSoft: '#E3EEF7',
};

const dark: Palette = {
  background: '#0E1713',
  surface: '#15221C',
  card: '#1A2A22',
  cardMuted: '#213329',
  text: '#F2F6F2',
  textMuted: '#9FB3A7',
  border: '#2C4136',
  primary: '#5FBF95',
  primaryPressed: '#4AA57E',
  primarySoft: '#1E3A2D',
  onPrimary: '#08130D',
  accent: '#F08A47',
  accentSoft: '#3A2718',
  gold: '#E3B04B',
  lime: '#D7EFA9',
  success: '#6FD39A',
  successSoft: '#19382A',
  warning: '#E7B65A',
  warningSoft: '#3A2E17',
  danger: '#F08C82',
  dangerSoft: '#3A201E',
  info: '#85B8DE',
  infoSoft: '#1A2C3A',
};

export const themes = { light, dark } as const;

export type Theme = Palette & {
  scheme: ColorSchemeName;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 34,
} as const;

export const createTheme = (scheme: ColorSchemeName = 'light'): Theme => ({
  ...themes[scheme],
  scheme,
  spacing,
  radius,
  fontSize,
});
