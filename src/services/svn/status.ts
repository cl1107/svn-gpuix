import type { WorkingCopyChange } from '../../domain/change';
import { CommandError, type CommandRunner } from './commandRunner';
import { posix } from 'node:path';
import { parseLogXml } from './parsers/logParser';
import { parseIncomingStatusXml, parseStatusXml, type IncomingStatusEntry } from './parsers/statusParser';

export const STATUS_ARGV = ['svn', 'status', '--xml', '--ignore-externals'] as const;
export const INCOMING_STATUS_ARGV = [
  'svn',
  'status',
  '--xml',
  '--show-updates',
  '--verbose',
  '--ignore-externals',
  '--non-interactive',
  '--',
  '.',
] as const;

export async function readWorkingCopyStatus(
  runner: CommandRunner,
  cwd: string,
  signal?: AbortSignal,
): Promise<WorkingCopyChange[]> {
  try {
    const result = await runner.run({
      argv: [...STATUS_ARGV],
      cwd,
      signal,
    });
    return parseStatusXml(result.stdout, cwd);
  } catch (error) {
    if (error instanceof CommandError) throw error;
    throw new CommandError({
      command: [...STATUS_ARGV],
      cwd,
      exitCode: 1,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'failed to parse svn status',
    });
  }
}

export async function readIncomingRevisionCount(
  runner: CommandRunner,
  input: {
    cwd: string;
    repositoryUrl: string;
    repositoryRoot: string;
    rootRevision: number;
    signal?: AbortSignal;
  },
): Promise<number> {
  const statusResult = await runner.run({
    argv: [...INCOMING_STATUS_ARGV],
    cwd: input.cwd,
    signal: input.signal,
  });
  const incoming = parseIncomingStatusXml(statusResult.stdout, input.cwd);
  if (incoming.length === 0) return 0;

  const targets = resolveIncomingTargets(incoming, input.rootRevision);
  const oldestRevision = Math.min(...targets.map((target) => target.revision));
  const logResult = await runner.run({
    argv: [
      'svn',
      'log',
      '--xml',
      '-v',
      '-r',
      `HEAD:${oldestRevision + 1}`,
      '--non-interactive',
      '--',
      '.',
    ],
    cwd: input.cwd,
    signal: input.signal,
  });
  const repositoryPath = repositoryRelativePath(input.repositoryUrl, input.repositoryRoot);
  const repositoryTargets = targets.map((target) => ({
    path: target.path === '.' ? repositoryPath : posix.join(repositoryPath, target.path),
    revision: target.revision,
  }));

  return parseLogXml(logResult.stdout).filter((revision) =>
    revision.changedPaths.some((changedPath) =>
      repositoryTargets.some(
        (target) =>
          revision.revision > target.revision &&
          (changedPath.path === target.path || target.path.startsWith(`${changedPath.path}/`)),
      ),
    ),
  ).length;
}

function resolveIncomingTargets(
  entries: IncomingStatusEntry[],
  rootRevision: number,
): Array<{ path: string; revision: number }> {
  return entries.map((entry) => ({
    path: entry.path,
    revision: entry.revision ?? nearestAncestorRevision(entry.path, entries) ?? rootRevision,
  }));
}

function nearestAncestorRevision(path: string, entries: IncomingStatusEntry[]): number | undefined {
  return entries
    .filter(
      (candidate) =>
        candidate.revision !== undefined &&
        (candidate.path === '.' || path.startsWith(`${candidate.path}/`)),
    )
    .sort((left, right) => right.path.length - left.path.length)[0]?.revision;
}

function repositoryRelativePath(repositoryUrl: string, repositoryRoot: string): string {
  const urlPath = decodeURIComponent(new URL(repositoryUrl).pathname);
  const rootPath = decodeURIComponent(new URL(repositoryRoot).pathname).replace(/\/$/, '');
  const relativePath = urlPath.slice(rootPath.length);
  return relativePath.startsWith('/') ? relativePath || '/' : `/${relativePath}`;
}
