import { describe, expect, test } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CommandRunner } from '../../src/services/svn/commandRunner';
import { CliSvnClient } from '../../src/services/svn/SvnClient';

async function run(argv: string[], cwd?: string): Promise<void> {
  const result = await Bun.spawn(argv, { cwd, stdout: 'pipe', stderr: 'pipe' }).exited;
  if (result !== 0) throw new Error(`${argv.join(' ')} exited ${result}`);
}

describe('svn log 集成', () => {
  test('file:// working copy 能读到最近提交', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-log-'));
    const repo = join(dir, 'repo');
    const wc = join(dir, 'wc');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, wc]);
    await writeFile(join(wc, 'readme.txt'), 'hello\n');
    await run(['svn', 'add', 'readme.txt'], wc);
    await run(['svn', 'commit', '-m', 'init readme'], wc);

    const svn = new CliSvnClient(new CommandRunner());
    const revisions = await svn.getLog(wc, { limit: 100 });
    expect(revisions.length).toBeGreaterThanOrEqual(1);
    expect(revisions[0]?.message).toContain('init readme');
    expect(revisions[0]?.changedPaths.some((path) => path.path.endsWith('readme.txt'))).toBe(true);
  }, 15000);

  test('file:// working copy 能读取指定 revision 的完整 diff', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-revision-diff-'));
    const repo = join(dir, 'repo');
    const wc = join(dir, 'wc');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, wc]);
    await writeFile(join(wc, 'readme.txt'), 'hello\n');
    await run(['svn', 'add', 'readme.txt'], wc);
    await run(['svn', 'commit', '-m', 'init readme'], wc);
    await writeFile(join(wc, 'readme.txt'), 'hello\nrevision content\n');
    await run(['svn', 'commit', '-m', 'change readme'], wc);
    await writeFile(join(wc, 'readme.txt'), 'hello\nrevision content\nlocal only\n');

    const svn = new CliSvnClient(new CommandRunner());
    const revisions = await svn.getLog(wc, { limit: 1 });
    const latest = revisions[0];
    expect(latest?.message).toContain('change readme');
    if (!latest) throw new Error('expected latest revision');

    const result = await svn.getRevisionDiff(wc, latest.revision);
    expect(result.kind).toBe('text');
    if (result.kind === 'text') {
      expect(result.patch).toContain('diff --git');
      expect(result.patch).toContain('+revision content');
      expect(result.patch).not.toContain('+local only');
    }
  }, 15000);

  test('子目录 working copy 只看到该路径的 log', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-log-nested-'));
    const repo = join(dir, 'repo');
    const rootWc = join(dir, 'root');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, rootWc]);
    await run(['svn', 'mkdir', 'project-a', 'project-b'], rootWc);
    await run(['svn', 'commit', '-m', 'add project dirs'], rootWc);
    await writeFile(join(rootWc, 'project-a', 'a.txt'), 'a\n');
    await run(['svn', 'add', 'project-a/a.txt'], rootWc);
    await run(['svn', 'commit', '-m', 'init a'], rootWc);
    await writeFile(join(rootWc, 'project-b', 'b.txt'), 'b\n');
    await run(['svn', 'add', 'project-b/b.txt'], rootWc);
    await run(['svn', 'commit', '-m', 'init b'], rootWc);

    const nested = join(dir, 'wc-a');
    await run(['svn', 'checkout', `file://${repo}/project-a`, nested]);

    const svn = new CliSvnClient(new CommandRunner());
    const revisions = await svn.getLog(nested, { limit: 100 });
    const messages = revisions.map((item) => item.message);
    expect(messages.some((message) => message.includes('init a'))).toBe(true);
    expect(messages.some((message) => message.includes('init b'))).toBe(false);
  }, 15000);

  test('commit 后未 update 仍能看到刚提交的 revision', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-log-mixed-'));
    const repo = join(dir, 'repo');
    const wc = join(dir, 'wc');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, wc]);
    await writeFile(join(wc, 'readme.txt'), 'hello\n');
    await run(['svn', 'add', 'readme.txt'], wc);
    await run(['svn', 'commit', '-m', 'init readme'], wc);
    await writeFile(join(wc, 'readme.txt'), 'hello world\n');
    await run(['svn', 'commit', '-m', 'mixed revision commit'], wc);

    const svn = new CliSvnClient(new CommandRunner());
    const revisions = await svn.getLog(wc, { limit: 100 });
    expect(revisions[0]?.message).toContain('mixed revision commit');
  }, 15000);

  test('behind 只统计当前 working copy 路径尚未接收的 revision', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-behind-path-'));
    const repo = join(dir, 'repo');
    const rootWc = join(dir, 'root');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, rootWc]);
    await run(['svn', 'mkdir', 'project-a', 'project-b'], rootWc);
    await run(['svn', 'commit', '-m', 'add project dirs'], rootWc);
    await writeFile(join(rootWc, 'project-a', 'a.txt'), 'a\n');
    await writeFile(join(rootWc, 'project-b', 'b.txt'), 'b\n');
    await run(['svn', 'add', 'project-a/a.txt', 'project-b/b.txt'], rootWc);
    await run(['svn', 'commit', '-m', 'init projects'], rootWc);

    const nested = join(dir, 'wc-a');
    await run(['svn', 'checkout', `file://${repo}/project-a`, nested]);
    await writeFile(join(rootWc, 'project-b', 'b.txt'), 'b2\n');
    await run(['svn', 'commit', '-m', 'project b only'], rootWc);
    await writeFile(join(rootWc, 'project-a', 'a.txt'), 'a2\n');
    await run(['svn', 'commit', '-m', 'project a incoming'], rootWc);

    const svn = new CliSvnClient(new CommandRunner());
    expect(await svn.getIncomingRevisionCount(nested)).toBe(1);
  }, 15000);

  test('自己 commit 后无需 update 就保持 0 behind', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-behind-commit-'));
    const repo = join(dir, 'repo');
    const wc = join(dir, 'wc');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, wc]);
    await writeFile(join(wc, 'readme.txt'), 'hello\n');
    await run(['svn', 'add', 'readme.txt'], wc);
    await run(['svn', 'commit', '-m', 'init readme'], wc);

    const svn = new CliSvnClient(new CommandRunner());
    expect(await svn.getIncomingRevisionCount(wc)).toBe(0);
  }, 15000);
});
