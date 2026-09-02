import type { ReactNode } from 'react';
import { font, theme } from '../../app/theme';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import type { AppError } from '../../domain/error';

export function CheckoutDialog({
  url,
  destination,
  busy,
  progress,
  error,
  onUrl,
  onDestination,
  onBrowse,
  onCancel,
  onCheckout,
}: {
  url: string;
  destination: string;
  busy: boolean;
  progress?: string;
  error?: AppError | null;
  onUrl: (value: string) => void;
  onDestination: (value: string) => void;
  onBrowse: () => void;
  onCancel: () => void;
  onCheckout: () => void;
}) {
  const canCheckout = url.trim().length > 0 && destination.trim().length > 0 && !busy;

  return (
    <div
      testId="checkout-dialog-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 28, 41, 0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        testId="checkout-dialog"
        onMouseDownOutside={busy ? undefined : onCancel}
        style={{
          width: 520,
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
        <text style={{ color: theme.text, fontSize: 18, fontFamily: font.ui, fontWeight: 600 }}>
          Checkout repository
        </text>
        <Field label="Repository URL">
          <input
            testId="checkout-url"
            value={url}
            placeholder="https://svn.example.com/project/trunk"
            onChange={(event) => onUrl(event.value ?? '')}
            style={fieldStyle}
          />
        </Field>
        <Field label="Destination">
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <input
              testId="checkout-destination"
              value={destination}
              placeholder="/Users/you/Projects/project"
              onChange={(event) => onDestination(event.value ?? '')}
              style={{ ...fieldStyle, flexGrow: 1, minWidth: 0 }}
            />
            <Button label="Browse…" variant="secondary" disabled={busy} onClick={onBrowse} testId="checkout-browse" />
          </div>
        </Field>
        {busy ? (
          <text testId="checkout-progress" style={{ color: theme.textMuted, fontSize: 12, fontFamily: font.ui }}>
            {progress?.trim() ? progress : 'Checking out…'}
          </text>
        ) : null}
        {error ? <ErrorBanner error={error} testId="checkout-error" /> : null}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          <Button label="Cancel" variant="secondary" disabled={busy} onClick={onCancel} testId="checkout-cancel" />
          <Button
            label={busy ? 'Checking out…' : 'Checkout'}
            disabled={!canCheckout}
            onClick={onCheckout}
            testId="checkout-confirm"
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <text style={{ color: theme.textMuted, fontSize: 11, fontFamily: font.ui }}>{label}</text>
      {children}
    </div>
  );
}

const fieldStyle = {
  height: 36,
  paddingLeft: 12,
  paddingRight: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: theme.border,
  backgroundColor: theme.bg,
  color: theme.text,
  fontSize: 13,
} as const;
