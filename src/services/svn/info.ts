import { CommandError, type CommandRunner } from './commandRunner';
import { parseInfoXml, parseRemoteRevision } from './parsers/infoParser';
import type { Repository } from '../../domain/repository';

export const INFO_ARGV = ['svn', 'info', '--xml', '.'] as const;
export const INFO_HEAD_ARGV = ['svn', 'info', '--xml', '-r', 'HEAD', '--non-interactive'] as const;
export const REMOTE_INFO_ARGV = INFO_HEAD_ARGV;

export async function readRepositoryInfo(
  runner: CommandRunner,
  cwd: string,
  signal?: AbortSignal,
): Promise<Repository> {
  try {
    const result = await runner.run({
      argv: [...INFO_ARGV],
      cwd,
      signal,
    });
    return parseInfoXml(result.stdout, cwd);
  } catch (error) {
    if (error instanceof CommandError) throw error;
    throw new CommandError({
      command: [...INFO_ARGV],
      cwd,
      exitCode: 1,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'failed to parse svn info',
    });
  }
}

export async function readRemoteHeadRevision(
  runner: CommandRunner,
  cwd: string,
  signal?: AbortSignal,
): Promise<number> {
  try {
    const result = await runner.run({
      argv: [...INFO_HEAD_ARGV],
      cwd,
      signal,
    });
    return parseRemoteRevision(result.stdout);
  } catch (error) {
    if (error instanceof CommandError) throw error;
    throw new CommandError({
      command: [...INFO_HEAD_ARGV],
      cwd,
      exitCode: 1,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'failed to parse remote svn info',
    });
  }
}
