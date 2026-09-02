import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { CheckoutDialog } from '../../src/features/welcome/CheckoutDialog';
import { WelcomeScreen } from '../../src/features/welcome/WelcomeScreen';

describe('Checkout Dialog', () => {
  test('Welcome 点 Checkout 会打开 dialog', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let opened = 0;
      render(
        <WelcomeScreen
          svn={{ status: 'available', version: '1.14.5' }}
          recents={[]}
          onOpenWorkingCopy={() => {}}
          onCheckout={() => {
            opened += 1;
          }}
        />,
      );
      renderer.flush();
      const button = renderer.findByTestId('checkout-repository-button');
      expect(button).toBeTruthy();
      const bounds = button ? renderer.getElementBounds(button.id) : null;
      expect(bounds).toBeTruthy();
      if (!bounds) return;
      renderer.nativeSimulateClick(bounds[0] + bounds[2] / 2, bounds[1] + bounds[3] / 2);
      renderer.flush();
      expect(opened).toBe(1);
    } finally {
      unmount();
    }
  });

  test('Cancel 关闭且失败展示 stderr', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let cancelled = 0;
      render(
        <CheckoutDialog
          url="https://svn.example.com/p"
          destination="/tmp/wc"
          busy={false}
          error={{
            kind: 'command-failed',
            title: 'SVN command failed',
            message: "svn: E170000: URL doesn't exist",
            stderr: "svn: E170000: URL doesn't exist",
          }}
          onUrl={() => {}}
          onDestination={() => {}}
          onBrowse={() => {}}
          onCancel={() => {
            cancelled += 1;
          }}
          onCheckout={() => {}}
        />,
      );
      renderer.flush();
      expect(renderer.findByTestId('checkout-dialog')).toBeTruthy();
      expect(renderer.getAllText()).toContain("svn: E170000: URL doesn't exist");
      const cancel = renderer.findByTestId('checkout-cancel');
      expect(cancel).toBeTruthy();
      const bounds = cancel ? renderer.getElementBounds(cancel.id) : null;
      expect(bounds).toBeTruthy();
      if (!bounds) return;
      renderer.nativeSimulateClick(bounds[0] + bounds[2] / 2, bounds[1] + bounds[3] / 2);
      renderer.flush();
      expect(cancelled).toBe(1);
    } finally {
      unmount();
    }
  });

  test('认证失败文案', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <CheckoutDialog
          url="https://svn.example.com/p"
          destination="/tmp/wc"
          busy={false}
          error={{
            kind: 'authentication',
            title: 'Authentication required.',
            message: 'Authenticate using svn in Terminal first and retry.',
          }}
          onUrl={() => {}}
          onDestination={() => {}}
          onBrowse={() => {}}
          onCancel={() => {}}
          onCheckout={() => {}}
        />,
      );
      renderer.flush();
      expect(renderer.getAllText()).toContain('Authentication required.');
      expect(renderer.getAllText()).toContain('Authenticate using svn in Terminal first and retry.');
    } finally {
      unmount();
    }
  });
});
