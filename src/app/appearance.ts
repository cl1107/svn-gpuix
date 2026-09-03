import type { CommandRunner } from '../services/svn/commandRunner';
import { type ThemeMode, type ThemePreference } from './theme';

export type AppearancePreference = ThemePreference;
export type ResolvedAppearance = ThemeMode;

export { resolveAppearance } from './theme';

export interface SystemAppearanceService {
  get(): Promise<ResolvedAppearance>;
  /**
   * Observe future appearance changes. Call get() first when the current value
   * is needed immediately.
   */
  subscribe(onChange: (mode: ResolvedAppearance) => void): () => void;
}

export function parseAppearancePreference(value: unknown): AppearancePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

export async function readSystemAppearance(runner: CommandRunner): Promise<ResolvedAppearance> {
  try {
    const result = await runner.run({ argv: ['defaults', 'read', '-g', 'AppleInterfaceStyle'] });
    return result.stdout.trim() === 'Dark' ? 'dark' : 'light';
  } catch {
    // Light mode omits AppleInterfaceStyle (nonzero). Missing defaults also falls back to light.
    return 'light';
  }
}

/**
 * GPUIX 0.7 has no system-appearance event. Keep the macOS polling fallback
 * behind this service so a future native event source can replace it without
 * changing React state management.
 */
export function createMacOSSystemAppearanceService(
  runner: CommandRunner,
  intervalMs = 2000,
): SystemAppearanceService {
  return {
    get: () => readSystemAppearance(runner),
    subscribe(onChange) {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const poll = async () => {
        const mode = await readSystemAppearance(runner);
        if (cancelled) return;
        onChange(mode);
        timer = setTimeout(() => void poll(), intervalMs);
      };

      timer = setTimeout(() => void poll(), intervalMs);

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    },
  };
}
