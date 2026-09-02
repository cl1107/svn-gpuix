/** 浅色 token 以 Figma 浅色稿为准。深色是独立 palette，key 必须成对。 */

export type ThemeMode = 'light' | 'dark';

export const lightTheme = {
  bg: '#F8F9FB',
  sidebar: '#F1F4F7',
  panel: '#FFFFFF',
  panelHover: '#F8F9FB',
  overlay: '#E8F0FF',
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
} as const;

/** 占位深色稿，视觉可整表替换，勿改 key。 */
export const darkTheme = {
  bg: '#16181D',
  sidebar: '#12141A',
  panel: '#1C1F26',
  panelHover: '#22262E',
  overlay: '#1E2A44',
  border: '#2C313C',
  text: '#E8ECF2',
  textMuted: '#9AA3B2',
  textSubtle: '#6B7380',
  accent: '#5B8CFF',
  accentHover: '#7AA0FF',
  accentSoft: '#1E2A44',
  accentBadge: '#243056',
  accentText: '#FFFFFF',
  danger: '#F07178',
  warning: '#E0A15A',
  success: '#4FBF82',
  added: '#4FBF82',
  addedBg: '#143024',
  deleted: '#F07178',
  deletedBg: '#3A1A1E',
  modified: '#E0A15A',
  modifiedBg: '#3A2A14',
  unversioned: '#9AA3B2',
  unversionedBg: '#22262E',
  replaced: '#B794F4',
  replacedBg: '#2A1F3D',
  conflicted: '#F07178',
  conflictedBg: '#3A1A1E',
} as const;

export type ThemeTokens = { readonly [K in keyof typeof lightTheme]: string };

export const palettes: Record<ThemeMode, ThemeTokens> = {
  light: lightTheme,
  dark: darkTheme,
};

export function resolveTheme(mode: ThemeMode): ThemeTokens {
  return palettes[mode];
}

/** @deprecated 用 useTheme()；无 Provider 时回退浅色以免测试炸。 */
export const theme = lightTheme;

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
