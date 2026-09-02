import { CommandError, type CommandRunner } from './commandRunner';
import { parseInfoXml } from './parsers/infoParser';
import type { Repository } from '../../domain/repository';

export const INFO_ARGV = ['svn', 'info', '--xml', '.'] as const;

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
