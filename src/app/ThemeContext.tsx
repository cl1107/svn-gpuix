import { createContext, useContext, type ReactNode } from 'react';
import type { AppearancePreference, ResolvedAppearance } from './appearance';
import { lightTheme, type ThemeTokens } from './theme';

const ThemeTokensContext = createContext<ThemeTokens | null>(null);

const AppearanceContext = createContext<{
  preference: AppearancePreference;
  resolved: ResolvedAppearance;
  setPreference: (next: AppearancePreference) => void;
} | null>(null);

export function ThemeProvider({
  tokens,
  preference,
  resolved,
  setPreference,
  children,
}: {
  tokens: ThemeTokens;
  preference: AppearancePreference;
  resolved: ResolvedAppearance;
  setPreference: (next: AppearancePreference) => void;
  children: ReactNode;
}) {
  return (
    <AppearanceContext.Provider value={{ preference, resolved, setPreference }}>
      <ThemeTokensContext.Provider value={tokens}>{children}</ThemeTokensContext.Provider>
    </AppearanceContext.Provider>
  );
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeTokensContext) ?? lightTheme;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) {
    throw new Error('useAppearance must be used within ThemeProvider');
  }
  return value;
}

export function useResolvedAppearance(): ResolvedAppearance {
  return useContext(AppearanceContext)?.resolved ?? 'light';
}
