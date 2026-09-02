import { DEFAULT_LOG_LIMIT, type SvnRevision } from '../domain/revision';

export interface HistoryReader {
  getLog(
    rootPath: string,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<SvnRevision[]>;
}

export async function loadRevisionHistory(input: {
  rootPath: string;
  svn: HistoryReader;
  limit?: number;
  signal?: AbortSignal;
}): Promise<SvnRevision[]> {
  return input.svn.getLog(input.rootPath, {
    limit: input.limit ?? DEFAULT_LOG_LIMIT,
    signal: input.signal,
  });
}
