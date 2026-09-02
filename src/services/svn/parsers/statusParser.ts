import { isAbsolute, join, relative } from 'node:path';
import type { SvnChangeStatus, WorkingCopyChange } from '../../../domain/change';
import { asRecordArray, isRecord, readRevision, readString, svnXmlParser } from './xml';

const ITEM_STATUS: Record<string, SvnChangeStatus> = {
  modified: 'modified',
  added: 'added',
  deleted: 'deleted',
  unversioned: 'unversioned',
  missing: 'missing',
  replaced: 'replaced',
  conflicted: 'conflicted',
  ignored: 'ignored',
  external: 'external',
  obstructed: 'obstructed',
  incomplete: 'incomplete',
};

export function parseStatusXml(xml: string, rootPath: string): WorkingCopyChange[] {
  const parsed: unknown = svnXmlParser.parse(xml);
  if (!isRecord(parsed) || !isRecord(parsed.status)) {
    throw new Error('svn status XML is missing <status>');
  }

  const changes: WorkingCopyChange[] = [];
  for (const target of asRecordArray(parsed.status.target)) {
    for (const entry of asRecordArray(target.entry)) {
      const change = parseEntry(entry, rootPath);
      if (change) changes.push(change);
    }
  }
  return changes;
}

function parseEntry(entry: Record<string, unknown>, rootPath: string): WorkingCopyChange | null {
  const rawPath = readString(entry['@_path']);
  if (!rawPath) return null;

  const wcStatus = asRecordArray(entry['wc-status'])[0];
  if (!wcStatus) return null;

  const item = readString(wcStatus['@_item']) ?? 'none';
  const props = readString(wcStatus['@_props']);
  const status = mapStatus(item, props);
  if (!status) return null;

  const path = toRelativePath(rawPath, rootPath);
  if (path === '.' || path === '') return null;

  const nodeKind = parseNodeKind(readString(entry['@_kind']) ?? readString(wcStatus['@_item']));
  const revision = readRevision(wcStatus['@_revision']);

  const change: WorkingCopyChange = {
    path,
    absolutePath: isAbsolute(path) ? path : join(rootPath, path),
    status,
  };
  if (nodeKind) change.nodeKind = nodeKind;
  if (props && props !== 'none') change.propertyStatus = props;
  if (revision !== undefined) change.revision = revision;
  return change;
}

function mapStatus(item: string, props: string | undefined): SvnChangeStatus | null {
  const mapped = ITEM_STATUS[item];
  if (mapped) return mapped;
  if ((item === 'normal' || item === 'none') && props === 'modified') return 'modified';
  return null;
}

function parseNodeKind(value: string | undefined): 'file' | 'dir' | undefined {
  if (value === 'file' || value === 'dir') return value;
  return undefined;
}

function toRelativePath(path: string, rootPath: string): string {
  if (path === '.' || path === rootPath) return '.';
  if (isAbsolute(path)) {
    const rel = relative(rootPath, path);
    if (!rel || rel.startsWith('..')) return path;
    return rel;
  }
  return path.replace(/^\.\//, '');
}
