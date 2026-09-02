import type { Repository } from '../../domain/repository';
import type { CommandRunner } from './commandRunner';
import { readRepositoryInfo } from './info';

export function checkoutArgv(url: string, destination: string): string[] {
  return ['svn', 'checkout', url, destination, '--non-interactive'];
}

export async function checkoutRepository(
  runner: CommandRunner,
  input: {
    url: string;
    destination: string;
    signal?: AbortSignal;
    onStdout?: (chunk: string) => void;
  },
): Promise<Repository> {
  await runner.run({
    argv: checkoutArgv(input.url, input.destination),
    signal: input.signal,
    onStdout: input.onStdout,
  });
  return readRepositoryInfo(runner, input.destination, input.signal);
}
