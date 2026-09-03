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

export function formatRevisionDate(iso?: string, timeZone?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(timeZone ? { timeZone } : {}),
  });
  const parts = formatter.formatToParts(date);
  let year = '';
  let month = '';
  let day = '';
  let hours = '';
  let minutes = '';
  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'day') day = part.value;
    else if (part.type === 'hour') hours = part.value;
    else if (part.type === 'minute') minutes = part.value;
  }
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
