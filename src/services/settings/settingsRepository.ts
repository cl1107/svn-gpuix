import { mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { upsertRecent, type RecentWorkingCopy } from '../../domain/repository';

export interface Settings {
  version: 1;
  recentWorkingCopies: RecentWorkingCopy[];
  lastWorkingCopy?: string;
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
  constructor(private readonly filePath: string) {}

  async load(): Promise<Settings> {
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
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await Bun.write(tmpPath, `${JSON.stringify(settings, null, 2)}\n`);
    await rename(tmpPath, this.filePath);
  }

  async rememberWorkingCopy(path: string, lastOpenedAt = Date.now()): Promise<Settings> {
    const current = await this.load();
    const next: Settings = {
      ...current,
      lastWorkingCopy: path,
      recentWorkingCopies: upsertRecent(current.recentWorkingCopies, path, lastOpenedAt),
    };
    await this.save(next);
    return next;
  }
}
