import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { App } from '../../src/app/App';
import { RepositoryScreen } from '../../src/features/repository/RepositoryScreen';
import type { SvnRevision } from '../../src/domain/revision';
import type { Repository } from '../../src/domain/repository';

const repo: Repository = {
  rootPath: '/tmp/demo-wc',
  repositoryUrl: 'file:///repo',
  repositoryRoot: 'file:///repo',
  revision: 12,
};

const revisions: SvnRevision[] = [
  {
    revision: 12,
    author: 'alice',
    date: '2026-09-01T12:00:00.000Z',
    message: 'Fix user service',
    changedPaths: [{ action: 'M', path: '/trunk/src/App.ts' }],
  },
  {
    revision: 11,
    author: 'bob',
    date: '2026-08-30T08:00:00.000Z',
    message: 'Add profile page',
    changedPaths: [{ action: 'A', path: '/trunk/src/pages/profile.vue' }],
  },
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

describe('History', () => {
  test('preview 显示 revision 列表', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(<App preview="history" />);
      renderer.flush();
      expect(renderer.findByTestId('history-view')).toBeTruthy();
      expect(renderer.findByTestId('revision-18431')).toBeTruthy();
      expect(renderer.getAllText()).toContain('Fix profile avatar fallback when CDN is empty');
    } finally {
      unmount();
    }
  });

  test('live History 加载 100 条限制的 log，点 revision 看详情', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let logCalls = 0;
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialPage="history"
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return [];
            },
            async getDiff() {
              return { kind: 'text', patch: '' };
            },
            async getLog(_root, options) {
              logCalls += 1;
              expect(options?.limit ?? 100).toBe(100);
              return revisions;
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('revision-12')));
      renderer.flush();
      expect(renderer.getAllText()).toContain('Fix user service');
      expect(renderer.getAllText()).toContain('/trunk/src/App.ts');
      click(renderer, 'revision-11');
      renderer.flush();
      expect(renderer.getAllText()).toContain('Add profile page');
      expect(renderer.getAllText()).toContain('/trunk/src/pages/profile.vue');
      click(renderer, 'history-refresh');
      await waitFor(() => logCalls >= 2);
      expect(logCalls).toBeGreaterThanOrEqual(2);
    } finally {
      unmount();
    }
  });
});
