export type AppErrorKind =
  | 'svn-not-found'
  | 'not-working-copy'
  | 'authentication'
  | 'network'
  | 'working-copy-locked'
  | 'conflict'
  | 'command-failed'
  | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  title: string;
  message: string;
  command?: string[];
  stderr?: string;
  exitCode?: number;
}

export function svnNotFoundError(): AppError {
  return {
    kind: 'svn-not-found',
    title: 'SVN CLI was not found',
    message: 'Install Subversion and restart the application.',
  };
}

export function notWorkingCopyError(input?: {
  message?: string;
  command?: string[];
  stderr?: string;
  exitCode?: number;
}): AppError {
  return {
    kind: 'not-working-copy',
    title: 'This folder is not an SVN working copy.',
    message: input?.message ?? 'Choose a folder that contains a checked-out working copy.',
    command: input?.command,
    stderr: input?.stderr,
    exitCode: input?.exitCode,
  };
}

export function missingWorkingCopyError(path: string): AppError {
  return notWorkingCopyError({
    message: `${path} is missing or is no longer a directory.`,
  });
}

export function classifySvnError(input: {
  command: string[];
  stderr: string;
  stdout?: string;
  exitCode: number;
  message?: string;
}): AppError {
  if (input.message === 'aborted') {
    return {
      kind: 'command-failed',
      title: 'SVN command cancelled',
      message: 'The command was cancelled.',
      command: input.command,
      stderr: input.stderr,
      exitCode: input.exitCode,
    };
  }

  const text = `${input.stderr}\n${input.stdout ?? ''}\n${input.message ?? ''}`;
  if (/E155007|is not a working copy/i.test(text)) {
    return notWorkingCopyError({
      command: input.command,
      stderr: input.stderr,
      exitCode: input.exitCode,
    });
  }

  if (/E170001|E215004|authentication required|authorization failed|Authentication failed/i.test(text)) {
    return {
      kind: 'authentication',
      title: 'Authentication required.',
      message: 'Authenticate using svn in Terminal first and retry.',
      command: input.command,
      stderr: input.stderr,
      exitCode: input.exitCode,
    };
  }

  if (/E155004|E155037|working copy[^\n]*locked|locked working copy/i.test(text)) {
    return {
      kind: 'working-copy-locked',
      title: 'Working copy is locked.',
      message: 'Another or interrupted SVN operation left this working copy locked. Run svn cleanup in Terminal, then retry.',
      command: input.command,
      stderr: input.stderr,
      exitCode: input.exitCode,
    };
  }

  if (/E170013|E670002|E731001|could not resolve hostname|connection refused|connection timed out|unable to connect|failed to connect|network connection/i.test(text)) {
    return {
      kind: 'network',
      title: 'Could not reach SVN repository.',
      message: 'Check the network connection and repository URL, then retry.',
      command: input.command,
      stderr: input.stderr,
      exitCode: input.exitCode,
    };
  }

  if (/E155015|E195020|remains? in conflict|conflict discovered|tree conflict|text conflict|property conflict/i.test(text)) {
    return {
      kind: 'conflict',
      title: 'SVN conflict detected.',
      message: 'Resolve the conflict with your SVN tooling, then refresh the working copy.',
      command: input.command,
      stderr: input.stderr,
      exitCode: input.exitCode,
    };
  }

  const detail = input.stderr.trim() || input.message || 'The SVN command failed.';
  return {
    kind: 'command-failed',
    title: 'SVN command failed',
    message: detail,
    command: input.command,
    stderr: input.stderr,
    exitCode: input.exitCode,
  };
}

export function isAppError(value: unknown): value is AppError {
  if (!value || typeof value !== 'object') return false;
  if (!('kind' in value) || !('title' in value) || !('message' in value)) return false;
  return typeof value.kind === 'string' && typeof value.title === 'string' && typeof value.message === 'string';
}
