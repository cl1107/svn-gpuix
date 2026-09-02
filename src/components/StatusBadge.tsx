import { useTheme } from '../app/ThemeContext';
import { font, type ThemeTokens } from '../app/theme';
import { STATUS_LETTER, type SvnChangeStatus } from '../domain/change';

function statusTone(theme: ThemeTokens): Record<SvnChangeStatus, { color: string; background: string }> {
  return {
    modified: { color: theme.modified, background: theme.modifiedBg },
    added: { color: theme.added, background: theme.addedBg },
    deleted: { color: theme.deleted, background: theme.deletedBg },
    unversioned: { color: theme.unversioned, background: theme.unversionedBg },
    missing: { color: theme.warning, background: theme.modifiedBg },
    replaced: { color: theme.replaced, background: theme.replacedBg },
    conflicted: { color: theme.conflicted, background: theme.conflictedBg },
    ignored: { color: theme.textSubtle, background: theme.unversionedBg },
    external: { color: theme.textSubtle, background: theme.unversionedBg },
    obstructed: { color: theme.danger, background: theme.deletedBg },
    incomplete: { color: theme.warning, background: theme.modifiedBg },
  };
}

export function StatusBadge({ status }: { status: SvnChangeStatus }) {
  const theme = useTheme();
  const { color, background } = statusTone(theme)[status];
  return (
    <div
      style={{
        width: 24,
        height: 22,
        borderRadius: 6,
        backgroundColor: background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <text style={{ color, fontSize: 10, fontFamily: font.ui, fontWeight: 600 }}>
        {STATUS_LETTER[status]}
      </text>
    </div>
  );
}
