import { describe, expect, test } from 'bun:test';
import {
  defaultChecked,
  finderRevealTarget,
  isAddable,
  isCommittable,
  isDeletable,
  isRevertable,
  needsForceDelete,
  parentAbsolutePath,
  reconcileCheckedPaths,
  reconcileSelectedPath,
  sortChanges,
  type WorkingCopyChange,
} from '../../src/domain/change';

function change(path: string, status: WorkingCopyChange['status']): WorkingCopyChange {
  return { path, absolutePath: `/wc/${path}`, status };
}

describe('checkbox 默认规则', () => {
  test('modified/added/deleted/replaced 默认勾选，其余不勾', () => {
    expect(defaultChecked('modified')).toBe(true);
    expect(defaultChecked('added')).toBe(true);
    expect(defaultChecked('deleted')).toBe(true);
    expect(defaultChecked('replaced')).toBe(true);
    expect(defaultChecked('unversioned')).toBe(false);
    expect(defaultChecked('missing')).toBe(false);
    expect(defaultChecked('conflicted')).toBe(false);
  });
});

describe('refresh reconcile', () => {
  test('首次加载按默认规则勾选', () => {
    const changes = [change('a.ts', 'modified'), change('b.txt', 'unversioned')];
    const checked = reconcileCheckedPaths({
      changes,
      previousChecked: new Set(),
      previousPaths: new Set(),
    });
    expect([...checked]).toEqual(['a.ts']);
  });

  test('已有路径保留用户勾选，新路径走默认值', () => {
    const changes = [
      change('a.ts', 'modified'),
      change('b.txt', 'unversioned'),
      change('c.ts', 'added'),
    ];
    const checked = reconcileCheckedPaths({
      changes,
      previousChecked: new Set(),
      previousPaths: new Set(['a.ts', 'b.txt']),
    });
    expect(checked.has('a.ts')).toBe(false);
    expect(checked.has('b.txt')).toBe(false);
    expect(checked.has('c.ts')).toBe(true);
  });

  test('选中文件消失后回退到第一项', () => {
    const changes = [change('keep.ts', 'modified')];
    expect(reconcileSelectedPath(changes, 'gone.ts')).toBe('keep.ts');
    expect(reconcileSelectedPath(changes, 'keep.ts')).toBe('keep.ts');
    expect(reconcileSelectedPath([], 'gone.ts')).toBeNull();
  });
});

describe('mutation 资格', () => {
  test('committable / addable / revertable / deletable', () => {
    expect(isCommittable(change('a.ts', 'modified'))).toBe(true);
    expect(isCommittable(change('a.ts', 'unversioned'))).toBe(false);
    expect(isAddable(change('a.ts', 'unversioned'))).toBe(true);
    expect(isRevertable(change('a.ts', 'modified'))).toBe(true);
    expect(isRevertable({ ...change('src', 'modified'), nodeKind: 'dir' })).toBe(false);
    expect(isDeletable(change('a.ts', 'modified'))).toBe(true);
    expect(isDeletable(change('a.ts', 'unversioned'))).toBe(false);
    expect(needsForceDelete(change('gone.ts', 'missing'))).toBe(true);
  });
});

describe('finderRevealTarget', () => {
  test('普通文件用绝对路径，deleted/missing 用父目录', () => {
    expect(finderRevealTarget(change('src/a.ts', 'modified'))).toBe('/wc/src/a.ts');
    expect(finderRevealTarget(change('src/gone.ts', 'deleted'))).toBe('/wc/src');
    expect(finderRevealTarget(change('missing.txt', 'missing'))).toBe('/wc');
    expect(parentAbsolutePath('/tmp/demo-wc/src/a.ts')).toBe('/tmp/demo-wc/src');
    expect(parentAbsolutePath('/tmp')).toBe('/');
  });
});

describe('sortChanges', () => {
  test('先按目录再按文件名', () => {
    const sorted = sortChanges([
      change('src/b.ts', 'modified'),
      change('README.md', 'modified'),
      change('src/a.ts', 'added'),
    ]);
    expect(sorted.map((item) => item.path)).toEqual(['README.md', 'src/a.ts', 'src/b.ts']);
  });
});
