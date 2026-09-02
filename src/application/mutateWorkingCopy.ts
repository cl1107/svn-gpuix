import { needsForceDelete, type WorkingCopyChange } from '../domain/change';
import type { UpdateResult } from '../domain/operation';
import type { OperationManager } from './operationManager';

export interface WorkingCopyMutator {
  add(rootPath: string, paths: string[], signal?: AbortSignal): Promise<void>;
  delete(
    rootPath: string,
    paths: string[],
    options?: { force?: boolean; signal?: AbortSignal },
  ): Promise<void>;
  revert(rootPath: string, paths: string[], signal?: AbortSignal): Promise<void>;
  update(
    rootPath: string,
    options?: { signal?: AbortSignal; onStdout?: (chunk: string) => void },
  ): Promise<UpdateResult>;
}

export async function addPaths(input: {
  rootPath: string;
  paths: string[];
  svn: WorkingCopyMutator;
  operations: OperationManager;
  signal?: AbortSignal;
}): Promise<void> {
  if (input.paths.length === 0) return;
  await input.operations.runMutation('add', () => input.svn.add(input.rootPath, input.paths, input.signal));
}

export async function deletePaths(input: {
  rootPath: string;
  changes: WorkingCopyChange[];
  svn: WorkingCopyMutator;
  operations: OperationManager;
  signal?: AbortSignal;
}): Promise<void> {
  if (input.changes.length === 0) return;
  const forced = input.changes.filter(needsForceDelete).map((change) => change.path);
  const regular = input.changes.filter((change) => !needsForceDelete(change)).map((change) => change.path);
  await input.operations.runMutation('delete', async () => {
    if (regular.length > 0) {
      await input.svn.delete(input.rootPath, regular, { signal: input.signal });
    }
    if (forced.length > 0) {
      await input.svn.delete(input.rootPath, forced, { force: true, signal: input.signal });
    }
  });
}

export async function revertPaths(input: {
  rootPath: string;
  paths: string[];
  svn: WorkingCopyMutator;
  operations: OperationManager;
  signal?: AbortSignal;
}): Promise<void> {
  if (input.paths.length === 0) return;
  await input.operations.runMutation('revert', () =>
    input.svn.revert(input.rootPath, input.paths, input.signal),
  );
}

export async function updateWorkingCopyRoot(input: {
  rootPath: string;
  svn: WorkingCopyMutator;
  operations: OperationManager;
  signal?: AbortSignal;
  onStdout?: (chunk: string) => void;
}): Promise<UpdateResult> {
  return input.operations.runMutation('update', () =>
    input.svn.update(input.rootPath, { signal: input.signal, onStdout: input.onStdout }),
  );
}
