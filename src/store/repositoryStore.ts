import { createStore } from 'zustand/vanilla';
import { fixtureChanges, fixtureCheckedPaths, fixtureHistory } from '../design/fixtures';
import type { WorkingCopyChange } from '../domain/change';
import type { AppError } from '../domain/error';
import type { MutationKind } from '../domain/operation';
import type { Repository } from '../domain/repository';
import type { SvnRevision } from '../domain/revision';
import type { RepositoryPage } from '../features/repository/Sidebar';

export interface RefreshResult {
  repository: Repository;
  changes: WorkingCopyChange[];
  checkedPaths: Set<string>;
  selectedPath: string | null;
}

export interface RepositoryStoreState {
  page: RepositoryPage;
  repository: Repository | undefined;
  changes: WorkingCopyChange[];
  checkedPaths: Set<string>;
  selectedPath: string | null;
  commitMessage: string;
  history: SvnRevision[];
  selectedRevision: number | null;
  refreshing: boolean;
  historyLoading: boolean;
  statusError: AppError | null;
  historyError: AppError | null;
  mutating: MutationKind | null;
  mutationError: AppError | null;
  operationLine: string | null;
}

export interface RepositoryStoreActions {
  setPage: (page: RepositoryPage) => void;
  selectPath: (path: string | null) => void;
  selectRevision: (revision: number | null) => void;
  setCommitMessage: (message: string) => void;
  togglePath: (path: string) => void;
  toggleAll: (paths: string[]) => void;
  applyRefreshResult: (result: RefreshResult) => void;
  setRefreshing: (refreshing: boolean) => void;
  setStatusError: (error: AppError | null) => void;
  applyHistory: (revisions: SvnRevision[]) => void;
  setHistoryLoading: (loading: boolean) => void;
  setHistoryError: (error: AppError | null) => void;
  beginMutation: (kind: MutationKind) => void;
  endMutation: () => void;
  setMutationError: (error: AppError | null) => void;
  setOperationLine: (line: string | null) => void;
  resetWorkingCopy: (repository?: Repository) => void;
}

export type RepositoryState = RepositoryStoreState & RepositoryStoreActions;

export interface CreateRepositoryStoreInput {
  live: boolean;
  page?: RepositoryPage;
  repository?: Repository;
  initialCommitMessage?: string;
}

function initialState(input: CreateRepositoryStoreInput): RepositoryStoreState {
  const live = input.live;
  return {
    page: input.page ?? 'changes',
    repository: input.repository,
    changes: live ? [] : fixtureChanges,
    checkedPaths: new Set(live ? [] : fixtureCheckedPaths),
    selectedPath: live ? null : (fixtureChanges[0]?.path ?? null),
    commitMessage: live ? (input.initialCommitMessage ?? '') : 'Fix profile avatar fallback and API mapping',
    history: live ? [] : fixtureHistory,
    selectedRevision: live ? null : (fixtureHistory[0]?.revision ?? null),
    refreshing: live,
    historyLoading: false,
    statusError: null,
    historyError: null,
    mutating: null,
    mutationError: null,
    operationLine: null,
  };
}

export function createRepositoryStore(input: CreateRepositoryStoreInput) {
  return createStore<RepositoryState>()((set) => ({
    ...initialState(input),

    setPage: (page) => set({ page }),
    selectPath: (selectedPath) => set({ selectedPath }),
    selectRevision: (selectedRevision) => set({ selectedRevision }),
    setCommitMessage: (commitMessage) => set({ commitMessage }),

    togglePath: (path) =>
      set((state) => {
        const checkedPaths = new Set(state.checkedPaths);
        if (checkedPaths.has(path)) checkedPaths.delete(path);
        else checkedPaths.add(path);
        return { checkedPaths };
      }),

    toggleAll: (paths) =>
      set((state) => {
        const checkedPaths = new Set(state.checkedPaths);
        const allOn = paths.length > 0 && paths.every((path) => checkedPaths.has(path));
        for (const path of paths) {
          if (allOn) checkedPaths.delete(path);
          else checkedPaths.add(path);
        }
        return { checkedPaths };
      }),

    applyRefreshResult: (result) =>
      set({
        repository: result.repository,
        changes: result.changes,
        checkedPaths: new Set(result.checkedPaths),
        selectedPath: result.selectedPath,
        statusError: null,
      }),

    setRefreshing: (refreshing) => set({ refreshing }),
    setStatusError: (statusError) => set({ statusError }),

    applyHistory: (revisions) =>
      set((state) => {
        const selectedRevision =
          state.selectedRevision && revisions.some((item) => item.revision === state.selectedRevision)
            ? state.selectedRevision
            : (revisions[0]?.revision ?? null);
        return { history: revisions, selectedRevision, historyError: null };
      }),

    setHistoryLoading: (historyLoading) => set({ historyLoading }),
    setHistoryError: (historyError) => set({ historyError }),

    beginMutation: (kind) => set({ mutating: kind, mutationError: null }),
    endMutation: () => set({ mutating: null, operationLine: null }),
    setMutationError: (mutationError) => set({ mutationError }),
    setOperationLine: (operationLine) => set({ operationLine }),

    resetWorkingCopy: (repository) =>
      set({
        repository,
        changes: [],
        checkedPaths: new Set(),
        selectedPath: null,
        statusError: null,
        history: [],
        selectedRevision: null,
        historyError: null,
      }),
  }));
}

export type RepositoryStore = ReturnType<typeof createRepositoryStore>;
