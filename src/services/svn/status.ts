import type { WorkingCopyChange } from '../../domain/change';
import { CommandError, type CommandRunner } from './commandRunner';
import { parseStatusXml } from './parsers/statusParser';

export const STATUS_ARGV = ['svn', 'status', '--xml', '--ignore-externals'] as const;

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
