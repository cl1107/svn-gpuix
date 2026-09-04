export type SvnChangeStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'unversioned'
  | 'missing'
  | 'replaced'
  | 'conflicted'
  | 'ignored'
  | 'external'
  | 'obstructed'
  | 'incomplete';

export interface WorkingCopyChange {
  path: string;
  absolutePath: string;
  nodeKind?: 'file' | 'dir';
  status: SvnChangeStatus;
  propertyStatus?: string;
  revision?: number;
}

const HIDDEN_STATUSES = new Set<SvnChangeStatus>(['ignored', 'external']);

const DEFAULT_CHECKED = new Set<SvnChangeStatus>(['modified', 'added', 'deleted', 'replaced']);

const COMMITTABLE = new Set<SvnChangeStatus>(['modified', 'added', 'deleted', 'replaced']);

const ADDABLE = new Set<SvnChangeStatus>(['unversioned']);

const REVERTABLE = new Set<SvnChangeStatus>([
  'modified',
  'added',
  'deleted',
  'replaced',
  'missing',
  'conflicted',
]);

const DELETABLE = new Set<SvnChangeStatus>([
  'modified',
  'added',
  'deleted',
  'replaced',
  'missing',
  'conflicted',
]);

export const STATUS_LETTER: Record<SvnChangeStatus, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  unversioned: '?',
  missing: '!',
  replaced: 'R',
  conflicted: 'C',
  ignored: 'I',
  external: 'X',
  obstructed: 'O',
  incomplete: '~',
};

export const STATUS_LABEL: Record<SvnChangeStatus, string> = {
  modified: 'Modified',
  added: 'Added',
  deleted: 'Deleted',
  unversioned: 'Unversioned',
  missing: 'Missing',
  replaced: 'Replaced',
  conflicted: 'Conflicted',
  ignored: 'Ignored',
  external: 'External',
  obstructed: 'Obstructed',
  incomplete: 'Incomplete',
};

export function isVisibleChange(change: WorkingCopyChange): boolean {
  return !HIDDEN_STATUSES.has(change.status);
}

export function visibleChanges(changes: WorkingCopyChange[]): WorkingCopyChange[] {
  return changes.filter(isVisibleChange);
}

export function defaultChecked(status: SvnChangeStatus): boolean {
  return DEFAULT_CHECKED.has(status);
}

export function isCommittable(change: WorkingCopyChange): boolean {
  return COMMITTABLE.has(change.status);
}

export function isAddable(change: WorkingCopyChange): boolean {
  return ADDABLE.has(change.status);
}

export function isRevertable(change: WorkingCopyChange): boolean {
  return REVERTABLE.has(change.status) && change.nodeKind !== 'dir';
}

export function isDeletable(change: WorkingCopyChange): boolean {
  return DELETABLE.has(change.status);
}

export function needsForceDelete(change: WorkingCopyChange): boolean {
  return change.status === 'missing';
}

export function selectedChanges(
  changes: WorkingCopyChange[],
  checkedPaths: ReadonlySet<string>,
): WorkingCopyChange[] {
  return changes.filter((change) => checkedPaths.has(change.path));
}

/** Deleted / missing 文件磁盘上已不在，Reveal 时打开父目录。 */
export function finderRevealTarget(change: WorkingCopyChange): string {
  if (change.status === 'deleted' || change.status === 'missing') {
    return parentAbsolutePath(change.absolutePath);
  }
  return change.absolutePath;
}

export function parentAbsolutePath(absolutePath: string): string {
  const trimmed = absolutePath.replace(/\/+$/, '');
  const index = trimmed.lastIndexOf('/');
  if (index <= 0) return '/';
  return trimmed.slice(0, index);
}

export function sortChanges(changes: WorkingCopyChange[]): WorkingCopyChange[] {
  return [...changes].sort((a, b) => {
    const dirA = dirName(a.path);
    const dirB = dirName(b.path);
    if (dirA !== dirB) return dirA.localeCompare(dirB);
    return fileName(a.path).localeCompare(fileName(b.path));
  });
}

export function reconcileCheckedPaths(input: {
  changes: WorkingCopyChange[];
  previousChecked: ReadonlySet<string>;
  previousPaths: ReadonlySet<string>;
}): Set<string> {
  const next = new Set<string>();
  for (const change of input.changes) {
    if (input.previousPaths.has(change.path)) {
      if (input.previousChecked.has(change.path)) next.add(change.path);
    } else if (defaultChecked(change.status)) {
      next.add(change.path);
    }
  }
  return next;
}

export function reconcileSelectedPath(
  changes: WorkingCopyChange[],
  previousSelected: string | null,
): string | null {
  if (previousSelected && changes.some((change) => change.path === previousSelected)) {
    return previousSelected;
  }
  return changes[0]?.path ?? null;
}

function dirName(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}

function fileName(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? path : path.slice(index + 1);
}
