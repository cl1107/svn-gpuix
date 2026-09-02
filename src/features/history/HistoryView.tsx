import { useMemo, useState } from 'react';
import { font, layout, theme } from '../../app/theme';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import type { AppError } from '../../domain/error';
import {
  authorInitial,
  filterRevisions,
  formatRevisionDate,
  type PathAction,
  type SvnRevision,
} from '../../domain/revision';

const actionTone: Record<PathAction, { color: string; background: string }> = {
  M: { color: theme.modified, background: theme.modifiedBg },
  A: { color: theme.added, background: theme.addedBg },
  D: { color: theme.deleted, background: theme.deletedBg },
  R: { color: theme.replaced, background: theme.replacedBg },
};

export function HistoryView({
  revisions,
  selected,
  loading,
  error,
  refreshing,
  repositoryUrl,
  onSelect,
  onRefresh,
}: {
  revisions: SvnRevision[];
  selected: SvnRevision | null;
  loading?: boolean;
  error?: AppError | null;
  refreshing?: boolean;
  repositoryUrl?: string;
  onSelect: (revision: number) => void;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState('');
  const visible = useMemo(() => filterRevisions(revisions, filter), [revisions, filter]);

  return (
    <div
      testId="history-view"
      style={{ flexGrow: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'row' }}
    >
      <div
        testId="revision-list"
        style={{
          width: layout.historyListWidth,
          flexShrink: 0,
          backgroundColor: theme.panel,
          borderRightWidth: 1,
          borderColor: theme.border,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <text style={{ color: theme.text, fontSize: 20, fontFamily: font.ui, fontWeight: 600 }}>History</text>
              <text testId="history-count" style={{ color: theme.textMuted, fontSize: 11, fontFamily: font.ui }}>
                {`${revisions.length} ${revisions.length === 1 ? 'revision' : 'revisions'}`}
              </text>
            </div>
            <Button
              label={refreshing ? 'Refreshing' : 'Refresh'}
              variant="secondary"
              size="sm"
              disabled={refreshing}
              onClick={onRefresh}
              testId="history-refresh"
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
            <text style={{ color: theme.textSubtle, fontSize: 14, fontFamily: font.ui }}>⌕</text>
            <input
              testId="history-filter"
              value={filter}
              placeholder="Search messages, authors, revisions…"
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
        </div>

        {error ? (
          <div style={{ padding: 20 }}>
            <ErrorBanner error={error} testId="history-error" />
          </div>
        ) : null}

        {loading && revisions.length === 0 ? (
          <div style={{ padding: 20 }}>
            <text testId="history-loading" style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>
              Loading history…
            </text>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 20 }}>
            <text testId="history-empty" style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>
              {revisions.length === 0 ? 'No revisions yet' : 'No revisions match this filter'}
            </text>
          </div>
        ) : (
          <virtual-list estimatedItemHeight={84} style={{ flexGrow: 1, minHeight: 0, width: '100%' }}>
            {visible.map((rev) => {
              const active = selected?.revision === rev.revision;
              return (
                <div
                  key={rev.revision}
                  testId={`revision-${rev.revision}`}
                  onClick={() => onSelect(rev.revision)}
                  style={{
                    width: '100%',
                    minHeight: 84,
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingTop: 12,
                    paddingBottom: 12,
                    backgroundColor: active ? theme.accentSoft : undefined,
                    hover: active ? undefined : { backgroundColor: theme.panelHover },
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: active ? theme.accentBadge : theme.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <text style={{ color: active ? theme.accent : theme.textMuted, fontSize: 11, fontFamily: font.ui }}>
                      {authorInitial(rev.author)}
                    </text>
                  </div>
                  <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <text style={{ color: active ? theme.accent : theme.text, fontSize: 12, fontFamily: font.mono }}>
                      {`r${rev.revision}`}
                    </text>
                    <text
                      style={{
                        color: theme.text,
                        fontSize: 13,
                        fontFamily: font.ui,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        width: '100%',
                      }}
                    >
                      {rev.message.trim() ? rev.message.split('\n')[0] : '(no message)'}
                    </text>
                    <text style={{ color: theme.textMuted, fontSize: 11, fontFamily: font.ui }}>
                      {`${rev.author ?? 'unknown'} · ${formatRevisionDate(rev.date)}`}
                    </text>
                  </div>
                </div>
              );
            })}
          </virtual-list>
        )}
      </div>

      <div
        testId="revision-detail"
        style={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: 0,
          backgroundColor: theme.panel,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'scroll',
        }}
      >
        {selected ? (
          <>
            <text style={{ color: theme.text, fontSize: 20, fontFamily: font.mono }}>{`r${selected.revision}`}</text>
            <text style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>
              {`${selected.author ?? 'unknown'} · ${formatRevisionDate(selected.date)}`}
            </text>
            <text style={{ color: theme.text, fontSize: 15, fontFamily: font.ui }}>
              {selected.message.trim() ? selected.message : '(no message)'}
            </text>
            <text style={{ color: theme.text, fontSize: 13, fontFamily: font.ui, fontWeight: 600 }}>Changed Paths</text>
            {selected.changedPaths.length === 0 ? (
              <text style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>No changed paths</text>
            ) : (
              selected.changedPaths.map((path) => (
                <div
                  key={`${path.action}-${path.path}`}
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <ActionBadge action={path.action} />
                  <text style={{ color: theme.text, fontSize: 13, fontFamily: font.mono }}>{path.path}</text>
                </div>
              ))
            )}
            <text style={{ color: theme.text, fontSize: 13, fontFamily: font.ui, fontWeight: 600 }}>Revision info</text>
            <InfoRow label="Revision" value={`r${selected.revision}`} />
            <InfoRow label="Author" value={selected.author ?? 'unknown'} />
            {repositoryUrl ? <InfoRow label="Repository" value={repositoryUrl} /> : null}
          </>
        ) : (
          <text style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>Select a revision</text>
        )}
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: PathAction }) {
  const tone = actionTone[action];
  return (
    <div
      style={{
        width: 24,
        height: 22,
        borderRadius: 6,
        backgroundColor: tone.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <text style={{ color: tone.color, fontSize: 10, fontFamily: font.ui, fontWeight: 600 }}>{action}</text>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
      <text style={{ color: theme.textMuted, fontSize: 12, fontFamily: font.ui, width: 88 }}>{label}</text>
      <text style={{ color: theme.text, fontSize: 12, fontFamily: font.mono, flexGrow: 1 }}>{value}</text>
    </div>
  );
}
