import { describe, expect, test } from 'bun:test';
import { addArgv } from '../../src/services/svn/add';
import { checkoutArgv } from '../../src/services/svn/checkout';
import { commitArgv } from '../../src/services/svn/commit';
import { deleteArgv } from '../../src/services/svn/delete';
import { revertArgv } from '../../src/services/svn/revert';
import { UPDATE_ARGV } from '../../src/services/svn/update';

describe('mutation argv', () => {
  test('commit 用 argv，不拼 shell', () => {
    expect(commitArgv(['src/a.ts', 'b.ts'], 'fix mapping')).toEqual([
      'svn',
      'commit',
      '--non-interactive',
      '-m',
      'fix mapping',
      '--',
      'src/a.ts',
      'b.ts',
    ]);
  });

  test('add / revert / delete / checkout / update 走固定 argv', () => {
    expect(addArgv(['scratch.txt'])).toEqual(['svn', 'add', '--parents', '--', 'scratch.txt']);
    expect(revertArgv(['a.ts'])).toEqual(['svn', 'revert', '--', 'a.ts']);
    expect(deleteArgv(['a.ts'], false)).toEqual(['svn', 'delete', '--', 'a.ts']);
    expect(deleteArgv(['gone.ts'], true)).toEqual(['svn', 'delete', '--force', '--', 'gone.ts']);
    expect(checkoutArgv('file:///repo', '/tmp/wc')).toEqual([
      'svn',
      'checkout',
      'file:///repo',
      '/tmp/wc',
      '--non-interactive',
    ]);
    expect([...UPDATE_ARGV]).toEqual(['svn', 'update', '--non-interactive']);
  });
});
