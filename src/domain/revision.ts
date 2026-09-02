export type PathAction = 'A' | 'M' | 'D' | 'R';

export interface RevisionChangedPath {
  path: string;
  action: PathAction;
  copyFromPath?: string;
  copyFromRevision?: number;
}

export interface SvnRevision {
  revision: number;
  author?: string;
  date?: string;
  message: string;
  changedPaths: RevisionChangedPath[];
}

export const DEFAULT_LOG_LIMIT = 100;

export function formatRevisionDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  if (hours === '00' && minutes === '00' && !iso.includes('T')) return `${year}-${month}-${day}`;
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function authorInitial(author?: string): string {
  const trimmed = author?.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1).toUpperCase();
}

export function filterRevisions(revisions: SvnRevision[], query: string): SvnRevision[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return revisions;
  return revisions.filter((revision) => {
    if (`r${revision.revision}`.includes(needle) || String(revision.revision).includes(needle)) return true;
    if (revision.author?.toLowerCase().includes(needle)) return true;
    if (revision.message.toLowerCase().includes(needle)) return true;
    return revision.changedPaths.some((path) => path.path.toLowerCase().includes(needle));
  });
}
