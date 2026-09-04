import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { RepositoryScreen } from '../../src/features/repository/RepositoryScreen';
import type { Repository } from '../../src/domain/repository';
import type { PathOpener } from '../../src/services/platform/pathOpener';

const repo: Repository = {
  rootPath: '/tmp/demo-wc',
  repositoryUrl: 'https://svn.example.com/repos/app/trunk',
  repositoryRoot: 'https://svn.example.com/repos/app',
  uuid: '12345678-aaaa-bbbb-cccc-1234567890ab',
  revision: 42,
};

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 60; i++) {
    if (predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error('timed out');
}

describe('Working Copy page', () => {
  test('展示 working copy / repository / local status 的真实信息', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <RepositoryScreen
          initialPage="working-copy"
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/work/demo-wc"
          svnVersion="1.14.5"
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return [
                { path: 'src/a.ts', absolutePath: '/tmp/demo-wc/src/a.ts', status: 'modified' as const },
                { path: 'scratch.txt', absolutePath: '/tmp/demo-wc/scratch.txt', status: 'unversioned' as const },
              ];
            },
            async getDiff() {
              return { kind: 'text' as const, patch: '' };
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => renderer.getAllText().includes('2 changed items'));
      renderer.flush();

      expect(renderer.findByTestId('working-copy-view')).toBeTruthy();
      expect(renderer.getAllText()).toContain('Repository identity, local checkout details, and current SVN status.');
      expect(renderer.getAllText()).toContain('~/work/demo-wc');
      expect(renderer.getAllText()).toContain('https://svn.example.com/repos/app/trunk');
      expect(renderer.getAllText()).toContain('12345678-aaaa-bbbb-cccc-1234567890ab');
      expect(renderer.getAllText()).toContain('Modified');
      expect(renderer.getAllText()).toContain('Unversioned');
      expect(renderer.findByTestId('working-copy-refresh')).toBeTruthy();
      expect(renderer.findByTestId('working-copy-update')).toBeTruthy();
    } finally {
      unmount();
    }
  });

  test('Local path 旁 Show in Finder 打开 working copy 根目录，不走 Reveal', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      const opened: string[] = [];
      const revealed: string[][] = [];
      const mockOpener: PathOpener = {
        async openPath(path) {
          opened.push(path);
        },
        async revealPaths(paths) {
          revealed.push([...paths]);
        },
      };

      render(
        <RepositoryScreen
          initialPage="working-copy"
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/work/demo-wc"
          svnVersion="1.14.5"
          opener={mockOpener}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return [
                { path: 'src/a.ts', absolutePath: '/tmp/demo-wc/src/a.ts', status: 'modified' as const },
              ];
            },
            async getDiff() {
              return { kind: 'text' as const, patch: '' };
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('working-copy-show-in-finder')));
      renderer.flush();

      expect(renderer.findByTestId('working-copy-show-in-finder')).toBeTruthy();
      expect(renderer.getAllText()).toContain('Show in Finder');
      expect(renderer.findByTestId('reveal-in-finder')).toBeTruthy();
      expect(renderer.findByTestId('show-in-finder')).toBeUndefined();

      const action = renderer.findByTestId('working-copy-show-in-finder');
      const bounds = renderer.getElementBounds(action!.id);
      expect(bounds).toBeTruthy();
      const [x, y, w, h] = bounds as number[];
      renderer.nativeSimulateClick(x + w / 2, y + h / 2);
      renderer.flush();

      expect(opened).toEqual(['/tmp/demo-wc']);
      expect(revealed).toEqual([]);
    } finally {
      unmount();
    }
  });
});
