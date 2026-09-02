import { describe, expect, test } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { visibleChanges } from '../../src/domain/change';
import { CommandRunner } from '../../src/services/svn/commandRunner';
import { CliSvnClient } from '../../src/services/svn/SvnClient';

async function run(argv: string[], cwd?: string): Promise<void> {
  const result = await Bun.spawn(argv, { cwd, stdout: 'pipe', stderr: 'pipe' }).exited;
  if (result !== 0) {
    throw new Error(`${argv.join(' ')} exited ${result}`);
  }
}

describe('svn status 集成', () => {
  test('file:// working copy 能解析 modified / added / unversioned，并隐藏 ignored', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-status-'));
    const repo = join(dir, 'repo');
    const wc = join(dir, 'wc');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, wc]);
    await writeFile(join(wc, 'tracked.txt'), 'one\n');
    await run(['svn', 'add', 'tracked.txt'], wc);
    await run(['svn', 'commit', '-m', 'init'], wc);
    await writeFile(join(wc, 'tracked.txt'), 'two\n');
    await writeFile(join(wc, 'added.txt'), 'new\n');
    await run(['svn', 'add', 'added.txt'], wc);
    await writeFile(join(wc, 'scratch.txt'), 'tmp\n');
    await writeFile(join(wc, 'ignored.log'), 'nope\n');
    await run(['svn', 'propset', 'svn:ignore', 'ignored.log', '.'], wc);

    const client = new CliSvnClient(new CommandRunner());
    const changes = visibleChanges(await client.getStatus(wc));
    const byPath = Object.fromEntries(changes.map((change) => [change.path, change]));

    expect(byPath['tracked.txt']?.status).toBe('modified');
    expect(byPath['added.txt']?.status).toBe('added');
    expect(byPath['scratch.txt']?.status).toBe('unversioned');
    expect(byPath['ignored.log']).toBeUndefined();
    expect(byPath['.']).toBeUndefined();
  });
});
