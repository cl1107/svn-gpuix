import { useState } from 'react';
import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { DiffPanel, type DiffView } from '../../src/features/changes/DiffPanel';
import { RepositoryScreen } from '../../src/features/repository/RepositoryScreen';
import type { WorkingCopyChange } from '../../src/domain/change';
import type { DiffResult } from '../../src/domain/diff';
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
  { path: 'z.bin', absolutePath: '/tmp/demo-wc/z.bin', status: 'modified' },
];

const textPatch = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
-old
+new
`;

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 80; i++) {
    if (predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error('timed out');
}

describe('DiffPanel', () => {
  test('点文件立即 Loading，文本 diff 渲染 patch', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let resolveSlow: (value: DiffResult) => void = () => {};
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          svnVersion="1.14.5"
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            getDiff(_root, path) {
              if (path === 'a.ts') {
                return new Promise((resolve) => {
                  resolveSlow = resolve;
                });
              }
              return Promise.resolve({ kind: 'binary' });
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      renderer.flush();
      await waitFor(() => renderer.getAllText().includes('Loading diff…'));
      expect(renderer.getAllText()).toContain('Loading diff…');

      resolveSlow({ kind: 'text', patch: textPatch });
      await waitFor(() => renderer.getAllText().includes('+new') || renderer.getAllText().includes('1 additions'));
      renderer.flush();
      expect(renderer.getAllText()).toContain('1 additions');
      expect(renderer.getAllText()).toContain('1 deletions');
      expect(renderer.findByTestId('diff-empty')).toBeUndefined();
    } finally {
      unmount();
    }
  });

  test('快速切换时旧 diff 不能覆盖新选择', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let resolveA: (value: DiffResult) => void = () => {};
      let statusCalls = 0;
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          svnVersion="1.14.5"
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              statusCalls += 1;
              if (statusCalls === 1) return [changes[0], changes[2]];
              return [changes[2]];
            },
            getDiff(_root, path) {
              if (path === 'a.ts') {
                return new Promise((resolve) => {
                  resolveA = resolve;
                });
              }
              return Promise.resolve({ kind: 'binary' });
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => renderer.getAllText().includes('Loading diff…'));
      const refresh = renderer.findByTestId('refresh-button');
      expect(refresh).toBeTruthy();
      const bounds = refresh ? renderer.getElementBounds(refresh.id) : null;
      expect(bounds).toBeTruthy();
      if (!bounds) return;
      renderer.nativeSimulateClick(bounds[0] + bounds[2] / 2, bounds[1] + bounds[3] / 2);
      await waitFor(() => renderer.getAllText().includes('This file is binary. Unified diff is not available.'));
      resolveA({ kind: 'text', patch: textPatch });
      await Bun.sleep(30);
      renderer.flush();
      expect(renderer.getAllText()).toContain('This file is binary. Unified diff is not available.');
      expect(renderer.getAllText()).not.toContain('1 additions');
    } finally {
      unmount();
    }
  });

  test('unversioned 空态带 Add 入口', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 804, height: 916 });
    try {
      const change = changes[1];
      const view: DiffView = { state: 'ready', path: change.path, result: { kind: 'unversioned' } };
      render(<DiffPanel change={change} view={view} />);
      renderer.flush();
      expect(renderer.getAllText()).toContain('Unversioned file. Add this file to SVN to include it in a commit.');
      expect(renderer.findByTestId('add-unversioned')).toBeTruthy();
    } finally {
      unmount();
    }
  });
});

describe('DiffPanel fixture 不需要 hooks', () => {
  test('binary 空态', () => {
    if (!hasNativeTestRenderer) return;
    function Harness() {
      const [view] = useState<DiffView>({
        state: 'ready',
        path: 'z.bin',
        result: { kind: 'binary' },
      });
      return <DiffPanel change={changes[2]} view={view} />;
    }
    const { render, renderer, unmount } = createTestRoot({ width: 804, height: 916 });
    try {
      render(<Harness />);
      renderer.flush();
      expect(renderer.getAllText()).toContain('This file is binary. Unified diff is not available.');
    } finally {
      unmount();
    }
  });
});
