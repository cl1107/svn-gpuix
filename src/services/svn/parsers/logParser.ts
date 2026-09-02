import type { PathAction, RevisionChangedPath, SvnRevision } from '../../../domain/revision';
import { asRecordArray, isRecord, readRevision, readString, svnXmlParser } from './xml';

const ACTIONS = new Set<PathAction>(['A', 'M', 'D', 'R']);

export function parseLogXml(xml: string): SvnRevision[] {
  const parsed: unknown = svnXmlParser.parse(xml);
  if (!isRecord(parsed) || !('log' in parsed)) {
    throw new Error('svn log XML is missing <log>');
  }
  if (parsed.log === '' || parsed.log === undefined || parsed.log === null) return [];
  if (!isRecord(parsed.log)) {
    throw new Error('svn log XML is missing <log>');
  }

  const revisions: SvnRevision[] = [];
  for (const entry of asRecordArray(parsed.log.logentry)) {
    const revision = parseLogEntry(entry);
    if (revision) revisions.push(revision);
  }
  return revisions;
}

function parseLogEntry(entry: Record<string, unknown>): SvnRevision | null {
  const revision = readRevision(entry['@_revision']);
  if (revision === undefined) return null;

  const author = readString(entry.author);
  const date = readString(entry.date);
  const message = readMessage(entry.msg);
  const changedPaths = parseChangedPaths(entry.paths);

  const result: SvnRevision = {
    revision,
    message,
    changedPaths,
  };
  if (author) result.author = author;
  if (date) result.date = date;
  return result;
}

function readMessage(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (isRecord(value)) {
    const text = value['#text'];
    if (typeof text === 'string') return text;
  }
  return '';
}

function parseChangedPaths(value: unknown): RevisionChangedPath[] {
  if (!isRecord(value)) return [];
  const paths: RevisionChangedPath[] = [];
  for (const node of asRecordArray(value.path)) {
    const parsed = parseChangedPath(node);
    if (parsed) paths.push(parsed);
  }
  return paths;
}

function parseChangedPath(node: Record<string, unknown>): RevisionChangedPath | null {
  const actionRaw = readString(node['@_action']);
  if (!actionRaw || !ACTIONS.has(actionRaw as PathAction)) return null;
  const path = readString(node['#text']) ?? readString(node.path);
  if (!path) return null;

  const result: RevisionChangedPath = {
    path,
    action: actionRaw as PathAction,
  };
  const copyFromPath = readString(node['@_copyfrom-path']);
  const copyFromRevision = readRevision(node['@_copyfrom-rev']);
  if (copyFromPath) result.copyFromPath = copyFromPath;
  if (copyFromRevision !== undefined) result.copyFromRevision = copyFromRevision;
  return result;
}
