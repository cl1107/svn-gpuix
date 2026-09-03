import { Button } from '../components/Button';
import { font, layout } from './theme';
import { useAppearance, useTheme } from './ThemeContext';
import type { AppearancePreference } from './appearance';

const OPTIONS: { id: AppearancePreference; label: string; testId: string }[] = [
  { id: 'light', label: 'Light', testId: 'titlebar-appearance-light' },
  { id: 'dark', label: 'Dark', testId: 'titlebar-appearance-dark' },
  { id: 'system', label: 'System', testId: 'titlebar-appearance-system' },
];

export function Titlebar({
  canOpen,
  showWelcome,
  onOpenWorkingCopy,
  onWelcomeScreen,
}: {
  canOpen?: boolean;
  showWelcome?: boolean;
  onOpenWorkingCopy?: () => void;
  onWelcomeScreen?: () => void;
}) {
  const theme = useTheme();
  const { preference, setPreference } = useAppearance();

  return (
    <div
      testId="titlebar"
      style={{
        height: layout.titlebarHeight,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: layout.trafficLightInset,
        paddingRight: 12,
        backgroundColor: theme.bg,
        gap: 8,
      }}
    >
      <text style={{ color: theme.text, fontSize: 13, fontFamily: font.ui }}>Revision</text>
      <div style={{ flexGrow: 1 }} />
      <div
        testId="titlebar-appearance"
        style={{
          display: 'flex',
          flexDirection: 'row',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          overflow: 'hidden',
          height: 28,
        }}
      >
        {OPTIONS.map((option) => {
          const active = preference === option.id;
          return (
            <div
              key={option.id}
              testId={option.testId}
              onClick={() => setPreference(option.id)}
              style={{
                paddingLeft: 10,
                paddingRight: 10,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                backgroundColor: active ? theme.accentSoft : theme.panel,
              }}
            >
              <text
                style={{
                  color: active ? theme.accent : theme.textMuted,
                  fontSize: 11,
                  fontFamily: font.ui,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {option.label}
              </text>
            </div>
          );
        })}
      </div>
      {onOpenWorkingCopy ? (
        <Button
          label="Open working copy"
          variant="secondary"
          size="sm"
          disabled={!canOpen}
          onClick={onOpenWorkingCopy}
          testId="titlebar-open-working-copy"
        />
      ) : null}
      {showWelcome && onWelcomeScreen ? (
        <Button
          label="Welcome screen"
          variant="secondary"
          size="sm"
          onClick={onWelcomeScreen}
          testId="titlebar-welcome"
        />
      ) : null}
    </div>
  );
}
