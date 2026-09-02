export interface Repository {
  rootPath: string;
  repositoryUrl: string;
  repositoryRoot: string;
  uuid?: string;
  revision: number;
}

export interface RecentWorkingCopy {
  path: string;
  lastOpenedAt: number;
}

export const MAX_RECENT_WORKING_COPIES = 10;

export function upsertRecent(
  recents: RecentWorkingCopy[],
  path: string,
  lastOpenedAt: number,
): RecentWorkingCopy[] {
  const next = recents.filter((item) => item.path !== path);
  return [{ path, lastOpenedAt }, ...next].slice(0, MAX_RECENT_WORKING_COPIES);
}
