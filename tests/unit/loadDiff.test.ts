import { describe, expect, test } from 'bun:test';
import { loadFileDiff } from '../../src/application/loadDiff';
import type { WorkingCopyChange } from '../../src/domain/change';
import type { DiffResult } from '../../src/domain/diff';

function change(path: string, status: WorkingCopyChange['status']): WorkingCopyChange {
  return { path, absolutePath: `/tmp/wc/${path}`, status };
}

describe('loadFileDiff', () => {
  test('unversioned 不调用 svn diff', async () => {
    let calls = 0;
    const result = await loadFileDiff({
      change: change('scratch.txt', 'unversioned'),
      rootPath: '/tmp/wc',
      svn: {
        async getDiff() {
          calls += 1;
          return { kind: 'text', patch: 'nope' };
        },
      },
    });
    expect(result).toEqual({ kind: 'unversioned' });
    expect(calls).toBe(0);
  });

  test('modified 走 Client 并返回 text', async () => {
    const patch = 'diff --git a/a.ts b/a.ts\n';
    const result = await loadFileDiff({
      change: change('a.ts', 'modified'),
      rootPath: '/tmp/wc',
      svn: {
        async getDiff(rootPath, path) {
          expect(rootPath).toBe('/tmp/wc');
          expect(path).toBe('a.ts');
          return { kind: 'text', patch };
        },
      },
    });
    expect(result).toEqual({ kind: 'text', patch });
  });

  test('后发起的请求结果才能留下，旧结果丢弃', async () => {
    const seen: DiffResult[] = [];
    let resolveSlow: (value: DiffResult) => void = () => {};
    const slow = new Promise<DiffResult>((resolve) => {
      resolveSlow = resolve;
    });

    const first = loadFileDiff({
      change: change('slow.ts', 'modified'),
      rootPath: '/tmp/wc',
      svn: {
        getDiff: () => slow,
      },
    });
    const second = loadFileDiff({
      change: change('fast.ts', 'modified'),
      rootPath: '/tmp/wc',
      svn: {
        async getDiff() {
          return { kind: 'text', patch: 'fast' };
        },
      },
    });

    let requestId = 0;
    const apply = async (id: number, pending: Promise<DiffResult>) => {
      const result = await pending;
      if (id !== requestId) return;
      seen.push(result);
    };

    requestId = 1;
    const keepFirst = apply(1, first);
    requestId = 2;
    await apply(2, second);
    resolveSlow({ kind: 'text', patch: 'slow' });
    await keepFirst;

    expect(seen).toEqual([{ kind: 'text', patch: 'fast' }]);
  });
});
