import { font, layout, theme } from '../../app/theme';
import { Checkbox } from '../../components/Checkbox';
import { StatusBadge } from '../../components/StatusBadge';
import { STATUS_LABEL, type WorkingCopyChange } from '../../domain/change';

export function ChangeRow({
  change,
  active,
  checked,
  onSelect,
  onToggle,
}: {
  change: WorkingCopyChange;
  active: boolean;
  checked: boolean;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}) {
  return (
    <div
      testId={`change-${change.path}`}
      style={{
        width: '100%',
        height: layout.fileRowHeight,
        paddingLeft: 10,
        paddingRight: 10,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          overflow: 'hidden',
          backgroundColor: active ? theme.accentSoft : undefined,
          hover: active ? undefined : { backgroundColor: theme.panelHover },
        }}
      >
        <Checkbox
          checked={checked}
          testId={`check-${change.path}`}
          onClick={() => onToggle(change.path)}
        />
        <div
          testId={`select-${change.path}`}
          onClick={() => onSelect(change.path)}
          style={{
            flexGrow: 1,
            minWidth: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          <StatusBadge status={change.status} />
          <div
            style={{
              flexGrow: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <text
              style={{
                color: active ? theme.accent : theme.text,
                fontSize: 12,
                fontFamily: font.ui,
                fontWeight: active ? 600 : 500,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                width: '100%',
              }}
            >
              {change.path}
            </text>
            <text
              style={{
                color: theme.textMuted,
                fontSize: 10,
                fontFamily: font.ui,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                width: '100%',
              }}
            >
              {STATUS_LABEL[change.status]}
            </text>
          </div>
          <text style={{ color: theme.textSubtle, fontSize: 16, fontFamily: font.ui, flexShrink: 0 }}>›</text>
        </div>
      </div>
    </div>
  );
}
