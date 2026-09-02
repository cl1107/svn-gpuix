import { Icon } from '../../app/icons';
import { font, theme } from '../../app/theme';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import type { AppError } from '../../domain/error';

export type SvnProbe =
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'unavailable'; error: AppError };

export type RecentItem = {
  name: string;
  path: string;
  absolutePath: string;
  revision?: number;
  statusLabel: string;
  statusTone: 'ok' | 'dirty' | 'missing';
};

export function WelcomeScreen({
  svn,
  recents,
  error,
  busy,
  onOpenWorkingCopy,
  onCheckout,
  onOpenRecent,
}: {
  svn: SvnProbe;
  recents: RecentItem[];
  error?: AppError | null;
  busy?: boolean;
  onOpenWorkingCopy: () => void;
  onCheckout: () => void;
  onOpenRecent?: (item: RecentItem) => void;
}) {
  const svnReady = svn.status === 'available' && !busy;

  return (
    <div
      testId="welcome-screen"
      style={{
        flexGrow: 1,
        minHeight: 0,
        backgroundColor: theme.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 820,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: theme.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <text style={{ color: theme.accentText, fontSize: 26, fontFamily: font.ui }}>R</text>
          </div>
          <text
            testId="welcome-title"
            style={{ color: theme.text, fontSize: 28, fontFamily: font.ui }}
          >
            A focused SVN client
          </text>
          <text style={{ color: theme.textMuted, fontSize: 14, fontFamily: font.ui }}>
            Open an existing working copy, or check out a repository
          </text>
        </div>

        {svn.status === 'unavailable' ? (
          <ErrorBanner error={svn.error} testId="svn-missing" />
        ) : error ? (
          <ErrorBanner error={error} testId="open-error" />
        ) : null}

        {svn.status === 'checking' ? (
          <text
            testId="svn-checking"
            style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}
          >
            Checking SVN CLI…
          </text>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
          <WelcomeCard
            icon="folder"
            title="Open working copy"
            body="Choose a local folder that is already an SVN working copy."
            action="Choose folder…"
            variant="secondary"
            testId="open-working-copy"
            disabled={!svnReady}
            onAction={onOpenWorkingCopy}
          />
          <WelcomeCard
            icon="download"
            title="Checkout repository"
            body="Clone a repository URL into a destination folder."
            action="Checkout…"
            variant="primary"
            testId="checkout-repository"
            disabled={!svnReady}
            onAction={onCheckout}
          />
        </div>

        <div
          testId="recent-working-copies"
          style={{
            backgroundColor: theme.panel,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: 12 }}>
            <text style={{ color: theme.text, fontSize: 13, fontFamily: font.ui }}>
              Recent working copies
            </text>
          </div>
          {recents.length === 0 ? (
            <div style={{ padding: 12 }}>
              <text
                testId="recent-empty"
                style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}
              >
                Open a working copy to see it here.
              </text>
            </div>
          ) : (
            recents.map((item) => (
              <div
                key={item.path}
                testId={`recent-${item.name}`}
                onClick={onOpenRecent ? () => onOpenRecent(item) : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  height: 56,
                  paddingLeft: 12,
                  paddingRight: 12,
                  borderRadius: 10,
                  cursor: onOpenRecent ? 'pointer' : 'default',
                  hover: onOpenRecent ? { backgroundColor: theme.panelHover } : undefined,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: theme.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="folder" size={14} color={theme.textMuted} />
                </div>
                <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <text style={{ color: theme.text, fontSize: 13, fontFamily: font.ui }}>{item.name}</text>
                  <text style={{ color: theme.textMuted, fontSize: 12, fontFamily: font.ui }}>{item.path}</text>
                </div>
                <text
                  style={{
                    color:
                      item.statusTone === 'ok'
                        ? theme.success
                        : item.statusTone === 'dirty'
                          ? theme.warning
                          : theme.textMuted,
                    fontSize: 12,
                    fontFamily: font.ui,
                  }}
                >
                  {item.statusLabel}
                </text>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeCard({
  icon,
  title,
  body,
  action,
  variant,
  testId,
  disabled,
  onAction,
}: {
  icon: 'folder' | 'download';
  title: string;
  body: string;
  action: string;
  variant: 'primary' | 'secondary';
  testId: string;
  disabled: boolean;
  onAction: () => void;
}) {
  return (
    <div
      testId={testId}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        backgroundColor: theme.panel,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: theme.accentSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={14} color={theme.accent} />
      </div>
      <text style={{ color: theme.text, fontSize: 16, fontFamily: font.ui }}>{title}</text>
      <text style={{ color: theme.textMuted, fontSize: 13, fontFamily: font.ui }}>{body}</text>
      <div style={{ flexGrow: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          label={action}
          variant={variant}
          disabled={disabled}
          onClick={onAction}
          testId={`${testId}-button`}
        />
      </div>
    </div>
  );
}
