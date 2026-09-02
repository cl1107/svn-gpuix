import { describe, expect, test } from 'bun:test';
import { classifySvnError } from '../../src/domain/error';

describe('classifySvnError', () => {
  test('E155007 是 not-working-copy', () => {
    const error = classifySvnError({
      command: ['svn', 'info', '--xml', '.'],
      stderr: "svn: E155007: '/tmp/x' is not a working copy\n",
      exitCode: 1,
    });
    expect(error.kind).toBe('not-working-copy');
    expect(error.title).toBe('This folder is not an SVN working copy.');
  });

  test('认证失败展示 Terminal 提示，不内置登录 UI', () => {
    const error = classifySvnError({
      command: ['svn', 'checkout', 'https://svn.example.com/p', '/tmp/wc', '--non-interactive'],
      stderr: 'svn: E170001: Authentication required for https://svn.example.com\n',
      exitCode: 1,
    });
    expect(error.kind).toBe('authentication');
    expect(error.title).toBe('Authentication required.');
    expect(error.message).toBe('Authenticate using svn in Terminal first and retry.');
  });
});
