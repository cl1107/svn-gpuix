import { useState, type ReactNode } from 'react';
import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { App } from '../../src/app/App';
import { ThemeProvider } from '../../src/app/ThemeContext';
import { Titlebar } from '../../src/app/Titlebar';
import { tokensFor } from '../../src/app/theme';
import type { AppearancePreference } from '../../src/app/appearance';
import { CommandError, type CommandRequest } from '../../src/services/svn/commandRunner';
import { OperationManager } from '../../src/application/operationManager';

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 80; i++) {
    if (predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error('timed out');
}

function AppearanceHarness({
  children,
  initial = 'light',
  onPreference,
}: {
  children: ReactNode;
  initial?: AppearancePreference;
  onPreference?: (preference: AppearancePreference) => void;
}) {
  const [preference, setPreferenceState] = useState<AppearancePreference>(initial);
  const resolved = preference === 'system' ? 'dark' : preference;
  const setPreference = (next: AppearancePreference) => {
    setPreferenceState(next);
    onPreference?.(next);
  };

  return (
    <ThemeProvider
      tokens={tokensFor(resolved)}
      preference={preference}
      resolved={resolved}
      setPreference={setPreference}
    >
      {children}
    </ThemeProvider>
  );
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

describe('Titlebar', () => {
  test('Welcome 显示 Open working copy，不显示 Welcome screen', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(<App initialAppearance={{ preference: 'light', systemAppearance: 'light' }} />);
      renderer.flush();
      expect(renderer.findByTestId('titlebar')).toBeTruthy();
      expect(renderer.findByTestId('titlebar-open-working-copy')).toBeTruthy();
      expect(renderer.findByTestId('titlebar-welcome')).toBeUndefined();
    } finally {
      unmount();
    }
  });

  test('点 Welcome screen 关闭 working copy', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let closed = 0;
      render(
        <AppearanceHarness>
          <Titlebar
            canOpen
            showWelcome
            onOpenWorkingCopy={() => {}}
            onWelcomeScreen={() => {
              closed += 1;
            }}
          />
        </AppearanceHarness>,
      );
      renderer.flush();
      expect(renderer.getAllText()).toContain('Open working copy');
      expect(renderer.getAllText()).toContain('Welcome screen');
      click(renderer, 'titlebar-welcome');
      renderer.flush();
      expect(closed).toBe(1);
    } finally {
      unmount();
    }
  });

  test('Titlebar 三档外观切换会更新 preference', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      const changes: AppearancePreference[] = [];
      render(
        <AppearanceHarness onPreference={(preference) => changes.push(preference)}>
          <Titlebar canOpen onOpenWorkingCopy={() => {}} />
        </AppearanceHarness>,
      );
      renderer.flush();

      expect(renderer.findByTestId('titlebar-appearance-light')).toBeTruthy();
      expect(renderer.findByTestId('titlebar-appearance-dark')).toBeTruthy();
      expect(renderer.findByTestId('titlebar-appearance-system')).toBeTruthy();

      click(renderer, 'titlebar-appearance-dark');
      renderer.flush();
      expect(changes.at(-1)).toBe('dark');

      click(renderer, 'titlebar-appearance-system');
      renderer.flush();
      expect(changes.at(-1)).toBe('system');
    } finally {
      unmount();
    }
  });

  test('取消系统文件夹选择器不会崩溃，仍留在 Welcome', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <App
          initialAppearance={{ preference: 'light', systemAppearance: 'light' }}
          services={{
            runner: {
              async run(request: CommandRequest) {
                if (request.argv[0] === 'svn') {
                  return { exitCode: 0, stdout: '1.14.5\n', stderr: '' };
                }
                throw new CommandError({
                  command: request.argv,
                  exitCode: 1,
                  stdout: '',
                  stderr: 'unexpected',
                });
              },
            } as never,
            svn: {
              async validateWorkingCopy() {
                throw new Error('should not open');
              },
            } as never,
            picker: {
              async pickDirectory() {
                throw new CommandError({
                  command: ['osascript'],
                  exitCode: 1,
                  stdout: '',
                  stderr: '0:27: execution error: 用户已取消。 (-128)\n',
                });
              },
            },
            settings: {
              async load() {
                return { version: 1 as const, recentWorkingCopies: [], appearance: 'light' as const };
              },
              async addRecent() {
                return { version: 1 as const, recentWorkingCopies: [], appearance: 'light' as const };
              },
              async setAppearance(appearance: 'light' | 'dark' | 'system') {
                return { version: 1 as const, recentWorkingCopies: [], appearance };
              },
            } as never,
            operations: new OperationManager(),
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => {
        const texts = renderer.getAllText();
        return texts.includes('A focused SVN client') && !texts.includes('Checking SVN CLI');
      });
      click(renderer, 'titlebar-open-working-copy');
      await Bun.sleep(30);
      renderer.flush();
      expect(renderer.findByTestId('welcome-screen')).toBeTruthy();
      expect(renderer.findByTestId('titlebar')).toBeTruthy();
    } finally {
      unmount();
    }
  });
});
