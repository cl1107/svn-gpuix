import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSettings, SettingsRepository } from '../../src/services/settings/settingsRepository';

describe('parseSettings', () => {
  test('损坏或未知版本回退到默认', () => {
    expect(parseSettings(null).recentWorkingCopies).toEqual([]);
    expect(parseSettings({ version: 2, recentWorkingCopies: [] }).recentWorkingCopies).toEqual([]);
    expect(parseSettings(null).appearance).toBe('system');
  });

  test('appearance 非法则 system，合法则保留', () => {
    expect(parseSettings({ version: 1, appearance: 'dark' }).appearance).toBe('dark');
    expect(parseSettings({ version: 1, appearance: 'nope' }).appearance).toBe('system');
  });
});

describe('SettingsRepository', () => {
  test('atomic write 后能读回 Recent，最多 10 条', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-settings-'));
    const filePath = join(dir, 'settings.json');
    const repo = new SettingsRepository(filePath);

    await repo.rememberWorkingCopy('/wc/a', 1);
    await repo.rememberWorkingCopy('/wc/b', 2);
    const saved = await repo.rememberWorkingCopy('/wc/a', 3);

    expect(saved.lastWorkingCopy).toBe('/wc/a');
    expect(saved.recentWorkingCopies.map((item) => item.path)).toEqual(['/wc/a', '/wc/b']);

    const disk = await readFile(filePath, 'utf8');
    expect(JSON.parse(disk).recentWorkingCopies[0].path).toBe('/wc/a');
    expect(await Bun.file(`${filePath}.tmp`).exists()).toBe(false);

    const loaded = await repo.load();
    expect(loaded).toEqual(saved);
  });
});

  test('setAppearance 持久化且不影响 recents', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-settings-'));
    const filePath = join(dir, 'settings.json');
    const repo = new SettingsRepository(filePath);
    await repo.rememberWorkingCopy('/wc/a', 1);
    const saved = await repo.setAppearance('dark');
    expect(saved.appearance).toBe('dark');
    expect(saved.recentWorkingCopies.map((item) => item.path)).toEqual(['/wc/a']);
    const loaded = await repo.load();
    expect(loaded.appearance).toBe('dark');
  });
