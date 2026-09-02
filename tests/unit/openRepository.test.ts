import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openRepository } from '../../src/application/openRepository';
import { CommandError } from '../../src/services/svn/commandRunner';
import { SettingsRepository } from '../../src/services/settings/settingsRepository';
import type { Repository } from '../../src/domain/repository';

function repo(path: string): Repository {
  return {
    rootPath: path,
    repositoryUrl: 'file:///repo',
    repositoryRoot: 'file:///repo',
    revision: 4,
  };
}

describe('openRepository', () => {
  test('合法 working copy 写入 Recent 并返回 Repository', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-open-ok-'));
    const settings = new SettingsRepository(join(dir, 'settings.json'));
    const wc = join(dir, 'wc');
    await mkdir(wc);

    const result = await openRepository({
      path: wc,
      settings,
      svn: {
        async validateWorkingCopy(path) {
          expect(path).toBe(wc);
          return repo(path);
        },
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.repository.rootPath).toBe(wc);
      expect(result.recents[0]?.path).toBe(wc);
    }
  });

  test('非法目录报 not-working-copy 且不写入 Recent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-open-bad-'));
    const settings = new SettingsRepository(join(dir, 'settings.json'));
    const folder = join(dir, 'not-wc');
    await mkdir(folder);

    const result = await openRepository({
      path: folder,
      settings,
      svn: {
        async validateWorkingCopy() {
          throw new CommandError({
            command: ['svn', 'info', '--xml', '.'],
            cwd: folder,
            exitCode: 1,
            stdout: '',
            stderr: "svn: E155007: '/tmp/x' is not a working copy\n",
          });
        },
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('not-working-copy');
      expect(result.error.title).toBe('This folder is not an SVN working copy.');
    }
    expect(result.recents).toEqual([]);
  });

  test('缺失路径不进入仓库', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-open-missing-'));
    const settings = new SettingsRepository(join(dir, 'settings.json'));
    const result = await openRepository({
      path: join(dir, 'gone'),
      settings,
      svn: {
        async validateWorkingCopy() {
          throw new Error('should not call svn');
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('not-working-copy');
  });
});
