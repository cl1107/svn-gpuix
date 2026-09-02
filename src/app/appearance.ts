export type AppearancePreference = 'light' | 'dark' | 'system';
export type ResolvedAppearance = 'light' | 'dark';

export function parseAppearancePreference(value: unknown): AppearancePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

export function resolveAppearance(
  preference: AppearancePreference,
  system: ResolvedAppearance,
): ResolvedAppearance {
  return preference === 'system' ? system : preference;
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
    // GPUIX 0.7 has no appearance subscription; macOS defaults miss → light.
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
