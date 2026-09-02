import { describe, expect, test } from 'bun:test';
import { createRepositoryStore } from '../../src/store/repositoryStore';
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

function liveStore() {
  return createRepositoryStore({ repository: repo, page: 'changes', refreshing: true });
}

describe('createRepositoryStore', () => {
  test('live 初始为空 changes，两个 store 互不共享状态', () => {
    const a = liveStore();
    const b = liveStore();
    a.getState().togglePath('a.ts');
    expect(a.getState().checkedPaths.has('a.ts')).toBe(true);
    expect(b.getState().checkedPaths.has('a.ts')).toBe(false);
    expect(a.getState().changes).toEqual([]);
    expect(a.getState().refreshing).toBe(true);
  });

  test('togglePath 增删路径并每次替换 Set', () => {
    const store = liveStore();
    const first = store.getState().checkedPaths;
    store.getState().togglePath('a.ts');
    const second = store.getState().checkedPaths;
    expect(second).not.toBe(first);
    expect(second.has('a.ts')).toBe(true);
    store.getState().togglePath('a.ts');
    const third = store.getState().checkedPaths;
    expect(third).not.toBe(second);
    expect(third.has('a.ts')).toBe(false);
  });

  test('toggleAll 全选后再全不选', () => {
    const store = liveStore();
    store.getState().toggleAll(['a.ts', 'b.ts']);
    expect([...store.getState().checkedPaths].sort()).toEqual(['a.ts', 'b.ts']);
    const before = store.getState().checkedPaths;
    store.getState().toggleAll(['a.ts', 'b.ts']);
    expect(store.getState().checkedPaths).not.toBe(before);
    expect(store.getState().checkedPaths.size).toBe(0);
  });

  test('applyRefreshResult 写入仓库与勾选，并清掉 statusError', () => {
    const store = liveStore();
    store.getState().setStatusError({
      kind: 'command-failed',
      title: 'fail',
      message: 'fail',
    });
    const nextRepo = { ...repo, revision: 10 };
    const changes = [change('old.ts', 'modified'), change('new.ts', 'added')];
    store.getState().applyRefreshResult({
      repository: nextRepo,
      changes,
      checkedPaths: new Set(['old.ts']),
      selectedPath: 'new.ts',
    });
    const state = store.getState();
    expect(state.repository?.revision).toBe(10);
    expect(state.changes).toEqual(changes);
    expect(state.checkedPaths.has('old.ts')).toBe(true);
    expect(state.checkedPaths.has('new.ts')).toBe(false);
    expect(state.selectedPath).toBe('new.ts');
    expect(state.statusError).toBeNull();
  });

  test('resetWorkingCopy 切 working copy 时清空草稿、mutation 和 history', () => {
    const store = liveStore();
    store.getState().applyRefreshResult({
      repository: repo,
      changes: [change('a.ts', 'modified')],
      checkedPaths: new Set(['a.ts']),
      selectedPath: 'a.ts',
    });
    store.getState().applyHistory([{ revision: 3, message: 'hi', changedPaths: [] }]);
    store.getState().setCommitMessage('wip');
    expect(store.getState().tryBeginMutation('update')).toBe(true);
    store.getState().setStatusError({
      kind: 'unknown',
      title: 'x',
      message: 'x',
    });
    const next = { ...repo, rootPath: '/tmp/other', revision: 1 };
    store.getState().resetWorkingCopy(next);
    const state = store.getState();
    expect(state.repository).toEqual(next);
    expect(state.changes).toEqual([]);
    expect(state.checkedPaths.size).toBe(0);
    expect(state.selectedPath).toBeNull();
    expect(state.commitMessage).toBe('');
    expect(state.statusError).toBeNull();
    expect(state.history).toEqual([]);
    expect(state.selectedRevision).toBeNull();
    expect(state.historyError).toBeNull();
    expect(state.mutating).toBeNull();
    expect(state.mutationError).toBeNull();
    expect(state.operationLine).toBeNull();
  });

  test('tryBeginMutation 原子占位，第二次调用不能覆盖第一次', () => {
    const store = liveStore();
    expect(store.getState().tryBeginMutation('update')).toBe(true);
    expect(store.getState().mutating).toBe('update');
    expect(store.getState().tryBeginMutation('commit')).toBe(false);
    expect(store.getState().mutating).toBe('update');
    store.getState().endMutation();
    expect(store.getState().mutating).toBeNull();
  });

  test('tryBeginMutation 在 OperationManager 已 running 时拒绝，且不写 store', () => {
    const store = liveStore();
    expect(store.getState().tryBeginMutation('add', 'commit')).toBe(false);
    expect(store.getState().mutating).toBeNull();
  });

  test('commit 失败回滚 message 与 selection', () => {
    const store = liveStore();
    store.getState().setCommitMessage('Fix login');
    store.getState().toggleAll(['a.ts', 'b.ts']);
    expect(store.getState().tryBeginMutation('commit')).toBe(true);
    const previousMessage = 'Fix login';
    const previousChecked = new Set(store.getState().checkedPaths);
    store.getState().applyCommitSuccess();
    expect(store.getState().commitMessage).toBe('');
    expect(store.getState().checkedPaths.size).toBe(0);
    store.getState().restoreCommitDraft({ message: previousMessage, checkedPaths: previousChecked });
    store.getState().setMutationError({
      kind: 'command-failed',
      title: 'Commit failed',
      message: 'boom',
    });
    store.getState().endMutation();
    const state = store.getState();
    expect(state.commitMessage).toBe('Fix login');
    expect([...state.checkedPaths].sort()).toEqual(['a.ts', 'b.ts']);
    expect(state.mutating).toBeNull();
    expect(state.mutationError?.title).toBe('Commit failed');
  });

  test('preview 初始态由调用方注入，store 不依赖 fixtures', () => {
    const store = createRepositoryStore({
      page: 'history',
      changes: [change('preview.ts', 'modified')],
      checkedPaths: ['preview.ts'],
      selectedPath: 'preview.ts',
      commitMessage: 'preview message',
      history: [{ revision: 1, message: 'first', changedPaths: [] }],
      selectedRevision: 1,
    });
    expect(store.getState().page).toBe('history');
    expect(store.getState().changes[0]?.path).toBe('preview.ts');
    expect(store.getState().commitMessage).toBe('preview message');
    expect(store.getState().selectedRevision).toBe(1);
    expect(store.getState().refreshing).toBe(false);
  });
});
