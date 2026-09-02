import { useCallback, useEffect, useRef, useState } from 'react';
import { addShortcutListener } from '../../app/shortcuts';
import { font, layout, theme } from '../../app/theme';
import type { CommitClient } from '../../application/commitChanges';
import { commitChanges } from '../../application/commitChanges';
import { toAppError } from '../../application/errors';
import { loadRevisionHistory, type HistoryReader } from '../../application/loadHistory';
import { loadFileDiff, type DiffReader } from '../../application/loadDiff';
import {
  addPaths,
  deletePaths,
  revertPaths,
  updateWorkingCopyRoot,
  type WorkingCopyMutator,
} from '../../application/mutateWorkingCopy';
import type { OperationManager } from '../../application/operationManager';
import { refreshWorkingCopy, type WorkingCopyReader } from '../../application/refreshRepository';
import { Dialog } from '../../components/Dialog';
import { ErrorBanner } from '../../components/ErrorBanner';
import {
  fixtureChanges,
  fixtureCheckedPaths,
  fixtureHistory,
  fixturePatch,
} from '../../design/fixtures';
import {
  isAddable,
  isCommittable,
  isDeletable,
  isRevertable,
  type WorkingCopyChange,
} from '../../domain/change';
import type { DiffResult } from '../../domain/diff';
import type { AppError } from '../../domain/error';
import { canCommit, lastOutputLine, type MutationKind } from '../../domain/operation';
import type { Repository } from '../../domain/repository';
import type { SvnRevision } from '../../domain/revision';
import { CommandError } from '../../services/svn/commandRunner';
import { ChangesPanel } from '../changes/ChangesPanel';
import { DiffPanel, type DiffView } from '../changes/DiffPanel';
import { HistoryView } from '../history/HistoryView';
import type { RecentItem } from '../welcome/WelcomeScreen';
import { Sidebar, type RepositoryPage } from './Sidebar';

export type RepositorySvn = WorkingCopyReader &
  DiffReader &
  Partial<CommitClient & WorkingCopyMutator & HistoryReader>;

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
  initialCommitMessage?: string;
  recents?: RecentItem[];
  noticeError?: AppError | null;
  onSwitchWorkingCopy?: (path: string) => void;
}) {
  const live = Boolean(repository && svn);
  const [page, setPage] = useState<RepositoryPage>(initialPage);
  const [liveRepo, setLiveRepo] = useState<Repository | undefined>(repository);
  const [changes, setChanges] = useState<WorkingCopyChange[]>(live ? [] : fixtureChanges);
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(
    () => new Set(live ? [] : fixtureCheckedPaths),
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(
    live ? null : (fixtureChanges[0]?.path ?? null),
  );
  const [commitMessage, setCommitMessage] = useState(
    live ? (initialCommitMessage ?? '') : 'Fix profile avatar fallback and API mapping',
  );
  const [history, setHistory] = useState<SvnRevision[]>(live ? [] : fixtureHistory);
  const [selectedRevision, setSelectedRevision] = useState<number | null>(
    live ? null : (fixtureHistory[0]?.revision ?? null),
  );
  const [historyError, setHistoryError] = useState<AppError | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusError, setStatusError] = useState<AppError | null>(null);
  const [refreshing, setRefreshing] = useState(live);
  const [statusGeneration, setStatusGeneration] = useState(0);
  const [diffView, setDiffView] = useState<DiffView>({ state: 'idle' });
  const [mutating, setMutating] = useState<MutationKind | null>(null);
  const [mutationError, setMutationError] = useState<AppError | null>(null);
  const [operationLine, setOperationLine] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; targets: WorkingCopyChange[] } | null>(null);

  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const diffAbortRef = useRef<AbortController | null>(null);
  const diffRequestRef = useRef(0);
  const historyAbortRef = useRef<AbortController | null>(null);
  const historyGenRef = useRef(0);
  const diffCacheRef = useRef(new Map<string, DiffResult>());
  const checkedRef = useRef(checkedPaths);
  const changesRef = useRef(changes);
  const selectedRef = useRef(selectedPath);
  checkedRef.current = checkedPaths;
  changesRef.current = changes;
  selectedRef.current = selectedPath;

  const rootPath = repository?.rootPath;
  const runRefresh = useCallback(
    async (forceChecked?: ReadonlySet<string>) => {
      if (!rootPath || !svn) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const id = ++generationRef.current;
      setRefreshing(true);
      try {
        const result = await refreshWorkingCopy({
          rootPath,
          svn,
          previousChecked: checkedRef.current,
          previousPaths: new Set(changesRef.current.map((change) => change.path)),
          previousSelected: selectedRef.current,
          forceChecked,
          signal: controller.signal,
        });
        if (id !== generationRef.current) return;
        setLiveRepo(result.repository);
        setChanges(result.changes);
        setCheckedPaths(result.checkedPaths);
        setSelectedPath(result.selectedPath);
        setStatusError(null);
        diffCacheRef.current.clear();
        setStatusGeneration((value) => value + 1);
      } catch (error) {
        if (id !== generationRef.current) return;
        if (error instanceof CommandError && error.message === 'aborted') return;
        setStatusError(toAppError(error, 'Could not refresh status'));
      } finally {
        if (id === generationRef.current) setRefreshing(false);
      }
    },
    [rootPath, svn],
  );

  useEffect(() => {
    if (!live || !rootPath) return;
    checkedRef.current = new Set();
    changesRef.current = [];
    selectedRef.current = null;
    setLiveRepo(repository);
    setChanges([]);
    setCheckedPaths(new Set());
    setSelectedPath(null);
    setStatusError(null);
    setDiffView({ state: 'idle' });
    setHistory([]);
    setSelectedRevision(null);
    setHistoryError(null);
    diffCacheRef.current.clear();
    void runRefresh();
    return () => {
      abortRef.current?.abort();
      diffAbortRef.current?.abort();
      historyAbortRef.current?.abort();
    };
  }, [live, rootPath, repository, runRefresh]);

  const runHistoryRefresh = useCallback(async () => {
    if (!rootPath || !svn?.getLog) return;
    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;
    const id = ++historyGenRef.current;
    setHistoryLoading(true);
    try {
      const revisions = await loadRevisionHistory({
        rootPath,
        svn: svn as HistoryReader,
        signal: controller.signal,
      });
      if (id !== historyGenRef.current) return;
      setHistory(revisions);
      setSelectedRevision((previous) => {
        if (previous && revisions.some((item) => item.revision === previous)) return previous;
        return revisions[0]?.revision ?? null;
      });
      setHistoryError(null);
    } catch (error) {
      if (id !== historyGenRef.current) return;
      if (error instanceof CommandError && error.message === 'aborted') return;
      setHistoryError(toAppError(error, 'Could not load history'));
    } finally {
      if (id === historyGenRef.current) setHistoryLoading(false);
    }
  }, [rootPath, svn]);

  useEffect(() => {
    if (!live || page !== 'history') return;
    void runHistoryRefresh();
    return () => {
      historyAbortRef.current?.abort();
    };
  }, [live, page, runHistoryRefresh]);

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

  const selectedRev = history.find((rev) => rev.revision === selectedRevision) ?? null;
  const shownRevision = liveRepo?.revision ?? revision;
  const busy = mutating !== null;
  const syncLabel = mutating === 'update'
    ? operationLine || 'Updating…'
    : live
      ? changes.length === 0
        ? 'Up to date'
        : `${changes.length} local ${changes.length === 1 ? 'change' : 'changes'}`
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

  const runMutation = async (kind: MutationKind, work: () => Promise<void>, forceChecked?: ReadonlySet<string>) => {
    if (!live || !rootPath || !svn || !operations || busy) return;
    setMutating(kind);
    setMutationError(null);
    try {
      await work();
      await runRefresh(forceChecked);
    } catch (error) {
      setMutationError(toAppError(error, `${kind} failed`));
    } finally {
      setMutating(null);
      setOperationLine(null);
    }
  };

  const runCommit = () => {
    if (!rootPath || !svn || !operations) return;
    const message = commitMessage;
    const paths = committablePaths;
    if (!canCommit({ message, paths, mutating: busy })) return;
    const previousMessage = commitMessage;
    const previousChecked = new Set(checkedPaths);
    void (async () => {
      setMutating('commit');
      setMutationError(null);
      try {
        await commitChanges({
          rootPath,
          paths,
          message,
          svn: svn as CommitClient,
          operations,
        });
        setCommitMessage('');
        setCheckedPaths(new Set());
        checkedRef.current = new Set();
        await runRefresh();
      } catch (error) {
        setCommitMessage(previousMessage);
        setCheckedPaths(previousChecked);
        setMutationError(toAppError(error, 'Commit failed'));
      } finally {
        setMutating(null);
      }
    })();
  };

  const requestConfirm = (kind: ConfirmKind, targets: WorkingCopyChange[]) => {
    if (busy || targets.length === 0) return;
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

  const runCommitRef = useRef(runCommit);
  runCommitRef.current = runCommit;
  useEffect(() => {
    return addShortcutListener((action) => {
      if (action === 'close-dialog') setConfirm(null);
      if (action === 'commit') runCommitRef.current();
    });
  }, []);

  const togglePath = (path: string) => {
    setCheckedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleAll = (paths: string[]) => {
    setCheckedPaths((prev) => {
      const next = new Set(prev);
      const allOn = paths.length > 0 && paths.every((path) => next.has(path));
      for (const path of paths) {
        if (allOn) next.delete(path);
        else next.add(path);
      }
      return next;
    });
  };

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
        page={page}
        workingCopyName={workingCopyName}
        workingCopyPath={workingCopyPath}
        revision={shownRevision}
        syncLabel={syncLabel}
        changeCount={changes.length}
        svnVersion={svnVersion}
        mutating={busy}
        updating={mutating === 'update'}
        onNavigate={setPage}
        onUpdate={() => {
          if (!rootPath || !svn || !operations) return;
          void runMutation('update', async () => {
            let output = '';
            await updateWorkingCopyRoot({
              rootPath,
              svn: svn as WorkingCopyMutator,
              operations,
              onStdout: (chunk) => {
                output += chunk;
                setOperationLine(lastOutputLine(output));
              },
            });
          });
        }}
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
        recents={recents}
        currentPath={rootPath}
        onSwitchWorkingCopy={onSwitchWorkingCopy}
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
          revisions={history}
          selected={selectedRev}
          loading={live && historyLoading && history.length === 0}
          error={historyError}
          refreshing={historyLoading}
          repositoryUrl={liveRepo?.repositoryUrl}
          onSelect={setSelectedRevision}
          onRefresh={() => void runHistoryRefresh()}
        />
      ) : page === 'working-copy' ? (
        <div style={{ flexGrow: 1, padding: 24 }}>
          <text style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>
            Working Copy details coming in a later phase.
          </text>
        </div>
      ) : (
        <>
          <ChangesPanel
            changes={changes}
            checkedPaths={checkedPaths}
            selectedPath={selectedPath}
            commitMessage={commitMessage}
            loading={live && refreshing && changes.length === 0}
            error={mutationError ?? statusError}
            refreshing={refreshing}
            mutating={busy}
            committing={mutating === 'commit'}
            onSelect={setSelectedPath}
            onToggle={togglePath}
            onToggleAll={toggleAll}
            onCommitMessage={setCommitMessage}
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
  );
}

function fixtureDiffView(change: WorkingCopyChange | null): DiffView {
  if (!change) return { state: 'idle' };
  if (change.status === 'unversioned') {
    return { state: 'ready', path: change.path, result: { kind: 'unversioned' } };
  }
  return { state: 'ready', path: change.path, result: { kind: 'text', patch: fixturePatch } };
}


