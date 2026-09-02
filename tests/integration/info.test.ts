import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CommandError, CommandRunner } from '../../src/services/svn/commandRunner';
import { CliSvnClient } from '../../src/services/svn/SvnClient';

async function run(argv: string[]): Promise<void> {
  const result = await Bun.spawn(argv, { stdout: 'pipe', stderr: 'pipe' }).exited;
  if (result !== 0) {
    throw new Error(`${argv.join(' ')} exited ${result}`);
  }
}

describe('svn info 集成', () => {
  test('file:// working copy 能解析出 Repository', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-info-'));
    const repo = join(dir, 'repo');
    const wc = join(dir, 'wc');
    await run(['svnadmin', 'create', repo]);
    await run(['svn', 'checkout', `file://${repo}`, wc]);

    const client = new CliSvnClient(new CommandRunner());
    const info = await client.validateWorkingCopy(wc);
    expect(info.rootPath).toBe(await realpath(wc));
    expect(info.repositoryUrl).toMatch(/^file:\/\//);
    expect(info.repositoryUrl).toContain('/repo');
    expect(info.repositoryRoot).toBe(info.repositoryUrl);
    expect(info.revision).toBe(0);
    expect(info.uuid).toBeTruthy();
  });

  test('普通目录抛出 E155007', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-notwc-'));
    await mkdir(join(dir, 'plain'));
    const client = new CliSvnClient(new CommandRunner());
    try {
      await client.validateWorkingCopy(join(dir, 'plain'));
      throw new Error('expected CommandError');
    } catch (error) {
      expect(error).toBeInstanceOf(CommandError);
      if (error instanceof CommandError) {
        expect(error.stderr).toMatch(/E155007|not a working copy/);
      }
    }
  });
});
