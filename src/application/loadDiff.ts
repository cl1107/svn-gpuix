import type { WorkingCopyChange } from '../domain/change';
import type { DiffResult } from '../domain/diff';

export interface DiffReader {
  getDiff(rootPath: string, path: string, signal?: AbortSignal): Promise<DiffResult>;
}

/** unversioned 不跑 svn diff；其余走 Client，并由调用方用 requestId 丢弃过期结果。 */
export async function loadFileDiff(input: {
  change: WorkingCopyChange;
  rootPath: string;
  svn: DiffReader;
  signal?: AbortSignal;
}): Promise<DiffResult> {
  if (input.change.status === 'unversioned') {
    return { kind: 'unversioned' };
  }
  return input.svn.getDiff(input.rootPath, input.change.path, input.signal);
}
