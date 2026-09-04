import type { DiffResult, RevisionDiffResult } from '../../domain/diff';
import { CommandError, type CommandRunner } from './commandRunner';

export const DIFF_ARGV_PREFIX = ['svn', 'diff', '--git', '--'] as const;

const BINARY_PATTERN = /file marked as a binary type|GIT binary patch|Binary files .* differ/i;
const UNVERSIONED_PATTERN = /is not under version control|E155010|W155010/i;

export function classifyDiffOutput(stdout: string, stderr: string): DiffResult {
  const combined = `${stdout}\n${stderr}`;
  if (BINARY_PATTERN.test(combined)) return { kind: 'binary' };
  if (UNVERSIONED_PATTERN.test(combined)) return { kind: 'unversioned' };
  return { kind: 'text', patch: stdout };
}

export function classifyRevisionDiffOutput(stdout: string, stderr: string): RevisionDiffResult {
  const containsBinary = BINARY_PATTERN.test(`${stdout}\n${stderr}`);
  const containsTextHunk = /^@@ /m.test(stdout);
  if (containsBinary && !containsTextHunk) return { kind: 'binary' };
  return { kind: 'text', patch: stdout };
}

export async function readWorkingCopyDiff(
  runner: CommandRunner,
  input: { cwd: string; path: string; signal?: AbortSignal },
): Promise<DiffResult> {
  const argv = [...DIFF_ARGV_PREFIX, input.path];
  try {
    const result = await runner.run({
      argv,
      cwd: input.cwd,
      signal: input.signal,
    });
    return classifyDiffOutput(result.stdout, result.stderr);
  } catch (error) {
    if (error instanceof CommandError) {
      if (error.message === 'aborted') throw error;
      const classified = classifyDiffOutput(error.stdout, error.stderr);
      if (classified.kind !== 'text') return classified;
    }
    throw error;
  }
}

export async function readRevisionDiff(
  runner: CommandRunner,
  input: { cwd: string; revision: number; signal?: AbortSignal },
): Promise<RevisionDiffResult> {
  const result = await runner.run({
    argv: [
      'svn',
      'diff',
      '--git',
      '--non-interactive',
      '-c',
      String(input.revision),
      '--',
      '.',
    ],
    cwd: input.cwd,
    signal: input.signal,
  });

  return classifyRevisionDiffOutput(result.stdout, result.stderr);
}
