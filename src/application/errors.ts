import { classifySvnError, isAppError, type AppError } from '../domain/error';
import { MutationBusyError } from '../domain/operation';
import { CommandError } from '../services/svn/commandRunner';

export function toAppError(error: unknown, fallbackTitle = 'SVN command failed'): AppError {
  if (isAppError(error)) return error;
  if (error instanceof MutationBusyError) {
    return {
      kind: 'command-failed',
      title: 'SVN is busy',
      message: error.message,
    };
  }
  if (error instanceof CommandError) {
    return classifySvnError({
      command: error.command,
      stderr: error.stderr,
      stdout: error.stdout,
      exitCode: error.exitCode,
      message: error.message,
    });
  }
  return {
    kind: 'unknown',
    title: fallbackTitle,
    message: error instanceof Error ? error.message : 'Unknown error',
  };
}