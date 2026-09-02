import { describe, expect, test } from 'bun:test';
import { logArgv } from '../../src/services/svn/log';

describe('log argv', () => {
  test('默认 100 条 verbose XML', () => {
    expect(logArgv()).toEqual([
      'svn',
      'log',
      '--xml',
      '-v',
      '-l',
      '100',
      '-r',
      'HEAD:1',
      '--',
      '.',
    ]);
  });
});
