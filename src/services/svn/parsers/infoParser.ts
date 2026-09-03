import type { Repository } from '../../../domain/repository';
import { asRecordArray, isRecord, readRevision, readString, svnXmlParser } from './xml';

export function parseInfoXml(xml: string, fallbackPath: string): Repository {
  const parsed: unknown = svnXmlParser.parse(xml);
  if (!isRecord(parsed) || !isRecord(parsed.info)) {
    throw new Error('svn info XML is missing <info>');
  }

  const entries = asRecordArray(parsed.info.entry);
  const entry = entries[0];
  if (!entry) {
    throw new Error('svn info XML is missing <entry>');
  }

  const repository = isRecord(entry.repository) ? entry.repository : undefined;
  const wcInfo = isRecord(entry['wc-info']) ? entry['wc-info'] : undefined;

  const repositoryUrl = readString(entry.url);
  const repositoryRoot = repository ? readString(repository.root) : undefined;
  const revision = readRevision(entry['@_revision']);
  const uuid = repository ? readString(repository.uuid) : undefined;
  const rootPath = (wcInfo ? readString(wcInfo['wcroot-abspath']) : undefined) ?? fallbackPath;

  if (!repositoryUrl || !repositoryRoot || revision === undefined) {
    throw new Error('svn info XML is missing url, repository root, or revision');
  }

  const result: Repository = {
    rootPath,
    repositoryUrl,
    repositoryRoot,
    revision,
  };
  if (uuid) result.uuid = uuid;
  return result;
}

export function parseRemoteRevision(xml: string): number {
  const parsed: unknown = svnXmlParser.parse(xml);
  if (!isRecord(parsed) || !isRecord(parsed.info)) {
    throw new Error('svn info XML is missing <info>');
  }

  const entries = asRecordArray(parsed.info.entry);
  const entry = entries[0];
  if (!entry) {
    throw new Error('svn info XML is missing <entry>');
  }

  const commit = isRecord(entry.commit) ? entry.commit : undefined;
  const revision = readRevision(entry['@_revision']) ?? (commit ? readRevision(commit['@_revision']) : undefined);
  if (revision === undefined) {
    throw new Error('svn info XML is missing revision');
  }

  return revision;
}
