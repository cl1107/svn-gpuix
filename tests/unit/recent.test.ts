import { describe, expect, test } from 'bun:test';
import { upsertRecent } from '../../src/domain/repository';
import { displayPath, toRecentItem } from '../../src/features/welcome/recentItems';

describe('upsertRecent', () => {
  test('新路径插到最前，最多 10 条', () => {
    const seed = Array.from({ length: 10 }, (_, index) => ({
      path: `/wc/${index}`,
      lastOpenedAt: index,
    }));
    const next = upsertRecent(seed, '/wc/new', 100);
    expect(next).toHaveLength(10);
    expect(next[0]).toEqual({ path: '/wc/new', lastOpenedAt: 100 });
    expect(next.map((item) => item.path)).not.toContain('/wc/9');
  });

  test('已存在的路径移到最前且不重复', () => {
    const next = upsertRecent(
      [
        { path: '/a', lastOpenedAt: 1 },
        { path: '/b', lastOpenedAt: 2 },
      ],
      '/b',
      9,
    );
    expect(next).toEqual([
      { path: '/b', lastOpenedAt: 9 },
      { path: '/a', lastOpenedAt: 1 },
    ]);
  });
});

describe('toRecentItem', () => {
  test('把家目录替换成 ~，失效路径标记 Missing', () => {
    const visible = toRecentItem(
      { path: '/Users/dev/work/app', lastOpenedAt: 1 },
      true,
      '/Users/dev',
    );
    expect(visible.path).toBe('~/work/app');
    expect(visible.name).toBe('app');
    expect(visible.statusTone).toBe('ok');

    const missing = toRecentItem(
      { path: '/Users/dev/gone', lastOpenedAt: 1 },
      false,
      '/Users/dev',
    );
    expect(missing.statusLabel).toBe('Missing');
    expect(missing.statusTone).toBe('missing');
  });

  test('displayPath 处理家目录本身', () => {
    expect(displayPath('/Users/dev', '/Users/dev')).toBe('~');
  });
});
