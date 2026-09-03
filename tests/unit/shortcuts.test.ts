import { describe, expect, test } from 'bun:test';
import { shortcutFromKeyEvent } from '../../src/app/shortcuts';

describe('shortcutFromKeyEvent', () => {
  test('Cmd+O 打开 working copy', () => {
    expect(
      shortcutFromKeyEvent({
        key: 'o',
        modifiers: { cmd: true, shift: false, ctrl: false, alt: false },
      }),
    ).toBe('open-working-copy');
  });

  test('Cmd+Shift+O 打开 Checkout', () => {
    expect(
      shortcutFromKeyEvent({
        key: 'o',
        modifiers: { cmd: true, shift: true, ctrl: false, alt: false },
      }),
    ).toBe('checkout');
  });

  test('Cmd+R 刷新当前页面', () => {
    expect(
      shortcutFromKeyEvent({
        key: 'r',
        modifiers: { cmd: true, shift: false, ctrl: false, alt: false },
      }),
    ).toBe('refresh');
  });

  test('Cmd+Enter 提交', () => {
    expect(
      shortcutFromKeyEvent({
        key: 'enter',
        modifiers: { cmd: true, shift: false, ctrl: false, alt: false },
      }),
    ).toBe('commit');
  });

  test('Esc 关闭 dialog', () => {
    expect(
      shortcutFromKeyEvent({
        key: 'escape',
        modifiers: { cmd: false, shift: false, ctrl: false, alt: false },
      }),
    ).toBe('close-dialog');
  });
});
