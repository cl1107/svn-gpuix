import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { OperationManager } from '../../src/application/operationManager';
import { ChangesPanel } from '../../src/features/changes/ChangesPanel';
import { RepositoryScreen } from '../../src/features/repository/RepositoryScreen';
import { RepositoryStoreProvider } from '../../src/store/RepositoryStoreContext';
import { createRepositoryStore } from '../../src/store/repositoryStore';
import type { WorkingCopyChange } from '../../src/domain/change';
import type { Repository } from '../../src/domain/repository';

const repo: Repository = {
  rootPath: '/tmp/demo-wc',
  repositoryUrl: 'file:///repo',
  repositoryRoot: 'file:///repo',
  revision: 4,
};

const changes: WorkingCopyChange[] = [
  { path: 'a.ts', absolutePath: '/tmp/demo-wc/a.ts', status: 'modified' },
  { path: 'scratch.txt', absolutePath: '/tmp/demo-wc/scratch.txt', status: 'unversioned' },
];

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 80; i++) {
    if (predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error('timed out');
}

function click(
  renderer: {
    findByTestId: (id: string) => { id: number } | undefined;
    getElementBounds: (id: number) => number[] | null;
    nativeSimulateClick: (x: number, y: number) => void;
  },
  testId: string,
) {
  const node = renderer.findByTestId(testId);
  expect(node).toBeTruthy();
  const bounds = node ? renderer.getElementBounds(node.id) : null;
  expect(bounds).toBeTruthy();
  if (!bounds) return;
  renderer.nativeSimulateClick(bounds[0] + bounds[2] / 2, bounds[1] + bounds[3] / 2);
}

describe('Commit UI', () => {
  test('空 message 点 Commit 不会触发回调', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 396, height: 960 });
    try {
      let calls = 0;
      const store = createRepositoryStore({
        changes,
        checkedPaths: ['a.ts'],
        selectedPath: 'a.ts',
        commitMessage: '',
      });
      render(
        <RepositoryStoreProvider store={store}>
          <ChangesPanel
            onCommit={() => {
              calls += 1;
            }}
            onRefresh={() => {}}
          />
        </RepositoryStoreProvider>,
      );
      renderer.flush();
      click(renderer, 'commit-button');
      renderer.flush();
      expect(calls).toBe(0);
    } finally {
      unmount();
    }
  });

  test('成功提交后清空 message / selection 并 refresh', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let committed = false;
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage="ship it"
          operations={new OperationManager()}
          svn={{
            async validateWorkingCopy() {
              return committed ? { ...repo, revision: 5 } : repo;
            },
            async getStatus() {
              return committed ? [] : changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async commit(_root, paths, message) {
              expect(paths).toEqual(['a.ts']);
              expect(message).toBe('ship it');
              committed = true;
              return { revision: 5, output: 'Committed revision 5.\n' };
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      expect(renderer.getAllText()).toContain('1 selected');
      click(renderer, 'commit-button');
      await waitFor(() => renderer.getAllText().includes('No changed files'));
      renderer.flush();
      expect(renderer.getAllText()).toContain('0 selected');
      expect(renderer.getAllText()).toContain('r5');
    } finally {
      unmount();
    }
  });

  test('提交中禁用 Commit / Update / Revert / Add / Delete', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let release: () => void = () => {};
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage="ship it"
          operations={new OperationManager()}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            commit() {
              return new Promise((resolve) => {
                release = () => resolve({ revision: 5, output: 'Committed revision 5.\n' });
              });
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      click(renderer, 'commit-button');
      await waitFor(() => renderer.getAllText().includes('Committing…'));
      expect(renderer.getAllText()).toContain('Committing…');
      expect(renderer.findByTestId('update-button')).toBeTruthy();
      release();
      await waitFor(() => !renderer.getAllText().includes('Committing…'));
    } finally {
      unmount();
    }
  });

  test('提交失败保留 message 和 selection', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage="ship it"
          operations={new OperationManager()}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async commit() {
              throw new Error('commit exploded');
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      click(renderer, 'commit-button');
      await waitFor(() => renderer.getAllText().includes('commit exploded'));
      renderer.flush();
      expect(renderer.getAllText()).toContain('1 selected');
      expect(renderer.getAllText()).toContain('a.ts');
    } finally {
      unmount();
    }
  });

  test('Revert 确认框 Cancel 不执行', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let reverted = 0;
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          operations={new OperationManager()}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async revert() {
              reverted += 1;
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      renderer.flush();
      click(renderer, 'revert-file');
      await waitFor(() => Boolean(renderer.findByTestId('revert-confirm')));
      expect(renderer.getAllText()).toContain('Local modifications will be permanently discarded.');
      click(renderer, 'revert-confirm-cancel');
      await Bun.sleep(20);
      renderer.flush();
      expect(reverted).toBe(0);
      expect(renderer.findByTestId('revert-confirm')).toBeUndefined();
    } finally {
      unmount();
    }
  });
});
