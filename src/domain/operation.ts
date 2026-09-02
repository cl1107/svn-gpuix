export type MutationKind = 'checkout' | 'commit' | 'update' | 'revert' | 'add' | 'delete';

export class MutationBusyError extends Error {
  readonly kind: MutationKind;
  readonly active: MutationKind;

  constructor(active: MutationKind, kind: MutationKind) {
    super(`Cannot start ${kind} while ${active} is running`);
    this.name = 'MutationBusyError';
    this.kind = kind;
    this.active = active;
  }
}

export interface CommitResult {
  revision?: number;
  output: string;
}

export interface UpdateResult {
  revision?: number;
  output: string;
}

export function parseCommitRevision(output: string): number | undefined {
  const match = output.match(/Committed revision (\d+)\./);
  if (!match?.[1]) return undefined;
  return Number(match[1]);
}

export function parseUpdateRevision(output: string): number | undefined {
  const match = output.match(/Updated to revision (\d+)\.|At revision (\d+)\./);
  const value = match?.[1] ?? match?.[2];
  if (!value) return undefined;
  return Number(value);
}

export function lastOutputLine(output: string): string {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines[lines.length - 1] ?? '';
}

export function canCommit(input: {
  message: string;
  paths: readonly string[];
  mutating: boolean;
}): boolean {
  return input.message.trim().length > 0 && input.paths.length > 0 && !input.mutating;
}
