import type { ReactNode } from 'react';
import { useTheme } from '../../app/ThemeContext';
import { font } from '../../app/theme';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { StatusBadge } from '../../components/StatusBadge';
import { STATUS_LABEL, type SvnChangeStatus } from '../../domain/change';
import {
  selectChanges,
  selectMutating,
  selectMutationError,
  selectRefreshing,
  selectRepository,
  selectStatusError,
} from '../../store/selectors';
import { useRepositoryStore } from '../../store/RepositoryStoreContext';

const SUMMARY_ORDER: SvnChangeStatus[] = [
  'modified',
  'added',
  'deleted',
  'replaced',
  'unversioned',
  'missing',
  'conflicted',
  'obstructed',
  'incomplete',
];

export function WorkingCopyView({
  workingCopyName,
  workingCopyPath,
  svnVersion,
  onRefresh,
  onUpdate,
}: {
  workingCopyName: string;
  workingCopyPath: string;
  svnVersion?: string;
  onRefresh: () => void;
  onUpdate: () => void;
}) {
  const theme = useTheme();
  const repository = useRepositoryStore(selectRepository);
  const changes = useRepositoryStore(selectChanges);
  const refreshing = useRepositoryStore(selectRefreshing);
  const mutating = useRepositoryStore(selectMutating);
  const mutationError = useRepositoryStore(selectMutationError);
  const statusError = useRepositoryStore(selectStatusError);
  const error = mutationError ?? statusError;
  const busy = mutating !== null;
  const statusCounts = new Map<SvnChangeStatus, number>();
  for (const change of changes) {
    statusCounts.set(change.status, (statusCounts.get(change.status) ?? 0) + 1);
  }
  const summary = SUMMARY_ORDER
    .map((status) => ({ status, count: statusCounts.get(status) ?? 0 }))
    .filter((item) => item.count > 0);

  return (
    <div
      testId="working-copy-view"
      style={{
        flexGrow: 1,
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        backgroundColor: theme.panel,
        overflow: 'scroll',
      }}
    >
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <text style={{ color: theme.text, fontSize: 22, fontFamily: font.ui, fontWeight: 600 }}>
              Working Copy
            </text>
            <text style={{ color: theme.textMuted, fontSize: 12, fontFamily: font.ui }}>
              Repository identity, local checkout details, and current SVN status.
            </text>
          </div>
          <Button
            label={refreshing ? 'Refreshing' : 'Refresh'}
            variant="secondary"
            size="sm"
            disabled={refreshing || busy}
            onClick={onRefresh}
            testId="working-copy-refresh"
          />
          <Button
            label={mutating === 'update' ? 'Updating' : 'Update'}
            size="sm"
            disabled={busy}
            onClick={onUpdate}
            testId="working-copy-update"
          />
        </div>

        {error ? <ErrorBanner error={error} testId="working-copy-error" /> : null}

        <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
          <MetricCard label="Revision" value={repository ? `r${repository.revision}` : '—'} testId="working-copy-revision" />
          <MetricCard
            label="Local changes"
            value={String(changes.length)}
            secondary={changes.length === 0 ? 'Clean working copy' : 'Pending local changes'}
            testId="working-copy-change-count"
          />
          <MetricCard
            label="SVN CLI"
            value={svnVersion ? `SVN ${svnVersion}` : 'Unknown'}
            secondary={mutating ? `${mutating} in progress` : 'Ready'}
            testId="working-copy-svn-version"
          />
        </div>

        <Section title="Local checkout">
          <InfoRow label="Name" value={workingCopyName} />
          <InfoRow label="Local path" value={workingCopyPath} mono testId="working-copy-local-path" />
        </Section>

        <Section title="Repository">
          <InfoRow label="Repository URL" value={repository?.repositoryUrl ?? 'Unavailable'} mono testId="working-copy-repository-url" />
          <InfoRow label="Repository root" value={repository?.repositoryRoot ?? 'Unavailable'} mono testId="working-copy-repository-root" />
          <InfoRow label="Repository UUID" value={repository?.uuid ?? 'Not reported by svn info'} mono testId="working-copy-uuid" />
        </Section>

        <Section title="Local status" subtitle={changes.length === 0 ? 'No local changes' : `${changes.length} changed items`}>
          {summary.length === 0 ? (
            <text testId="working-copy-clean" style={{ color: theme.textMuted, fontSize: 12, fontFamily: font.ui }}>
              The working copy has no visible local changes.
            </text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {summary.map(({ status, count }) => (
                <div
                  key={status}
                  testId={`working-copy-status-${status}`}
                  style={{ minHeight: 38, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <StatusBadge status={status} />
                  <text style={{ color: theme.text, fontSize: 12, fontFamily: font.ui, flexGrow: 1 }}>
                    {STATUS_LABEL[status]}
                  </text>
                  <text style={{ color: theme.textMuted, fontSize: 12, fontFamily: font.mono }}>{String(count)}</text>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  secondary,
  testId,
}: {
  label: string;
  value: string;
  secondary?: string;
  testId?: string;
}) {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      style={{
        flexGrow: 1,
        minWidth: 0,
        minHeight: 92,
        padding: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.bg,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <text style={{ color: theme.textMuted, fontSize: 10, fontFamily: font.ui, fontWeight: 600 }}>
        {label.toUpperCase()}
      </text>
      <text style={{ color: theme.text, fontSize: 18, fontFamily: font.ui, fontWeight: 600 }}>{value}</text>
      {secondary ? <text style={{ color: theme.textSubtle, fontSize: 10, fontFamily: font.ui }}>{secondary}</text> : null}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <div
      style={{
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.bg,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <text style={{ color: theme.text, fontSize: 14, fontFamily: font.ui, fontWeight: 600, flexGrow: 1 }}>
          {title}
        </text>
        {subtitle ? <text style={{ color: theme.textMuted, fontSize: 10, fontFamily: font.ui }}>{subtitle}</text> : null}
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  testId,
}: {
  label: string;
  value: string;
  mono?: boolean;
  testId?: string;
}) {
  const theme = useTheme();
  return (
    <div testId={testId} style={{ minHeight: 32, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <text style={{ width: 132, flexShrink: 0, color: theme.textMuted, fontSize: 11, fontFamily: font.ui }}>{label}</text>
      <text
        style={{
          flexGrow: 1,
          minWidth: 0,
          color: theme.text,
          fontSize: 11,
          fontFamily: mono ? font.mono : font.ui,
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </text>
    </div>
  );
}
