import { describe, expect, test } from 'bun:test';
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkoutAndOpen } from '../../src/application/checkoutRepository';
import { OperationManager } from '../../src/application/operationManager';
import { SettingsRepository } from '../../src/services/settings/settingsRepository';
import { CommandError, CommandRunner } from '../../src/services/svn/commandRunner';
import { CliSvnClient } from '../../src/services/svn/SvnClient';

async function run(argv: string[]): Promise<void> {
  const result = await Bun.spawn(argv, { stdout: 'pipe', stderr: 'pipe' }).exited;
  if (result !== 0) throw new Error(`${argv.join(' ')} exited ${result}`);
}

describe('checkout 集成', () => {
  test('file:// checkout 成功后打开 working copy', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-co-'));
    const repo = join(dir, 'repo');
    const dest = join(dir, 'wc');
    await run(['svnadmin', 'create', repo]);
    const svn = new CliSvnClient(new CommandRunner());
    const lines: string[] = [];
    const result = await checkoutAndOpen({
      url: `file://${repo}`,
      destination: dest,
      svn,
      settings: new SettingsRepository(join(dir, 'settings.json')),
      operations: new OperationManager(),
      onStdout: (chunk) => lines.push(chunk),
    });
    expect(result.repository.rootPath).toBe(await realpath(dest));
    expect(result.recents[0]?.path).toBe(await realpath(dest));
    expect(lines.join('').length).toBeGreaterThan(0);
  });

  test('失败时抛出带 stderr 的 CommandError', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-co-bad-'));
    const svn = new CliSvnClient(new CommandRunner());
    try {
      await checkoutAndOpen({
        url: `file://${join(dir, 'missing-repo')}`,
        destination: join(dir, 'wc'),
        svn,
        settings: new SettingsRepository(join(dir, 'settings.json')),
        operations: new OperationManager(),
      });
      throw new Error('expected checkout to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(CommandError);
      if (error instanceof CommandError) {
        expect(error.stderr.length).toBeGreaterThan(0);
      }
    }
  });
});
