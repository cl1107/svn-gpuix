import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { ErrorBanner } from '../../src/components/ErrorBanner';

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

describe('ErrorBanner', () => {
  test('高级 SVN 详情默认折叠，可展开查看 stderr / command / exit code', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 640, height: 320 });
    try {
      render(
        <ErrorBanner
          testId="error"
          error={{
            kind: 'working-copy-locked',
            title: 'Working copy is locked.',
            message: 'Run svn cleanup in Terminal, then retry.',
            command: ['svn', 'update', '--non-interactive'],
            stderr: "svn: E155004: Working copy '/tmp/wc' locked",
            exitCode: 1,
          }}
        />,
      );
      renderer.flush();
      expect(renderer.getAllText()).toContain('Show Details');
      expect(renderer.findByTestId('error-details')).toBeUndefined();

      click(renderer, 'error-details-toggle');
      renderer.flush();
      expect(renderer.getAllText()).toContain('Hide Details');
      expect(renderer.findByTestId('error-details')).toBeTruthy();
      expect(renderer.getAllText().join('\n')).toContain('E155004');
      expect(renderer.getAllText().join('\n')).toContain('Exit code: 1');
    } finally {
      unmount();
    }
  });
});
