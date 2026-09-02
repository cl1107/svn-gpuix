import type { CommandRunner } from './commandRunner';

export function deleteArgv(paths: string[], force: boolean): string[] {
  return force ? ['svn', 'delete', '--force', '--', ...paths] : ['svn', 'delete', '--', ...paths];
}

export async function deleteWorkingCopyPaths(
  runner: CommandRunner,
  input: { cwd: string; paths: string[]; force?: boolean; signal?: AbortSignal },
): Promise<void> {
  await runner.run({
    argv: deleteArgv(input.paths, Boolean(input.force)),
    cwd: input.cwd,
    signal: input.signal,
  });
}
