import { useTheme } from '../app/ThemeContext';
import { font } from '../app/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const sizeStyle: Record<ButtonSize, { height: number; padding: number; fontSize: number }> = {
  sm: { height: 34, padding: 12, fontSize: 12 },
  md: { height: 36, padding: 14, fontSize: 13 },
  lg: { height: 42, padding: 12, fontSize: 13 },
};

export function Button({
  label,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  grow,
  testId,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  grow?: boolean;
  testId?: string;
}) {

  const theme = useTheme();
  const filled = variant === 'primary' || variant === 'danger';
  const metrics = sizeStyle[size];
  const backgroundColor = variant === 'danger' ? theme.danger : variant === 'primary' ? theme.accent : theme.panel;
  const hoverColor =
    variant === 'danger' ? '#B91C1C' : variant === 'primary' ? theme.accentHover : theme.panelHover;

  return (
    <div
      testId={testId}
      onClick={disabled ? undefined : onClick}
      style={{
        height: metrics.height,
        paddingLeft: metrics.padding,
        paddingRight: metrics.padding,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: grow ? 1 : undefined,
        width: grow ? '100%' : undefined,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        backgroundColor,
        borderWidth: filled ? 0 : 1,
        borderColor: theme.border,
        hover: disabled ? undefined : { backgroundColor: hoverColor },
      }}
    >
      <text
        style={{
          color: filled ? theme.accentText : theme.text,
          fontSize: metrics.fontSize,
          fontFamily: font.ui,
        }}
      >
        {label}
      </text>
    </div>
  );
}
