import { describe, expect, test } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkoutAndOpen } from '../../src/application/checkoutRepository';
import { commitChanges } from '../../src/application/commitChanges';
import { loadFileDiff } from '../../src/application/loadDiff';
import { loadRevisionHistory } from '../../src/application/loadHistory';
import { addPaths } from '../../src/application/mutateWorkingCopy';
import { OperationManager } from '../../src/application/operationManager';
import { refreshWorkingCopy } from '../../src/application/refreshRepository';
import { SettingsRepository } from '../../src/services/settings/settingsRepository';
import { CommandRunner } from '../../src/services/svn/commandRunner';
import { CliSvnClient } from '../../src/services/svn/SvnClient';

async function run(argv: string[]): Promise<void> {
  const exitCode = await Bun.spawn(argv, { stdout: 'pipe', stderr: 'pipe' }).exited;
  if (exitCode !== 0) throw new Error(`${argv.join(' ')} exited ${exitCode}`);
}

describe('MVP happy path', () => {
  test('checkout → status → diff → commit → clean → history', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'svn-gpuix-e2e-'));
    const repoPath = join(dir, 'repo');
    const workingCopy = join(dir, 'wc');
    await run(['svnadmin', 'create', repoPath]);

    const svn = new CliSvnClient(new CommandRunner());
    const operations = new OperationManager();
    const settings = new SettingsRepository(join(dir, 'settings.json'));

    const opened = await checkoutAndOpen({
      url: `file://${repoPath}`,
      destination: workingCopy,
      svn,
      settings,
      operations,
    });
    expect(opened.repository.rootPath).toBeTruthy();

    await writeFile(join(workingCopy, 'readme.txt'), 'hello\n');
    await addPaths({ rootPath: workingCopy, paths: ['readme.txt'], svn, operations });
    await commitChanges({
      rootPath: workingCopy,
      paths: ['readme.txt'],
      message: 'initial file',
      svn,
      operations,
    });

    await writeFile(join(workingCopy, 'readme.txt'), 'hello\nworld\n');

    const refreshed = await refreshWorkingCopy({
      rootPath: workingCopy,
      svn,
      previousChecked: new Set(),
      previousPaths: new Set(),
      previousSelected: null,
    });
    const changed = refreshed.changes.find((item) => item.path === 'readme.txt');
    expect(changed?.status).toBe('modified');
    expect(refreshed.checkedPaths.has('readme.txt')).toBe(true);
    if (!changed) throw new Error('expected modified readme.txt');

    const diff = await loadFileDiff({
      change: changed,
      rootPath: workingCopy,
      svn,
    });
    expect(diff.kind).toBe('text');
    if (diff.kind === 'text') expect(diff.patch).toContain('+world');

    await commitChanges({
      rootPath: workingCopy,
      paths: ['readme.txt'],
      message: 'happy path commit',
      svn,
      operations,
    });

    const clean = await refreshWorkingCopy({
      rootPath: workingCopy,
      svn,
      previousChecked: new Set(['readme.txt']),
      previousPaths: new Set(['readme.txt']),
      previousSelected: 'readme.txt',
    });
    expect(clean.changes).toHaveLength(0);

    const history = await loadRevisionHistory({
      rootPath: workingCopy,
      svn,
    });
    expect(history.some((revision) => revision.message === 'happy path commit')).toBe(true);
  }, 30000);
});
