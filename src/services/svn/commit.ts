import { parseCommitRevision, type CommitResult } from '../../domain/operation';
import type { CommandRunner } from './commandRunner';

export function commitArgv(paths: string[], message: string): string[] {
  return ['svn', 'commit', '--non-interactive', '-m', message, '--', ...paths];
}

export async function commitWorkingCopy(
  runner: CommandRunner,
  input: { cwd: string; paths: string[]; message: string; signal?: AbortSignal },
): Promise<CommitResult> {
  const argv = commitArgv(input.paths, input.message);
  const result = await runner.run({
    argv,
    cwd: input.cwd,
    signal: input.signal,
  });
  const output = `${result.stdout}\n${result.stderr}`;
  return {
    revision: parseCommitRevision(output),
    output,
  };
}
