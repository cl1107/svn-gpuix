import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { classifySvnError, isAppError, missingWorkingCopyError, type AppError } from '../domain/error';
import type { RecentWorkingCopy, Repository } from '../domain/repository';
import { CommandError } from '../services/svn/commandRunner';
import type { SettingsRepository } from '../services/settings/settingsRepository';

export interface OpenRepositoryClient {
  validateWorkingCopy(path: string, signal?: AbortSignal): Promise<Repository>;
}

export type OpenRepositoryResult =
  | { ok: true; repository: Repository; recents: RecentWorkingCopy[] }
  | { ok: false; error: AppError; recents: RecentWorkingCopy[] };

function normalizeDirPath(path: string): string {
  const resolved = resolve(path);
  if (resolved === '/') return resolved;
  return resolved.replace(/\/+$/, '');
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
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
    title: 'Could not open working copy',
    message: error instanceof Error ? error.message : 'Unknown error',
  };
}

export async function openRepository(input: {
  path: string;
  svn: OpenRepositoryClient;
  settings: SettingsRepository;
  signal?: AbortSignal;
}): Promise<OpenRepositoryResult> {
  const absolutePath = normalizeDirPath(input.path);
  const current = await input.settings.load();

  if (!(await isDirectory(absolutePath))) {
    return {
      ok: false,
      error: missingWorkingCopyError(absolutePath),
      recents: current.recentWorkingCopies,
    };
  }

  try {
    const repository = await input.svn.validateWorkingCopy(absolutePath, input.signal);
    const saved = await input.settings.rememberWorkingCopy(repository.rootPath);
    return {
      ok: true,
      repository,
      recents: saved.recentWorkingCopies,
    };
  } catch (error) {
    return {
      ok: false,
      error: toAppError(error),
      recents: current.recentWorkingCopies,
    };
  }
}
