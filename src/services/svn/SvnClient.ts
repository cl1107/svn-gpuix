import type { WorkingCopyChange } from '../../domain/change';
import type { DiffResult } from '../../domain/diff';
import type { CommitResult, UpdateResult } from '../../domain/operation';
import type { Repository } from '../../domain/repository';
import type { SvnRevision } from '../../domain/revision';
import { addWorkingCopyPaths } from './add';
import { checkoutRepository } from './checkout';
import { CommandRunner } from './commandRunner';
import { commitWorkingCopy } from './commit';
import { deleteWorkingCopyPaths } from './delete';
import { readWorkingCopyDiff } from './diff';
import { readRepositoryInfo, readRemoteHeadRevision } from './info';
import { revertWorkingCopyPaths } from './revert';
import { readRevisionLog } from './log';
import { readIncomingRevisionCount, readWorkingCopyStatus } from './status';
import { updateWorkingCopy } from './update';

export class CliSvnClient {
  constructor(private readonly runner: CommandRunner) {}

  async getVersion(signal?: AbortSignal): Promise<string> {
    const result = await this.runner.run({
      argv: ['svn', '--version', '--quiet'],
      signal,
    });
    return result.stdout.trim();
  }

  async validateWorkingCopy(path: string, signal?: AbortSignal): Promise<Repository> {
    return readRepositoryInfo(this.runner, path, signal);
  }

  async getRemoteRevision(path: string, signal?: AbortSignal): Promise<number> {
    return readRemoteHeadRevision(this.runner, path, signal);
  }

  async getRemoteHeadRevision(path: string, signal?: AbortSignal): Promise<number> {
    return readRemoteHeadRevision(this.runner, path, signal);
  }

  async getIncomingRevisionCount(path: string, signal?: AbortSignal): Promise<number> {
    const repository = await readRepositoryInfo(this.runner, path, signal);
    return readIncomingRevisionCount(this.runner, {
      cwd: path,
      repositoryUrl: repository.repositoryUrl,
      repositoryRoot: repository.repositoryRoot,
      rootRevision: repository.revision,
      signal,
    });
  }

  async getStatus(path: string, signal?: AbortSignal): Promise<WorkingCopyChange[]> {
    return readWorkingCopyStatus(this.runner, path, signal);
  }

  async getDiff(rootPath: string, path: string, signal?: AbortSignal): Promise<DiffResult> {
    return readWorkingCopyDiff(this.runner, { cwd: rootPath, path, signal });
  }

  async commit(
    rootPath: string,
    paths: string[],
    message: string,
    signal?: AbortSignal,
  ): Promise<CommitResult> {
    return commitWorkingCopy(this.runner, { cwd: rootPath, paths, message, signal });
  }

  async add(rootPath: string, paths: string[], signal?: AbortSignal): Promise<void> {
    await addWorkingCopyPaths(this.runner, { cwd: rootPath, paths, signal });
  }

  async delete(
    rootPath: string,
    paths: string[],
    options?: { force?: boolean; signal?: AbortSignal },
  ): Promise<void> {
    await deleteWorkingCopyPaths(this.runner, {
      cwd: rootPath,
      paths,
      force: options?.force,
      signal: options?.signal,
    });
  }

  async revert(rootPath: string, paths: string[], signal?: AbortSignal): Promise<void> {
    await revertWorkingCopyPaths(this.runner, { cwd: rootPath, paths, signal });
  }

  async update(
    rootPath: string,
    options?: { signal?: AbortSignal; onStdout?: (chunk: string) => void },
  ): Promise<UpdateResult> {
    return updateWorkingCopy(this.runner, {
      cwd: rootPath,
      signal: options?.signal,
      onStdout: options?.onStdout,
    });
  }

  async checkout(input: {
    url: string;
    destination: string;
    signal?: AbortSignal;
    onStdout?: (chunk: string) => void;
  }): Promise<Repository> {
    return checkoutRepository(this.runner, input);
  }

  async getLog(
    rootPath: string,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<SvnRevision[]> {
    return readRevisionLog(this.runner, {
      cwd: rootPath,
      limit: options?.limit,
      signal: options?.signal,
    });
  }
}
