import { theme, font } from '../app/theme';
import type { AppError } from '../domain/error';

export function ErrorBanner({ error, testId }: { error: AppError; testId?: string }) {
  return (
    <div
      testId={testId}
      style={{
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.danger,
        backgroundColor: '#FEF2F2',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <text style={{ color: theme.danger, fontSize: 13, fontFamily: font.ui }}>
        {error.title}
      </text>
      <text style={{ color: theme.textMuted, fontSize: 12, fontFamily: font.ui }}>
        {error.message}
      </text>
    </div>
  );
}
