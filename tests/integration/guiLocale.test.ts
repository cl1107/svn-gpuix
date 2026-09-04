import { describe, expect, test } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function run(argv: string[], cwd?: string): Promise<void> {
  const proc = Bun.spawn(argv, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [stderr, exitCode] = await Promise.all([
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) throw new Error(`${argv.join(' ')} exited ${exitCode}: ${stderr}`);
}

describe('macOS GUI locale', () => {
  test('精简 Finder 环境仍能读取中文路径的 revision diff', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-gui-locale-'));
    const repo = join(dir, 'repo');
    const wc = join(dir, 'wc');
    const filename = '升级脚本.sql';
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, wc]);
    await writeFile(join(wc, filename), 'first line\n');
    await run(['svn', 'add', filename], wc);
    await run(['svn', 'commit', '-m', 'add unicode path'], wc);
    await writeFile(join(wc, filename), 'first line\nsecond line\n');
    await run(['svn', 'commit', '-m', 'change unicode path'], wc);

    const probe = Bun.spawn(
      [
        process.execPath,
        '-e',
        `import { CliSvnClient } from './src/services/svn/SvnClient.ts';
import { CommandRunner } from './src/services/svn/commandRunner.ts';
const cwd = process.env.REVISION_GUI_TEST_WC;
if (!cwd) throw new Error('missing test input');
const result = await new CliSvnClient(new CommandRunner()).getRevisionDiff(cwd, 2);
if (result.kind !== 'text') throw new Error('expected text revision diff');
process.stdout.write(result.patch);`,
      ],
      {
        cwd: process.cwd(),
        env: {
          PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
          REVISION_GUI_TEST_WC: wc,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(probe.stdout).text(),
      new Response(probe.stderr).text(),
      probe.exited,
    ]);

    expect(exitCode, stderr).toBe(0);
    expect(stdout).toContain(filename);
    expect(stdout).toContain('+second line');
  }, 15000);
});
