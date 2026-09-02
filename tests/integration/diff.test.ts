import { describe, expect, test } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadFileDiff } from '../../src/application/loadDiff';
import { CommandRunner } from '../../src/services/svn/commandRunner';
import { CliSvnClient } from '../../src/services/svn/SvnClient';

async function run(argv: string[], cwd?: string): Promise<void> {
  const result = await Bun.spawn(argv, { cwd, stdout: 'pipe', stderr: 'pipe' }).exited;
  if (result !== 0) {
    throw new Error(`${argv.join(' ')} exited ${result}`);
  }
}

describe('svn diff 集成', () => {
  test('file:// working copy 能区分 text / binary / unversioned', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-diff-'));
    const repo = join(dir, 'repo');
    const wc = join(dir, 'wc');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, wc]);
    await writeFile(join(wc, 'readme.txt'), 'hello\n');
    await writeFile(join(wc, 'photo.bin'), Buffer.from([0, 1, 2, 3, 255, 0]));
    await run(['svn', 'add', 'readme.txt', 'photo.bin'], wc);
    await run(['svn', 'propset', 'svn:mime-type', 'application/octet-stream', 'photo.bin'], wc);
    await run(['svn', 'commit', '-m', 'init'], wc);
    await writeFile(join(wc, 'readme.txt'), 'hello\nworld\n');
    await writeFile(join(wc, 'photo.bin'), Buffer.from([9, 9, 9, 9]));
    await writeFile(join(wc, 'scratch.txt'), 'tmp\n');

    const svn = new CliSvnClient(new CommandRunner());
    const changes = await svn.getStatus(wc);
    const byPath = Object.fromEntries(changes.map((change) => [change.path, change]));

    const readme = byPath['readme.txt'];
    const photo = byPath['photo.bin'];
    const scratch = byPath['scratch.txt'];
    expect(readme).toBeTruthy();
    expect(photo).toBeTruthy();
    expect(scratch).toBeTruthy();
    if (!readme || !photo || !scratch) throw new Error('expected status entries');

    const text = await loadFileDiff({
      change: readme,
      rootPath: wc,
      svn,
    });
    expect(text.kind).toBe('text');
    if (text.kind === 'text') {
      expect(text.patch).toContain('diff --git');
      expect(text.patch).toContain('+world');
    }

    const binary = await loadFileDiff({
      change: photo,
      rootPath: wc,
      svn,
    });
    expect(binary.kind).toBe('binary');

    const unversioned = await loadFileDiff({
      change: scratch,
      rootPath: wc,
      svn,
    });
    expect(unversioned.kind).toBe('unversioned');
  });
});
