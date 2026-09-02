/** 浅色以 Figma 稿为准；深色是独立 palette，不是旧 Spec Dark 草案。 */

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

export type ThemeTokens = {
  bg: string;
  sidebar: string;
  panel: string;
  panelHover: string;
  overlay: string;
  overlayScrim: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentBadge: string;
  accentText: string;
  danger: string;
  dangerBg: string;
  warning: string;
  success: string;
  added: string;
  addedBg: string;
  deleted: string;
  deletedBg: string;
  modified: string;
  modifiedBg: string;
  unversioned: string;
  unversionedBg: string;
  replaced: string;
  replacedBg: string;
  conflicted: string;
  conflictedBg: string;
};

export const lightTheme: ThemeTokens = {
  bg: '#F8F9FB',
  sidebar: '#F1F4F7',
  panel: '#FFFFFF',
  panelHover: '#F8F9FB',
  overlay: '#E8F0FF',
  overlayScrim: 'rgba(23, 28, 41, 0.28)',
  border: '#DFE4EC',
  text: '#171C29',
  textMuted: '#667085',
  textSubtle: '#949EB0',
  accent: '#3363F2',
  accentHover: '#2554E0',
  accentSoft: '#E8F0FF',
  accentBadge: '#D9E5FF',
  accentText: '#FFFFFF',
  danger: '#D13845',
  dangerBg: '#FEF2F2',
  warning: '#D4781F',
  success: '#24945C',
  added: '#24945C',
  addedBg: '#E8FAF0',
  deleted: '#D13845',
  deletedBg: '#FFEDF0',
  modified: '#D4781F',
  modifiedBg: '#FFF5E5',
  unversioned: '#667085',
  unversionedBg: '#EEF1F5',
  replaced: '#7C3AED',
  replacedBg: '#F3E8FF',
  conflicted: '#D13845',
  conflictedBg: '#FFEDF0',
};

export const darkTheme: ThemeTokens = {
  bg: '#12151C',
  sidebar: '#161A22',
  panel: '#1C212B',
  panelHover: '#242A36',
  overlay: '#1A2744',
  overlayScrim: 'rgba(0, 0, 0, 0.48)',
  border: '#2E3644',
  text: '#E8ECF2',
  textMuted: '#9AA3B2',
  textSubtle: '#6E7787',
  accent: '#5B82F6',
  accentHover: '#7A9AFF',
  accentSoft: '#1E2A4A',
  accentBadge: '#243868',
  accentText: '#FFFFFF',
  danger: '#E85A64',
  dangerBg: '#3A1D22',
  warning: '#E09A3A',
  success: '#3DCE7A',
  added: '#3DCE7A',
  addedBg: '#16301F',
  deleted: '#E85A64',
  deletedBg: '#3A1D22',
  modified: '#E09A3A',
  modifiedBg: '#332414',
  unversioned: '#9AA3B2',
  unversionedBg: '#252A33',
  replaced: '#A78BFA',
  replacedBg: '#2A1F3D',
  conflicted: '#E85A64',
  conflictedBg: '#3A1D22',
};

export const palettes: Record<ThemeMode, ThemeTokens> = {
  light: lightTheme,
  dark: darkTheme,
};

export function resolveAppearance(preference: ThemePreference, system: ThemeMode): ThemeMode {
  return preference === 'system' ? system : preference;
}

export function tokensFor(mode: ThemeMode): ThemeTokens {
  return palettes[mode];
}

/** Preview / 未接 Provider 时的浅色默认。live UI 必须用解析后的 token。 */
export const theme: ThemeTokens = lightTheme;

export const font = {
  ui: 'SF Pro Text',
  mono: 'SF Mono',
} as const;

export const layout = {
  windowWidth: 1440,
  windowHeight: 960,
  titlebarHeight: 44,
  trafficLightInset: 78,
  sidebarWidth: 238,
  changesWidth: 396,
  historyListWidth: 454,
  fileRowHeight: 58,
} as const;
