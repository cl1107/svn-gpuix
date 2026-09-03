import { describe, expect, test } from 'bun:test';
import type { ReactNode } from 'react';
import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { App } from '../../src/app/App';
import { WelcomeScreen } from '../../src/features/welcome/WelcomeScreen';

async function assertScreenshot(
  name: string,
  renderView: (render: (node: ReactNode) => void) => void,
): Promise<void> {
  if (!hasNativeTestRenderer) return;
  const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-shot-'));
  const path = join(dir, `${name}.png`);
  const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
  try {
    renderView(render);
    renderer.flush();
    renderer.captureScreenshot(path);
    const info = await stat(path);
    expect(info.size).toBeGreaterThan(1024);
  } finally {
    unmount();
  }
}

describe('core UI screenshots', () => {
  test('Welcome', async () => {
    await assertScreenshot('welcome', (render) =>
      render(
        <WelcomeScreen
          svn={{ status: 'available', version: '1.14.5' }}
          recents={[]}
          onOpenWorkingCopy={() => {}}
          onCheckout={() => {}}
        />,
      ),
    );
  });

  test('Changes', async () => {
    await assertScreenshot('changes', (render) => render(<App preview="changes" />));
  });

  test('History', async () => {
    await assertScreenshot('history', (render) => render(<App preview="history" />));
  });

  test('Working Copy', async () => {
    await assertScreenshot('working-copy', (render) => render(<App preview="working-copy" />));
  });
});
