import { resolveAppearance as resolveThemeAppearance, type ThemeMode, type ThemePreference } from './theme';

export type AppearancePreference = ThemePreference;
export type ResolvedAppearance = ThemeMode;

export { resolveAppearance } from './theme';

export function parseAppearancePreference(value: unknown): AppearancePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

export function resolvePreference(preference: AppearancePreference, system: ResolvedAppearance): ResolvedAppearance {
  return resolveThemeAppearance(preference, system);
}

export async function readSystemAppearance(): Promise<ResolvedAppearance> {
  try {
    const proc = Bun.spawn(['defaults', 'read', '-g', 'AppleInterfaceStyle'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ]);
    if (exitCode === 0 && stdout.trim() === 'Dark') return 'dark';
  } catch {
    // GPUIX 0.7 has no appearance event; missing AppleInterfaceStyle means light.
  }
  return 'light';
}

export function subscribeSystemAppearance(
  onChange: (mode: ResolvedAppearance) => void,
  intervalMs = 2000,
): () => void {
  let cancelled = false;
  const tick = async () => {
    const mode = await readSystemAppearance();
    if (!cancelled) onChange(mode);
  };
  void tick();
  const id = setInterval(() => void tick(), intervalMs);
  return () => {
    cancelled = true;
    clearInterval(id);
  };
}
