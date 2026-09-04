import { useTheme } from '../../app/ThemeContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand/react';
import { addShortcutListener } from '../../app/shortcuts';
import { font, layout } from '../../app/theme';
import type { CommitClient } from '../../application/commitChanges';
import { commitChanges } from '../../application/commitChanges';
import { toAppError } from '../../application/errors';
import { loadRevisionHistory, type HistoryReader } from '../../application/loadHistory';
import { loadFileDiff, type DiffReader } from '../../application/loadDiff';
import { loadRevisionDiff, type RevisionDiffReader } from '../../application/loadRevisionDiff';
import {
  addPaths,
  deletePaths,
  revertPaths,
  updateWorkingCopyRoot,
  type WorkingCopyMutator,
} from '../../application/mutateWorkingCopy';
import type { OperationManager } from '../../application/operationManager';
import { refreshWorkingCopy, type WorkingCopyReader } from '../../application/refreshRepository';
import type { PathOpener } from '../../services/platform/pathOpener';
import { Dialog } from '../../components/Dialog';
import { ErrorBanner } from '../../components/ErrorBanner';
import {
  fixtureChanges,
  fixtureCheckedPaths,
  fixtureHistory,
  fixturePatch,
} from '../../design/fixtures';
import {
  finderRevealTarget,
  isAddable,
  isCommittable,
  isDeletable,
  isRevertable,
  type WorkingCopyChange,
} from '../../domain/change';
import type { DiffResult, RevisionDiffResult } from '../../domain/diff';
import type { AppError } from '../../domain/error';
import { canCommit, lastOutputLine, type MutationKind } from '../../domain/operation';
import type { Repository } from '../../domain/repository';
import { composeSyncLabel } from '../../domain/sync';
import { CommandError } from '../../services/svn/commandRunner';
import { RepositoryStoreProvider } from '../../store/RepositoryStoreContext';
import { createRepositoryStore } from '../../store/repositoryStore';
import {
  selectChanges,
  selectCheckedPaths,
  selectMutating,
  selectOperationLine,
  selectPage,
  selectBehind,
  selectRepository,
  selectSelectedPath,
  selectSelectedRevision,
} from '../../store/selectors';
import { ChangesPanel } from '../changes/ChangesPanel';
import { DiffPanel, type DiffView } from '../changes/DiffPanel';
import { HistoryView, type RevisionDiffView } from '../history/HistoryView';
import type { RecentItem } from '../welcome/WelcomeScreen';
import type { RepositoryPage } from '../../domain/repositoryPage';
import { Sidebar } from './Sidebar';
import { WorkingCopyView } from './WorkingCopyView';

export type RepositorySvn = WorkingCopyReader &
  DiffReader &
  Partial<CommitClient & WorkingCopyMutator & HistoryReader & RevisionDiffReader>;

type ConfirmKind = 'revert' | 'delete';

export function RepositoryScreen({
  initialPage = 'changes',
  workingCopyName = 'frontend-web',
  workingCopyPath = '~/work/frontend-web',
  revision = 18427,
  svnVersion,
  repository,
  svn,
  operations,
  opener,
  initialCommitMessage,
  recents,
  noticeError,
  onSwitchWorkingCopy,
}: {
  initialPage?: RepositoryPage;
  workingCopyName?: string;
  workingCopyPath?: string;
  revision?: number;
  svnVersion?: string;
  repository?: Repository;
  svn?: RepositorySvn;
  operations?: OperationManager;
  opener?: PathOpener;
  initialCommitMessage?: string;
  recents?: RecentItem[];
  noticeError?: AppError | null;
  onSwitchWorkingCopy?: (path: string) => void;
}) {

  const theme = useTheme();
  const live = Boolean(repository && svn);
  const [store] = useState(() =>
    createRepositoryStore(
      live
        ? {
            page: initialPage,
            repository,
            commitMessage: initialCommitMessage ?? '',
            refreshing: true,
          }
        : {
            page: initialPage,
            repository:
              initialPage === 'working-copy'
                ? {
                    rootPath: workingCopyPath,
                    repositoryUrl: 'https://svn.example.com/repos/frontend-web/trunk',
                    repositoryRoot: 'https://svn.example.com/repos/frontend-web',
                    uuid: 'fixture-repository-uuid',
                    revision,
                  }
                : undefined,
            changes: fixtureChanges,
            checkedPaths: fixtureCheckedPaths,
            selectedPath: fixtureChanges[0]?.path ?? null,
            commitMessage: initialCommitMessage ?? 'Fix profile avatar fallback and API mapping',
            history: fixtureHistory,
            selectedRevision: fixtureHistory[0]?.revision ?? null,
          },
    ),
  );

  const page = useStore(store, selectPage);
  const liveRepo = useStore(store, selectRepository);
  const changes = useStore(store, selectChanges);
  const checkedPaths = useStore(store, selectCheckedPaths);
  const selectedPath = useStore(store, selectSelectedPath);
  const selectedRevision = useStore(store, selectSelectedRevision);
  const mutating = useStore(store, selectMutating);
  const operationLine = useStore(store, selectOperationLine);
  const behind = useStore(store, selectBehind);

  const [statusGeneration, setStatusGeneration] = useState(0);
  const [diffView, setDiffView] = useState<DiffView>({ state: 'idle' });
  const [revisionDiffView, setRevisionDiffView] = useState<RevisionDiffView>({ state: 'idle' });
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; targets: WorkingCopyChange[] } | null>(null);

  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const diffAbortRef = useRef<AbortController | null>(null);
  const diffRequestRef = useRef(0);
  const revisionDiffAbortRef = useRef<AbortController | null>(null);
  const revisionDiffRequestRef = useRef(0);
  const historyAbortRef = useRef<AbortController | null>(null);
  const historyGenRef = useRef(0);
  const diffCacheRef = useRef(new Map<string, DiffResult>());
  const revisionDiffCacheRef = useRef(new Map<number, RevisionDiffResult>());

  const rootPath = repository?.rootPath;
  const runRefresh = useCallback(
    async (forceChecked?: ReadonlySet<string>) => {
      if (!rootPath || !svn) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const id = ++generationRef.current;
      const snapshot = store.getState();
      store.getState().setRefreshing(true);
      try {
        const result = await refreshWorkingCopy({
          rootPath,
          svn,
          previousChecked: snapshot.checkedPaths,
          previousPaths: new Set(snapshot.changes.map((change) => change.path)),
          previousSelected: snapshot.selectedPath,
          forceChecked,
          signal: controller.signal,
        });
        if (id !== generationRef.current) return;
        store.getState().applyRefreshResult(result);
        diffCacheRef.current.clear();
        setStatusGeneration((value) => value + 1);
      } catch (error) {
        if (id !== generationRef.current) return;
        if (error instanceof CommandError && error.message === 'aborted') return;
        store.getState().setStatusError(toAppError(error, 'Could not refresh status'));
      } finally {
        if (id === generationRef.current) store.getState().setRefreshing(false);
      }
    },
    [rootPath, store, svn],
  );

  useEffect(() => {
    if (!live || !rootPath) return;
    store.getState().resetWorkingCopy(repository);
    setDiffView({ state: 'idle' });
    setRevisionDiffView({ state: 'idle' });
    diffCacheRef.current.clear();
    revisionDiffCacheRef.current.clear();
    void runRefresh();
    return () => {
      abortRef.current?.abort();
      diffAbortRef.current?.abort();
      revisionDiffAbortRef.current?.abort();
      historyAbortRef.current?.abort();
    };
  }, [live, rootPath, repository, runRefresh, store]);

  const runHistoryRefresh = useCallback(async () => {
    if (!rootPath || !svn?.getLog) return;
    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;
    const id = ++historyGenRef.current;
    store.getState().setHistoryLoading(true);
    try {
      const revisions = await loadRevisionHistory({
        rootPath,
        svn: svn as HistoryReader,
        signal: controller.signal,
      });
      if (id !== historyGenRef.current) return;
      store.getState().applyHistory(revisions);
    } catch (error) {
      if (id !== historyGenRef.current) return;
      if (error instanceof CommandError && error.message === 'aborted') return;
      store.getState().setHistoryError(toAppError(error, 'Could not load history'));
    } finally {
      if (id === historyGenRef.current) store.getState().setHistoryLoading(false);
    }
  }, [rootPath, store, svn]);

  useEffect(() => {
    if (!live || page !== 'history') return;
    void runHistoryRefresh();
    return () => {
      historyAbortRef.current?.abort();
    };
  }, [live, page, runHistoryRefresh]);

  useEffect(() => {
    revisionDiffAbortRef.current?.abort();
    const requestId = ++revisionDiffRequestRef.current;
    if (!live || page !== 'history' || !rootPath || !svn || selectedRevision === null) {
      setRevisionDiffView({ state: 'idle' });
      return;
    }

    const cached = revisionDiffCacheRef.current.get(selectedRevision);
    if (cached) {
      setRevisionDiffView({ state: 'ready', revision: selectedRevision, result: cached });
      return;
    }

    if (!svn.getRevisionDiff) {
      setRevisionDiffView({ state: 'idle' });
      return;
    }

    const getRevisionDiff = svn.getRevisionDiff.bind(svn);
    const reader: RevisionDiffReader = { getRevisionDiff };
    const controller = new AbortController();
    revisionDiffAbortRef.current = controller;
    setRevisionDiffView({ state: 'loading', revision: selectedRevision });

    void loadRevisionDiff({
      rootPath,
      revision: selectedRevision,
      svn: reader,
      signal: controller.signal,
    })
      .then((result) => {
        if (requestId !== revisionDiffRequestRef.current) return;
        revisionDiffCacheRef.current.set(selectedRevision, result);
        setRevisionDiffView({ state: 'ready', revision: selectedRevision, result });
      })
      .catch((error) => {
        if (requestId !== revisionDiffRequestRef.current) return;
        if (error instanceof CommandError && error.message === 'aborted') return;
        setRevisionDiffView({
          state: 'error',
          revision: selectedRevision,
          error: toAppError(error, 'Could not load revision diff'),
        });
      });

    return () => {
      controller.abort();
    };
  }, [live, page, rootPath, selectedRevision, svn]);

  const selectedChange = changes.find((change) => change.path === selectedPath) ?? null;

  useEffect(() => {
    if (!live || !rootPath || !svn) return;
    diffAbortRef.current?.abort();
    const requestId = ++diffRequestRef.current;
    if (!selectedChange) {
      setDiffView({ state: 'idle' });
      return;
    }

    const path = selectedChange.path;
    if (selectedChange.status === 'unversioned') {
      setDiffView({ state: 'ready', path, result: { kind: 'unversioned' } });
      return;
    }

    const cached = diffCacheRef.current.get(path);
    if (cached) {
      setDiffView({ state: 'ready', path, result: cached });
      return;
    }

    diffAbortRef.current?.abort();
    const controller = new AbortController();
    diffAbortRef.current = controller;
    setDiffView({ state: 'loading', path });

    void loadFileDiff({
      change: selectedChange,
      rootPath,
      svn,
      signal: controller.signal,
    })
      .then((result) => {
        if (requestId !== diffRequestRef.current) return;
        diffCacheRef.current.set(path, result);
        setDiffView({ state: 'ready', path, result });
      })
      .catch((error) => {
        if (requestId !== diffRequestRef.current) return;
        if (error instanceof CommandError && error.message === 'aborted') return;
        setDiffView({ state: 'error', path, error: toAppError(error, 'Could not load diff') });
      });

    return () => {
      controller.abort();
    };
  }, [live, rootPath, svn, selectedChange, statusGeneration]);

  const shownRevision = liveRepo?.revision ?? revision;
  const busy = mutating !== null;
  const syncLabel = mutating === 'update'
    ? operationLine || 'Updating…'
    : live
      ? composeSyncLabel({ localCount: changes.length, behind })
      : 'Up to date';

  const committablePaths = changes
    .filter((change) => checkedPaths.has(change.path) && isCommittable(change))
    .map((change) => change.path);
  const addable = (targets?: WorkingCopyChange[]) =>
    (targets ?? changes).filter(isAddable);
  const revertable = (targets?: WorkingCopyChange[]) =>
    (targets ?? changes.filter((change) => checkedPaths.has(change.path))).filter(isRevertable);
  const deletable = (targets?: WorkingCopyChange[]) =>
    (targets ?? changes.filter((change) => checkedPaths.has(change.path))).filter(isDeletable);
  const revealable = () => {
    const targets = selectedChange
      ? [selectedChange]
      : changes.filter((change) => checkedPaths.has(change.path));
    return uniquePaths(targets.map(finderRevealTarget));
  };

  const showWorkingCopyInFinder = () => {
    const target = rootPath || workingCopyPath;
    if (!opener || !target) return;
    void opener.openPath(target).catch((error) => {
      console.error('Failed to open working copy in Finder', error);
    });
  };

  const revealSelectedInFinder = () => {
    const targets = revealable();
    if (!opener || targets.length === 0) return;
    void opener.revealPaths(targets).catch((error) => {
      console.error('Failed to reveal path in Finder', error);
    });
  };

  const runMutation = async (kind: MutationKind, work: () => Promise<void>, forceChecked?: ReadonlySet<string>) => {
    if (!live || !rootPath || !svn || !operations) return;
    if (!store.getState().tryBeginMutation(kind, operations.running)) return;
    try {
      await work();
      await runRefresh(forceChecked);
    } catch (error) {
      store.getState().setMutationError(toAppError(error, `${kind} failed`));
    } finally {
      store.getState().endMutation();
    }
  };

  const runCommit = () => {
    if (!rootPath || !svn || !operations) return;
    const snapshot = store.getState();
    const message = snapshot.commitMessage;
    const paths = snapshot.changes
      .filter((change) => snapshot.checkedPaths.has(change.path) && isCommittable(change))
      .map((change) => change.path);
    if (
      !canCommit({
        message,
        paths,
        mutating: snapshot.mutating !== null || operations.running !== null,
      })
    ) {
      return;
    }
    const previousMessage = snapshot.commitMessage;
    const previousChecked = new Set(snapshot.checkedPaths);
    if (!store.getState().tryBeginMutation('commit', operations.running)) return;
    void (async () => {
      try {
        await commitChanges({
          rootPath,
          paths,
          message,
          svn: svn as CommitClient,
          operations,
        });
        store.getState().applyCommitSuccess();
        await runRefresh();
      } catch (error) {
        store.getState().restoreCommitDraft({ message: previousMessage, checkedPaths: previousChecked });
        store.getState().setMutationError(toAppError(error, 'Commit failed'));
      } finally {
        store.getState().endMutation();
      }
    })();
  };

  const requestConfirm = (kind: ConfirmKind, targets: WorkingCopyChange[]) => {
    if (store.getState().mutating !== null || operations?.running || targets.length === 0) return;
    setConfirm({ kind, targets });
  };

  const runConfirmed = () => {
    if (!confirm || !rootPath || !svn || !operations) return;
    const targets = confirm.targets;
    const kind = confirm.kind;
    setConfirm(null);
    if (kind === 'revert') {
      void runMutation('revert', () =>
        revertPaths({
          rootPath,
          paths: targets.map((change) => change.path),
          svn: svn as WorkingCopyMutator,
          operations,
        }),
      );
      return;
    }
    void runMutation('delete', () =>
      deletePaths({
        rootPath,
        changes: targets,
        svn: svn as WorkingCopyMutator,
        operations,
      }),
    );
  };

  const runUpdate = () => {
    if (!rootPath || !svn || !operations) return;
    void runMutation('update', async () => {
      let output = '';
      await updateWorkingCopyRoot({
        rootPath,
        svn: svn as WorkingCopyMutator,
        operations,
        onStdout: (chunk) => {
          output += chunk;
          store.getState().setOperationLine(lastOutputLine(output));
        },
      });
    });
  };

  const runCommitRef = useRef(runCommit);
  runCommitRef.current = runCommit;
  const runRefreshRef = useRef(runRefresh);
  runRefreshRef.current = runRefresh;
  const runHistoryRefreshRef = useRef(runHistoryRefresh);
  runHistoryRefreshRef.current = runHistoryRefresh;
  const pageRef = useRef(page);
  pageRef.current = page;
  useEffect(() => {
    return addShortcutListener((action) => {
      if (action === 'close-dialog') setConfirm(null);
      if (action === 'commit') runCommitRef.current();
      if (action === 'refresh') {
        if (pageRef.current === 'history') void runHistoryRefreshRef.current();
        else void runRefreshRef.current();
      }
    });
  }, []);

  const confirmTitle =
    confirm?.kind === 'revert'
      ? confirm.targets.length === 1
        ? `Revert "${confirm.targets[0]?.path}"?`
        : `Revert ${confirm.targets.length} files?`
      : confirm?.targets.length === 1
        ? `Delete "${confirm.targets[0]?.path}"?`
        : `Delete ${confirm?.targets.length ?? 0} files?`;
  const confirmBody =
    confirm?.kind === 'revert'
      ? 'Local modifications will be permanently discarded.'
      : 'The file will be removed from disk and scheduled for deletion in SVN.';

  return (
    <RepositoryStoreProvider store={store}>
    <div
      testId="repository-screen"
      style={{
        flexGrow: 1,
        minHeight: 0,
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: theme.bg,
      }}
    >
      <Sidebar
        workingCopyName={workingCopyName}
        workingCopyPath={workingCopyPath}
        revision={shownRevision}
        syncLabel={syncLabel}
        behind={behind}
        svnVersion={svnVersion}
        onUpdate={runUpdate}
        onAddUnversioned={() => {
          const targets = addable();
          if (!rootPath || !svn || !operations || targets.length === 0) return;
          void runMutation(
            'add',
            () =>
              addPaths({
                rootPath,
                paths: targets.map((change) => change.path),
                svn: svn as WorkingCopyMutator,
                operations,
              }),
            new Set(targets.map((change) => change.path)),
          );
        }}
        onRevertSelected={() => requestConfirm('revert', revertable())}
        onDeleteSelected={() => requestConfirm('delete', deletable())}
        onRevealInFinder={opener && revealable().length > 0 ? revealSelectedInFinder : undefined}
        recents={recents}
        currentPath={rootPath}
        onSwitchWorkingCopy={
          onSwitchWorkingCopy
            ? (path) => {
                if (store.getState().mutating !== null || operations?.running) return;
                onSwitchWorkingCopy(path);
              }
            : undefined
        }
      />
      {noticeError ? (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: layout.sidebarWidth + 16,
            right: 16,
          }}
        >
          <ErrorBanner error={noticeError} testId="switch-error" />
        </div>
      ) : null}
      {page === 'history' ? (
        <HistoryView
          onRefresh={() => void runHistoryRefresh()}
          diffView={live ? revisionDiffView : fixtureRevisionDiffView(selectedRevision)}
        />
      ) : page === 'working-copy' ? (
        <WorkingCopyView
          workingCopyName={workingCopyName}
          workingCopyPath={workingCopyPath}
          svnVersion={svnVersion}
          onRefresh={() => void runRefresh()}
          onUpdate={runUpdate}
          onShowInFinder={opener && (rootPath || workingCopyPath) ? showWorkingCopyInFinder : undefined}
        />
      ) : (
        <>
          <ChangesPanel
            onCommit={runCommit}
            onRefresh={() => void runRefresh()}
          />
          <DiffPanel
            change={selectedChange}
            view={live ? diffView : fixtureDiffView(selectedChange)}
            mutating={busy}
            onAdd={
              selectedChange && isAddable(selectedChange)
                ? () => {
                    if (!rootPath || !svn || !operations) return;
                    void runMutation(
                      'add',
                      () =>
                        addPaths({
                          rootPath,
                          paths: [selectedChange.path],
                          svn: svn as WorkingCopyMutator,
                          operations,
                        }),
                      new Set([selectedChange.path]),
                    );
                  }
                : undefined
            }
            onRevert={
              selectedChange && isRevertable(selectedChange)
                ? () => requestConfirm('revert', [selectedChange])
                : undefined
            }
            onDelete={
              selectedChange && isDeletable(selectedChange)
                ? () => requestConfirm('delete', [selectedChange])
                : undefined
            }
          />
        </>
      )}
      {confirm ? (
        <Dialog
          title={confirmTitle}
          body={confirmBody}
          confirmLabel={confirm.kind === 'revert' ? 'Revert' : 'Delete'}
          confirmVariant="danger"
          testId={`${confirm.kind}-confirm`}
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirmed}
        />
      ) : null}
    </div>
    </RepositoryStoreProvider>
  );
}

function fixtureDiffView(change: WorkingCopyChange | null): DiffView {
  if (!change) return { state: 'idle' };
  if (change.status === 'unversioned') {
    return { state: 'ready', path: change.path, result: { kind: 'unversioned' } };
  }
  return { state: 'ready', path: change.path, result: { kind: 'text', patch: fixturePatch } };
}

function fixtureRevisionDiffView(revision: number | null): RevisionDiffView {
  if (revision === null) return { state: 'idle' };
  return { state: 'ready', revision, result: { kind: 'text', patch: fixturePatch } };
}

function uniquePaths(paths: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of paths) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}
