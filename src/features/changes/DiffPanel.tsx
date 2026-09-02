import { useTheme } from '../../app/ThemeContext';
import { Icon } from '../../app/icons';
import { font } from '../../app/theme';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { STATUS_LABEL, type WorkingCopyChange } from '../../domain/change';
import { countPatchLines, type DiffResult } from '../../domain/diff';
import type { AppError } from '../../domain/error';

export type DiffView =
  | { state: 'idle' }
  | { state: 'loading'; path: string }
  | { state: 'ready'; path: string; result: DiffResult }
  | { state: 'error'; path: string; error: AppError };

export function DiffPanel({
  change,
  view,
  mutating,
  onAdd,
  onRevert,
  onDelete,
}: {
  change: WorkingCopyChange | null;
  view: DiffView;
  mutating?: boolean;
  onAdd?: () => void;
  onRevert?: () => void;
  onDelete?: () => void;
}) {

  const theme = useTheme();
  const result = view.state === 'ready' && view.path === change?.path ? view.result : null;
  const loading = view.state === 'loading' && view.path === change?.path;
  const error = view.state === 'error' && view.path === change?.path ? view.error : null;
  const patch = result?.kind === 'text' ? result.patch : '';
  const stats = countPatchLines(patch);
  const showPatch = result?.kind === 'text' && patch.length > 0;

  return (
    <div
      testId="diff-panel"
      style={{
        flexGrow: 1,
        minWidth: 0,
        height: '100%',
        backgroundColor: theme.panel,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: 72,
          paddingLeft: 20,
          paddingRight: 20,
          borderBottomWidth: 1,
          borderColor: theme.border,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <text
            style={{
              color: theme.text,
              fontSize: 14,
              fontFamily: font.ui,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              width: '100%',
            }}
          >
            {change?.path ?? 'No file selected'}
          </text>
          <text testId="diff-subtitle" style={{ color: theme.textMuted, fontSize: 10, fontFamily: font.ui }}>
            {subtitle({ change, result, stats, loading })}
          </text>
        </div>
        <Button
          label="Revert file"
          variant="secondary"
          size="sm"
          disabled={mutating || !onRevert}
          onClick={onRevert}
          testId="revert-file"
        />
        <Button
          label="Delete"
          variant="secondary"
          size="sm"
          disabled={mutating || !onDelete}
          onClick={onDelete}
          testId="delete-file"
        />
        <ChromeIcon />
      </div>

      {error ? (
        <div style={{ padding: 24 }}>
          <ErrorBanner error={error} testId="diff-error" />
        </div>
      ) : showPatch ? (
        <diff
          patch={patch}
          wordDiff
          scroll
          theme={{ appearance: 'light' }}
          style={{ flexGrow: 1, minHeight: 0 }}
        />
      ) : (
        <div
          testId="diff-empty"
          style={{
            flexGrow: 1,
            minHeight: 0,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <text style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>
            {emptyMessage({ change, result, loading })}
          </text>
          {result?.kind === 'unversioned' ? (
            <div style={{ width: 160 }}>
              <Button
                label="Add to SVN"
                variant="secondary"
                size="sm"
                disabled={mutating}
                onClick={onAdd}
                testId="add-unversioned"
              />
            </div>
          ) : null}
        </div>
      )}

      <div
        style={{
          height: 44,
          margin: 16,
          marginTop: 0,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.bg,
          paddingLeft: 12,
          paddingRight: 12,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <text style={{ color: theme.textSubtle, fontSize: 10, fontFamily: font.ui }}>UTF-8</text>
        <text style={{ color: theme.textSubtle, fontSize: 10, fontFamily: font.ui }}>LF</text>
        <div style={{ flexGrow: 1 }} />
        <text testId="diff-additions" style={{ color: theme.success, fontSize: 10, fontFamily: font.ui }}>
          {`${stats.additions} additions`}
        </text>
        <text testId="diff-deletions" style={{ color: theme.danger, fontSize: 10, fontFamily: font.ui }}>
          {`${stats.deletions} deletions`}
        </text>
      </div>
    </div>
  );
}

function subtitle(input: {
  change: WorkingCopyChange | null;
  result: DiffResult | null;
  stats: { additions: number; deletions: number };
  loading: boolean;
}): string {
  if (!input.change) return 'Select a changed file';
  if (input.loading) return `${STATUS_LABEL[input.change.status]} · loading`;
  if (input.result?.kind === 'text') {
    return `${STATUS_LABEL[input.change.status]} · ${input.stats.additions} additions · ${input.stats.deletions} deletions`;
  }
  if (input.result?.kind === 'binary') return `${STATUS_LABEL[input.change.status]} · binary file`;
  if (input.result?.kind === 'unversioned') return `${STATUS_LABEL[input.change.status]} · not in SVN`;
  return `${STATUS_LABEL[input.change.status]} · unified diff`;
}

function emptyMessage(input: {
  change: WorkingCopyChange | null;
  result: DiffResult | null;
  loading: boolean;
}): string {
  if (!input.change) return 'Select a file to view its diff.';
  if (input.loading) return 'Loading diff…';
  if (input.result?.kind === 'unversioned') {
    return 'Unversioned file. Add this file to SVN to include it in a commit.';
  }
  if (input.result?.kind === 'binary') {
    return 'This file is binary. Unified diff is not available.';
  }
  if (input.result?.kind === 'text') return 'No textual changes.';
  return 'Select a file to view its diff.';
}

function ChromeIcon() {
  const theme = useTheme();
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.panel,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="menu" size={14} color={theme.text} />
    </div>
  );
}
