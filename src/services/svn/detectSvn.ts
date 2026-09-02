import { svnNotFoundError, type AppError } from '../../domain/error';
import { CommandError, type CommandRunner } from './commandRunner';

export type SvnAvailability =
  | { status: 'available'; version: string }
  | { status: 'unavailable'; error: AppError };

export async function detectSvn(runner: CommandRunner): Promise<SvnAvailability> {
  try {
    const result = await runner.run({
      argv: ['svn', '--version', '--quiet'],
    });
    const version = result.stdout.trim();
    if (!version) {
      return { status: 'unavailable', error: svnNotFoundError() };
    }
    return { status: 'available', version };
  } catch (error) {
    if (error instanceof CommandError) {
      const missing =
        error.exitCode === 127 ||
        error.message === 'executable not found' ||
        /not found|ENOENT/i.test(error.stderr);
      if (missing) {
        return { status: 'unavailable', error: svnNotFoundError() };
      }
      return {
        status: 'unavailable',
        error: {
          kind: 'command-failed',
          title: 'SVN CLI was not found',
          message: error.message,
          command: error.command,
          stderr: error.stderr,
          exitCode: error.exitCode,
        },
      };
    }
    return { status: 'unavailable', error: svnNotFoundError() };
  }
}
