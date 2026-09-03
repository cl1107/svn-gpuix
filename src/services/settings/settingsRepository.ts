import { mkdir, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { upsertRecent, type RecentWorkingCopy } from '../../domain/repository';
import { parseAppearancePreference, type AppearancePreference } from '../../app/appearance';

export interface Settings {
  version: 1;
  recentWorkingCopies: RecentWorkingCopy[];
  lastWorkingCopy?: string;
  appearance: AppearancePreference;
  window?: {
    width: number;
    height: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRecent(value: unknown): RecentWorkingCopy | null {
  if (!isRecord(value)) return null;
  if (typeof value.path !== 'string' || value.path.length === 0) return null;
  if (typeof value.lastOpenedAt !== 'number' || !Number.isFinite(value.lastOpenedAt)) return null;
  return { path: value.path, lastOpenedAt: value.lastOpenedAt };
}

export function defaultSettings(): Settings {
  return {
    version: 1,
    recentWorkingCopies: [],
    appearance: 'system',
  };
}

export function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw) || raw.version !== 1) return defaultSettings();

  const recents = Array.isArray(raw.recentWorkingCopies)
    ? raw.recentWorkingCopies.map(parseRecent).filter((item): item is RecentWorkingCopy => item !== null)
    : [];

  const settings: Settings = {
    version: 1,
    recentWorkingCopies: recents,
    appearance: parseAppearancePreference(raw.appearance),
  };

  if (typeof raw.lastWorkingCopy === 'string' && raw.lastWorkingCopy.length > 0) {
    settings.lastWorkingCopy = raw.lastWorkingCopy;
  }

  if (isRecord(raw.window)) {
    const width = raw.window.width;
    const height = raw.window.height;
    if (typeof width === 'number' && typeof height === 'number') {
      settings.window = { width, height };
    }
  }

  return settings;
}

export function defaultSettingsPath(): string {
  return join(homedir(), 'Library', 'Application Support', 'Revision', 'settings.json');
}

export class SettingsRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async load(): Promise<Settings> {
    await this.writeQueue;
    return this.readFromDisk();
  }

  private async readFromDisk(): Promise<Settings> {
    const file = Bun.file(this.filePath);
    if (!(await file.exists())) return defaultSettings();
    try {
      const raw: unknown = JSON.parse(await file.text());
      return parseSettings(raw);
    } catch {
      return defaultSettings();
    }
  }

  async save(settings: Settings): Promise<void> {
    await this.enqueueWrite(() => this.writeAtomic(settings));
  }

  private async writeAtomic(settings: Settings): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await Bun.write(tmpPath, `${JSON.stringify(settings, null, 2)}\n`);
      await rename(tmpPath, this.filePath);
    } catch (error) {
      await unlink(tmpPath).catch(() => {});
      throw error;
    }
  }

  private enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(operation);
    this.writeQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private mutate(mutator: (current: Settings) => Settings): Promise<Settings> {
    return this.enqueueWrite(async () => {
      const current = await this.readFromDisk();
      const next = mutator(current);
      await this.writeAtomic(next);
      return next;
    });
  }

  rememberWorkingCopy(path: string, lastOpenedAt = Date.now()): Promise<Settings> {
    return this.mutate((current) => ({
      ...current,
      lastWorkingCopy: path,
      recentWorkingCopies: upsertRecent(current.recentWorkingCopies, path, lastOpenedAt),
    }));
  }

  setAppearance(appearance: AppearancePreference): Promise<Settings> {
    return this.mutate((current) => ({ ...current, appearance }));
  }
}
