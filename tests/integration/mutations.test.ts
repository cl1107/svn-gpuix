import { describe, expect, test } from 'bun:test';
import { mkdtemp, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commitChanges } from '../../src/application/commitChanges';
import {
  addPaths,
  deletePaths,
  revertPaths,
  updateWorkingCopyRoot,
} from '../../src/application/mutateWorkingCopy';
import { OperationManager } from '../../src/application/operationManager';
import { CommandRunner } from '../../src/services/svn/commandRunner';
import { CliSvnClient } from '../../src/services/svn/SvnClient';

async function run(argv: string[], cwd?: string): Promise<void> {
  const result = await Bun.spawn(argv, { cwd, stdout: 'pipe', stderr: 'pipe' }).exited;
  if (result !== 0) {
    throw new Error(`${argv.join(' ')} exited ${result}`);
  }
}

describe('working copy mutations 集成', () => {
  test('add / commit / revert / delete / update 走真实 file:// 仓库', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-mut-'));
    const repo = join(dir, 'repo');
    const wc = join(dir, 'wc');
    const wc2 = join(dir, 'wc2');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, wc]);

    const svn = new CliSvnClient(new CommandRunner());
    const operations = new OperationManager();

    await writeFile(join(wc, 'readme.txt'), 'hello\n');
    await addPaths({ rootPath: wc, paths: ['readme.txt'], svn, operations });
    const committed = await commitChanges({
      rootPath: wc,
      paths: ['readme.txt'],
      message: 'init',
      svn,
      operations,
    });
    expect(committed.revision).toBe(1);

    await writeFile(join(wc, 'readme.txt'), 'hello\nworld\n');
    let status = await svn.getStatus(wc);
    expect(status.some((change) => change.path === 'readme.txt' && change.status === 'modified')).toBe(true);
    await revertPaths({ rootPath: wc, paths: ['readme.txt'], svn, operations });
    status = await svn.getStatus(wc);
    expect(status.some((change) => change.path === 'readme.txt')).toBe(false);

    await writeFile(join(wc, 'gone.txt'), 'tmp\n');
    await addPaths({ rootPath: wc, paths: ['gone.txt'], svn, operations });
    await commitChanges({ rootPath: wc, paths: ['gone.txt'], message: 'add gone', svn, operations });
    await unlink(join(wc, 'gone.txt'));
    status = await svn.getStatus(wc);
    const missing = status.find((change) => change.path === 'gone.txt');
    expect(missing?.status).toBe('missing');
    if (!missing) throw new Error('expected missing file');
    await deletePaths({ rootPath: wc, changes: [missing], svn, operations });
    await commitChanges({
      rootPath: wc,
      paths: ['gone.txt'],
      message: 'remove gone',
      svn,
      operations,
    });

    await run(['svn', 'checkout', `file://${repo}`, wc2]);
    await writeFile(join(wc, 'readme.txt'), 'hello\nfrom wc\n');
    await commitChanges({ rootPath: wc, paths: ['readme.txt'], message: 'bump', svn, operations });
    const updated = await updateWorkingCopyRoot({ rootPath: wc2, svn, operations });
    expect(updated.revision).toBeGreaterThanOrEqual(3);
  }, 20000);
});
