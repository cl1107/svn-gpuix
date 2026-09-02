import { canCommit, type CommitResult } from '../domain/operation';
import type { OperationManager } from './operationManager';

export interface CommitClient {
  commit(rootPath: string, paths: string[], message: string, signal?: AbortSignal): Promise<CommitResult>;
}

export async function commitChanges(input: {
  rootPath: string;
  paths: string[];
  message: string;
  svn: CommitClient;
  operations: OperationManager;
  signal?: AbortSignal;
}): Promise<CommitResult> {
  const message = input.message.trim();
  if (!canCommit({ message, paths: input.paths, mutating: false })) {
    throw new Error('Commit requires a message and at least one committable path');
  }
  return input.operations.runMutation('commit', () =>
    input.svn.commit(input.rootPath, input.paths, message, input.signal),
  );
}
