import type { RepositoryState } from './repositoryStore';

export const selectPage = (state: RepositoryState) => state.page;
export const selectRepository = (state: RepositoryState) => state.repository;
export const selectChanges = (state: RepositoryState) => state.changes;
export const selectCheckedPaths = (state: RepositoryState) => state.checkedPaths;
export const selectSelectedPath = (state: RepositoryState) => state.selectedPath;
export const selectCommitMessage = (state: RepositoryState) => state.commitMessage;
export const selectHistory = (state: RepositoryState) => state.history;
export const selectSelectedRevision = (state: RepositoryState) => state.selectedRevision;
export const selectRefreshing = (state: RepositoryState) => state.refreshing;
export const selectHistoryLoading = (state: RepositoryState) => state.historyLoading;
export const selectStatusError = (state: RepositoryState) => state.statusError;
export const selectHistoryError = (state: RepositoryState) => state.historyError;
export const selectMutating = (state: RepositoryState) => state.mutating;
export const selectMutationError = (state: RepositoryState) => state.mutationError;
export const selectOperationLine = (state: RepositoryState) => state.operationLine;
