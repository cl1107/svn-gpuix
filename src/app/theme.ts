/** 视觉 token 以 Figma 浅色稿为准，不是 Spec 里的 Dark 草案。 */
export const theme = {
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
