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

  test('E155004 是 working-copy-locked', () => {
    const error = classifySvnError({
      command: ['svn', 'update', '--non-interactive'],
      stderr: "svn: E155004: Working copy '/tmp/wc' locked\n",
      exitCode: 1,
    });
    expect(error.kind).toBe('working-copy-locked');
    expect(error.title).toBe('Working copy is locked.');
  });

  test('E170013 是 network', () => {
    const error = classifySvnError({
      command: ['svn', 'update', '--non-interactive'],
      stderr: "svn: E170013: Unable to connect to a repository at URL 'https://svn.example.com/p'\n",
      exitCode: 1,
    });
    expect(error.kind).toBe('network');
  });

  test('冲突输出分类为 conflict', () => {
    const error = classifySvnError({
      command: ['svn', 'update', '--non-interactive'],
      stderr: 'svn: E155015: The node remains in conflict\n',
      exitCode: 1,
    });
    expect(error.kind).toBe('conflict');
  });

  test('无法识别时仍返回 command-failed 并保留 stderr', () => {
    const error = classifySvnError({
      command: ['svn', 'status'],
      stderr: 'svn: E999999: unexpected failure\n',
      exitCode: 1,
    });
    expect(error.kind).toBe('command-failed');
    expect(error.stderr).toContain('unexpected failure');
  });
});
