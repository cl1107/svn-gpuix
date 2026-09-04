export type DiffResult =
  | {
      kind: 'text';
      patch: string;
    }
  | {
      kind: 'binary';
    }
  | {
      kind: 'unversioned';
    };

export type RevisionDiffResult = Extract<DiffResult, { kind: 'text' | 'binary' }>;

export function countPatchLines(patch: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) additions += 1;
    else if (line.startsWith('-')) deletions += 1;
  }
  return { additions, deletions };
}
