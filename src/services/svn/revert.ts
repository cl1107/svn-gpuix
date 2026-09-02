import type { CommandRunner } from './commandRunner';

export function revertArgv(paths: string[]): string[] {
  return ['svn', 'revert', '--', ...paths];
}

export async function revertWorkingCopyPaths(
  runner: CommandRunner,
  input: { cwd: string; paths: string[]; signal?: AbortSignal },
): Promise<void> {
  await runner.run({
    argv: revertArgv(input.paths),
    cwd: input.cwd,
    signal: input.signal,
  });
}
