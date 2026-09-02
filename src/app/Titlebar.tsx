import { Button } from '../components/Button';
import { font, layout, theme } from './theme';

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
