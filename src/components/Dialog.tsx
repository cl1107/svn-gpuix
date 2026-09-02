import { useTheme } from '../app/ThemeContext';
import type { ReactNode } from 'react';
import { font } from '../app/theme';
import { Button } from './Button';
import { ErrorBanner } from './ErrorBanner';
import type { AppError } from '../domain/error';

export function Dialog({
  title,
  body,
  confirmLabel,
  confirmVariant = 'primary',
  cancelLabel = 'Cancel',
  busy,
  error,
  testId,
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  cancelLabel?: string;
  busy?: boolean;
  error?: AppError | null;
  testId: string;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}) {

  const theme = useTheme();
  return (
    <div
      testId={`${testId}-overlay`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.overlayScrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        testId={testId}
        onMouseDownOutside={busy ? undefined : onCancel}
        style={{
          width: 440,
          backgroundColor: theme.panel,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <text style={{ color: theme.text, fontSize: 18, fontFamily: font.ui, fontWeight: 600 }}>{title}</text>
        {body ? (
          <text style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>{body}</text>
        ) : null}
        {children}
        {error ? <ErrorBanner error={error} testId={`${testId}-error`} /> : null}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          <Button label={cancelLabel} variant="secondary" disabled={busy} onClick={onCancel} testId={`${testId}-cancel`} />
          <Button
            label={busy ? 'Working…' : confirmLabel}
            variant={confirmVariant}
            disabled={busy}
            onClick={onConfirm}
            testId={`${testId}-confirm`}
          />
        </div>
      </div>
    </div>
  );
}
