import type { CommandRunner } from '../services/svn/commandRunner';
import { type ThemeMode, type ThemePreference } from './theme';

export type AppearancePreference = ThemePreference;
export type ResolvedAppearance = ThemeMode;

export { resolveAppearance } from './theme';

export function parseAppearancePreference(value: unknown): AppearancePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

export async function readSystemAppearance(runner: CommandRunner): Promise<ResolvedAppearance> {
  try {
    const result = await runner.run({ argv: ['defaults', 'read', '-g', 'AppleInterfaceStyle'] });
    return result.stdout.trim() === 'Dark' ? 'dark' : 'light';
  } catch {
    // Light mode omits AppleInterfaceStyle (nonzero). Missing binary also → light.
    return 'light';
  }
}

export function subscribeSystemAppearance(
  runner: CommandRunner,
  onChange: (mode: ResolvedAppearance) => void,
  intervalMs = 2000,
): () => void {
  let cancelled = false;
  const tick = async () => {
    const mode = await readSystemAppearance(runner);
    if (!cancelled) onChange(mode);
  };
  void tick();
  const id = setInterval(() => void tick(), intervalMs);
  return () => {
    cancelled = true;
    clearInterval(id);
  };
}
