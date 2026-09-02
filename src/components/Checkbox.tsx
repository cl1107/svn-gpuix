import { font, theme } from '../app/theme';

export function Checkbox({
  checked,
  onClick,
  testId,
}: {
  checked: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <div
      testId={testId}
      onClick={onClick}
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: checked ? theme.accent : theme.border,
        backgroundColor: checked ? theme.accent : theme.panel,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : undefined,
        pointerEvents: 'auto',
      }}
    >
      {checked ? (
        <text style={{ color: theme.accentText, fontSize: 11, fontFamily: font.ui }}>✓</text>
      ) : null}
    </div>
  );
}
