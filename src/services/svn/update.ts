import { parseUpdateRevision, type UpdateResult } from '../../domain/operation';
import type { CommandRunner } from './commandRunner';

export const UPDATE_ARGV = ['svn', 'update', '--non-interactive'] as const;

export async function updateWorkingCopy(
  runner: CommandRunner,
  input: {
    cwd: string;
    signal?: AbortSignal;
    onStdout?: (chunk: string) => void;
  },
): Promise<UpdateResult> {
  const result = await runner.run({
    argv: [...UPDATE_ARGV],
    cwd: input.cwd,
    signal: input.signal,
    onStdout: input.onStdout,
  });
  const output = `${result.stdout}\n${result.stderr}`;
  return {
    revision: parseUpdateRevision(output),
    output,
  };
}
