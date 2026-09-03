import { useState } from 'react';
import { useTheme } from '../app/ThemeContext';
import { font } from '../app/theme';
import type { AppError } from '../domain/error';

export function ErrorBanner({ error, testId }: { error: AppError; testId?: string }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(error.command?.length || error.stderr || error.exitCode !== undefined);
  const details = [
    error.command?.length ? `$ ${error.command.join(' ')}` : null,
    error.exitCode !== undefined ? `Exit code: ${error.exitCode}` : null,
    error.stderr?.trim() || null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n\n');

  return (
    <div
      testId={testId}
      style={{
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.danger,
        backgroundColor: theme.dangerBg,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <text style={{ color: theme.danger, fontSize: 13, fontFamily: font.ui, fontWeight: 600 }}>
        {error.title}
      </text>
      <text style={{ color: theme.textMuted, fontSize: 12, fontFamily: font.ui }}>
        {error.message}
      </text>
      {hasDetails ? (
        <div
          testId={testId ? `${testId}-details-toggle` : undefined}
          onClick={() => setExpanded((value) => !value)}
          style={{ paddingTop: 2, cursor: 'pointer', alignSelf: 'flex-start' }}
        >
          <text style={{ color: theme.danger, fontSize: 11, fontFamily: font.ui, fontWeight: 600 }}>
            {expanded ? 'Hide Details' : 'Show Details'}
          </text>
        </div>
      ) : null}
      {expanded && details ? (
        <div
          testId={testId ? `${testId}-details` : undefined}
          style={{
            marginTop: 4,
            padding: 10,
            borderRadius: 6,
            backgroundColor: theme.bg,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <text style={{ color: theme.textMuted, fontSize: 10, fontFamily: font.mono, whiteSpace: 'normal' }}>
            {details}
          </text>
        </div>
      ) : null}
    </div>
  );
}
