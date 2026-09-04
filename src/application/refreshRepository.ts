import {
  reconcileCheckedPaths,
  reconcileSelectedPath,
  sortChanges,
  visibleChanges,
  type WorkingCopyChange,
} from '../domain/change';
import type { Repository } from '../domain/repository';

export interface WorkingCopyReader {
  validateWorkingCopy(path: string, signal?: AbortSignal): Promise<Repository>;
  getStatus(path: string, signal?: AbortSignal): Promise<WorkingCopyChange[]>;
  getIncomingRevisionCount?(path: string, signal?: AbortSignal): Promise<number>;
}

export interface RefreshWorkingCopyResult {
  repository: Repository;
  changes: WorkingCopyChange[];
  checkedPaths: Set<string>;
  selectedPath: string | null;
  behind?: number;
}

export async function refreshWorkingCopy(input: {
  rootPath: string;
  svn: WorkingCopyReader;
  previousChecked: ReadonlySet<string>;
  previousPaths: ReadonlySet<string>;
  previousSelected: string | null;
  forceChecked?: ReadonlySet<string>;
  signal?: AbortSignal;
}): Promise<RefreshWorkingCopyResult> {
  const fetchBehind = async (): Promise<number | undefined> => {
    const fn = input.svn.getIncomingRevisionCount?.bind(input.svn);
    if (!fn) return undefined;
    try {
      return await fn(input.rootPath, input.signal);
    } catch {
      return undefined;
    }
  };

  const [repository, raw, behind] = await Promise.all([
    input.svn.validateWorkingCopy(input.rootPath, input.signal),
    input.svn.getStatus(input.rootPath, input.signal),
    fetchBehind(),
  ]);
  const changes = sortChanges(visibleChanges(raw));
  const checkedPaths = reconcileCheckedPaths({
    changes,
    previousChecked: input.previousChecked,
    previousPaths: input.previousPaths,
  });
  if (input.forceChecked) {
    for (const path of input.forceChecked) {
      if (changes.some((change) => change.path === path)) checkedPaths.add(path);
    }
  }
  return {
    repository,
    changes,
    checkedPaths,
    selectedPath: reconcileSelectedPath(changes, input.previousSelected),
    behind,
  };
}
