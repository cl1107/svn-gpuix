import { useMemo, useState } from 'react';
import { Icon } from '../../app/icons';
import { font, layout, theme } from '../../app/theme';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { ErrorBanner } from '../../components/ErrorBanner';
import { isCommittable } from '../../domain/change';
import { canCommit as commitReady } from '../../domain/operation';
import {
  selectChanges,
  selectCheckedPaths,
  selectBusy,
  selectCommitMessage,
  selectCommitting,
  selectMutationError,
  selectRefreshing,
  selectSelectedPath,
  selectStatusError,
} from '../../store/selectors';
import { useRepositoryStore } from '../../store/RepositoryStoreContext';
import { ChangeRow } from './ChangeRow';

export function ChangesPanel({
  onCommit,
  onRefresh,
}: {
  onCommit: () => void;
  onRefresh: () => void;
}) {
  const changes = useRepositoryStore(selectChanges);
  const checkedPaths = useRepositoryStore(selectCheckedPaths);
  const selectedPath = useRepositoryStore(selectSelectedPath);
  const refreshing = useRepositoryStore(selectRefreshing);
  const mutationError = useRepositoryStore(selectMutationError);
  const statusError = useRepositoryStore(selectStatusError);
  const onSelect = useRepositoryStore((state) => state.selectPath);
  const onToggle = useRepositoryStore((state) => state.togglePath);
  const onToggleAll = useRepositoryStore((state) => state.toggleAll);
  const error = mutationError ?? statusError;
  const loading = refreshing && changes.length === 0;
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!query) return changes;
    return changes.filter((change) => change.path.toLowerCase().includes(query));
  }, [changes, query]);

  const selectedCount = changes.filter((change) => checkedPaths.has(change.path)).length;
  const visibleChecked = visible.filter((change) => checkedPaths.has(change.path)).length;
  const allVisibleChecked = visible.length > 0 && visibleChecked === visible.length;

  return (
    <div
      testId="changes-panel"
      style={{
        width: layout.changesWidth,
        flexShrink: 0,
        height: '100%',
        backgroundColor: theme.panel,
        borderRightWidth: 1,
        borderColor: theme.border,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: 20, paddingBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <text style={{ color: theme.text, fontSize: 20, fontFamily: font.ui, fontWeight: 600 }}>Changes</text>
            <text testId="file-count" style={{ color: theme.textMuted, fontSize: 11, fontFamily: font.ui }}>
              {`${changes.length} ${changes.length === 1 ? 'file' : 'files'}`}
            </text>
          </div>
          <Button
            label={refreshing ? 'Refreshing' : 'Refresh'}
            variant="secondary"
            size="sm"
            disabled={refreshing}
            onClick={onRefresh}
            testId="refresh-button"
          />
        </div>

        <div
          style={{
            height: 36,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.bg,
            paddingLeft: 12,
            paddingRight: 12,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon name="search" size={14} color={theme.textSubtle} />
          <input
            testId="changes-filter"
            value={filter}
            placeholder="Filter changed files"
            onChange={(event) => setFilter(event.value ?? '')}
            style={{
              flexGrow: 1,
              minWidth: 0,
              height: 34,
              color: theme.text,
              fontSize: 12,
              backgroundColor: theme.bg,
            }}
          />
        </div>

        <div
          testId="select-all"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: theme.panel,
          }}
        >
          <Checkbox
            checked={allVisibleChecked}
            testId="select-all-check"
            onClick={() => onToggleAll(visible.map((change) => change.path))}
          />
          <div
            onClick={() => onToggleAll(visible.map((change) => change.path))}
            style={{ flexGrow: 1, cursor: 'pointer', pointerEvents: 'auto' }}
          >
            <text style={{ color: theme.textMuted, fontSize: 11, fontFamily: font.ui }}>Select all</text>
          </div>
          <text testId="selected-count" style={{ color: theme.accent, fontSize: 11, fontFamily: font.ui }}>
            {`${selectedCount} selected`}
          </text>
        </div>
      </div>

      <div style={{ height: 1, marginLeft: 20, marginRight: 20, backgroundColor: theme.border, flexShrink: 0 }} />

      {error ? (
        <div style={{ padding: 20 }}>
          <ErrorBanner error={error} testId="status-error" />
        </div>
      ) : null}

      {loading && changes.length === 0 ? (
        <div style={{ padding: 20 }}>
          <text testId="status-loading" style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>
            Loading status…
          </text>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ padding: 20 }}>
          <text testId="changes-empty" style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>
            {changes.length === 0 ? 'No changed files' : 'No files match this filter'}
          </text>
        </div>
      ) : (
        <virtual-list estimatedItemHeight={layout.fileRowHeight} style={{ flexGrow: 1, minHeight: 0, width: '100%' }}>
          {visible.map((change) => (
            <ChangeRow
              key={change.path}
              change={change}
              active={change.path === selectedPath}
              checked={checkedPaths.has(change.path)}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </virtual-list>
      )}

      <CommitComposer onCommit={onCommit} />
    </div>
  );
}

function CommitComposer({ onCommit }: { onCommit: () => void }) {
  const changes = useRepositoryStore(selectChanges);
  const checkedPaths = useRepositoryStore(selectCheckedPaths);
  const commitMessage = useRepositoryStore(selectCommitMessage);
  const busy = useRepositoryStore(selectBusy);
  const committing = useRepositoryStore(selectCommitting);
  const onCommitMessage = useRepositoryStore((state) => state.setCommitMessage);
  const committablePaths = changes
    .filter((change) => checkedPaths.has(change.path) && isCommittable(change))
    .map((change) => change.path);
  const canCommit = commitReady({
    message: commitMessage,
    paths: committablePaths,
    mutating: busy,
  });
  return (
    <div
      style={{
        borderTopWidth: 1,
        borderColor: theme.border,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <text style={{ color: theme.text, fontSize: 13, fontFamily: font.ui, fontWeight: 600 }}>Commit</text>
      <textarea
        testId="commit-message"
        value={commitMessage}
        placeholder="Commit message…"
        onChange={(event) => onCommitMessage(event.value ?? '')}
        onKeyDown={(event) => {
          if (event.key?.toLowerCase() === 'enter' && event.modifiers?.cmd) onCommit();
        }}
        style={{
          height: 120,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.bg,
          color: theme.text,
          fontSize: 13,
        }}
      />
      <Button
        label={
          committing
            ? 'Committing…'
            : `Commit ${committablePaths.length} ${committablePaths.length === 1 ? 'file' : 'files'}`
        }
        size="lg"
        grow
        disabled={!canCommit}
        onClick={onCommit}
        testId="commit-button"
      />
      <text style={{ color: theme.textSubtle, fontSize: 10, fontFamily: font.ui }}>
        Commits to current working copy only · ⌘↵
      </text>
    </div>
  );
}
