import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { WelcomeScreen } from '../../src/features/welcome/WelcomeScreen';
import { svnNotFoundError } from '../../src/domain/error';

describe('WelcomeScreen', () => {
  test('svn 可用时渲染品牌图标、主文案和版本', () => {
    if (!hasNativeTestRenderer) return;

    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <WelcomeScreen
          svn={{ status: 'available', version: '1.14.5' }}
          recents={[]}
          onOpenWorkingCopy={() => {}}
          onCheckout={() => {}}
        />,
      );
      renderer.flush();
      const texts = renderer.getAllText();
      expect(texts).toContain('A focused SVN client');
      expect(texts).toContain('Open a working copy to see it here.');
      expect(renderer.findByTestId('brand-mark')).toBeTruthy();
      expect(renderer.findByTestId('welcome-title')).toBeTruthy();
    } finally {
      unmount();
    }
  });

  test('打开失败时显示错误且不离开 Welcome', () => {
    if (!hasNativeTestRenderer) return;

    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <WelcomeScreen
          svn={{ status: 'available', version: '1.14.5' }}
          recents={[
            {
              name: 'gone',
              path: '~/gone',
              absolutePath: '/tmp/gone',
              statusLabel: 'Missing',
              statusTone: 'missing',
            },
          ]}
          error={{
            kind: 'not-working-copy',
            title: 'This folder is not an SVN working copy.',
            message: 'Choose a folder that contains a checked-out working copy.',
          }}
          onOpenWorkingCopy={() => {}}
          onCheckout={() => {}}
        />,
      );
      renderer.flush();
      expect(renderer.findByTestId('welcome-screen')).toBeTruthy();
      expect(renderer.findByTestId('open-error')).toBeTruthy();
      expect(renderer.getAllText()).toContain('This folder is not an SVN working copy.');
      expect(renderer.getAllText()).toContain('Missing');
    } finally {
      unmount();
    }
  });

  test('svn 不可用时显示安装提示', () => {
    if (!hasNativeTestRenderer) return;

    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <WelcomeScreen
          svn={{ status: 'unavailable', error: svnNotFoundError() }}
          recents={[]}
          onOpenWorkingCopy={() => {}}
          onCheckout={() => {}}
        />,
      );
      renderer.flush();
      expect(renderer.findByTestId('svn-missing')).toBeTruthy();
      expect(renderer.getAllText()).toContain('SVN CLI was not found');
    } finally {
      unmount();
    }
  });
});
