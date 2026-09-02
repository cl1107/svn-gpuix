import { describe, expect, test } from 'bun:test';
import { refreshWorkingCopy } from '../../src/application/refreshRepository';
import type { WorkingCopyChange } from '../../src/domain/change';
import type { Repository } from '../../src/domain/repository';

const repo: Repository = {
  rootPath: '/tmp/wc',
  repositoryUrl: 'file:///repo',
  repositoryRoot: 'file:///repo',
  revision: 9,
};

function change(path: string, status: WorkingCopyChange['status']): WorkingCopyChange {
  return { path, absolutePath: `/tmp/wc/${path}`, status };
}

describe('refreshWorkingCopy', () => {
  test('并行拉 info + status，并 reconcile checkbox / 选中项', async () => {
    const result = await refreshWorkingCopy({
      rootPath: repo.rootPath,
      previousChecked: new Set(['old.ts']),
      previousPaths: new Set(['old.ts', 'gone.ts']),
      previousSelected: 'gone.ts',
      svn: {
        async validateWorkingCopy() {
          return { ...repo, revision: 10 };
        },
        async getStatus() {
          return [
            change('vendor', 'external'),
            change('old.ts', 'modified'),
            change('new.ts', 'added'),
            change('scratch.txt', 'unversioned'),
          ];
        },
      },
    });

    expect(result.repository.revision).toBe(10);
    expect(result.changes.map((item) => item.path)).toEqual(['new.ts', 'old.ts', 'scratch.txt']);
    expect(result.checkedPaths.has('old.ts')).toBe(true);
    expect(result.checkedPaths.has('new.ts')).toBe(true);
    expect(result.checkedPaths.has('scratch.txt')).toBe(false);
    expect(result.selectedPath).toBe('new.ts');
  });

  test('forceChecked 会勾上刚 add 的路径', async () => {
    const result = await refreshWorkingCopy({
      rootPath: repo.rootPath,
      previousChecked: new Set(),
      previousPaths: new Set(['scratch.txt']),
      previousSelected: 'scratch.txt',
      forceChecked: new Set(['scratch.txt']),
      svn: {
        async validateWorkingCopy() {
          return repo;
        },
        async getStatus() {
          return [change('scratch.txt', 'added')];
        },
      },
    });
    expect(result.checkedPaths.has('scratch.txt')).toBe(true);
  });
});
