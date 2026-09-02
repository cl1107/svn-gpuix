import type { CommandRunner } from './commandRunner';

export function addArgv(paths: string[]): string[] {
  return ['svn', 'add', '--parents', '--', ...paths];
}

export async function addWorkingCopyPaths(
  runner: CommandRunner,
  input: { cwd: string; paths: string[]; signal?: AbortSignal },
): Promise<void> {
  await runner.run({
    argv: addArgv(input.paths),
    cwd: input.cwd,
    signal: input.signal,
  });
}
