import type { RevisionDiffResult } from '../domain/diff';

export interface RevisionDiffReader {
  getRevisionDiff(
    rootPath: string,
    revision: number,
    signal?: AbortSignal,
  ): Promise<RevisionDiffResult>;
}

export async function loadRevisionDiff(input: {
  rootPath: string;
  revision: number;
  svn: RevisionDiffReader;
  signal?: AbortSignal;
}): Promise<RevisionDiffResult> {
  return input.svn.getRevisionDiff(input.rootPath, input.revision, input.signal);
}
