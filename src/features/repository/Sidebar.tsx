import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../../app/icons';
import { addShortcutListener } from '../../app/shortcuts';
import { font, layout, theme } from '../../app/theme';
import { Button } from '../../components/Button';
import type { RecentItem } from '../welcome/WelcomeScreen';
import { selectChanges, selectMutating, selectPage } from '../../store/selectors';
import { useRepositoryStore } from '../../store/RepositoryStoreContext';

export type { RepositoryPage } from '../../domain/repositoryPage';

export function Sidebar({
  workingCopyName,
  workingCopyPath,
  revision,
  syncLabel,
  svnVersion,
  onUpdate,
  onAddUnversioned,
  onRevertSelected,
  onDeleteSelected,
  recents,
  currentPath,
  onSwitchWorkingCopy,
}: {
  workingCopyName: string;
  workingCopyPath: string;
  revision: number;
  syncLabel: string;
  svnVersion?: string;
  onUpdate: () => void;
  onAddUnversioned?: () => void;
  onRevertSelected?: () => void;
  onDeleteSelected?: () => void;
  recents?: RecentItem[];
  currentPath?: string;
  onSwitchWorkingCopy?: (path: string) => void;
}) {
  const page = useRepositoryStore(selectPage);
  const mutatingKind = useRepositoryStore(selectMutating);
  const changeCount = useRepositoryStore(selectChanges).length;
  const onNavigate = useRepositoryStore((state) => state.setPage);
  const mutating = mutatingKind !== null;
  const updating = mutatingKind === 'update';
  const [menuOpen, setMenuOpen] = useState(false);
  const canSwitch = Boolean(onSwitchWorkingCopy) && (recents?.length ?? 0) > 0 && !mutating;

  useEffect(() => {
    return addShortcutListener((action) => {
      if (action === 'close-dialog') setMenuOpen(false);
    });
  }, []);
  return (
    <div
      testId="sidebar"
      style={{
        width: layout.sidebarWidth,
        flexShrink: 0,
        height: '100%',
        backgroundColor: theme.sidebar,
        borderRightWidth: 1,
        borderColor: theme.border,
        paddingTop: 18,
        paddingBottom: 18,
        paddingLeft: 10,
        paddingRight: 10,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        testId="workspace-switcher"
        onClick={canSwitch ? () => setMenuOpen((open) => !open) : undefined}
        style={{
          marginLeft: 6,
          marginRight: 6,
          height: 58,
          backgroundColor: theme.panel,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
          paddingLeft: 12,
          paddingRight: 12,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          cursor: canSwitch ? 'pointer' : 'default',
          hover: canSwitch ? { backgroundColor: theme.panelHover } : undefined,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: theme.accentSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <text style={{ color: theme.accent, fontSize: 12, fontFamily: font.ui, fontWeight: 600 }}>R</text>
        </div>
        <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <text style={{ color: theme.text, fontSize: 13, fontFamily: font.ui, fontWeight: 600 }}>
            {workingCopyName}
          </text>
          <text style={{ color: theme.textMuted, fontSize: 10, fontFamily: font.ui }}>{workingCopyPath}</text>
        </div>
        <Icon name={menuOpen ? 'chevronUp' : 'chevronDown'} size={14} color={theme.textMuted} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <SectionLabel>WORKSPACE</SectionLabel>
        <NavRow
          icon="changes"
          label="Changes"
          active={page === 'changes'}
          badge={changeCount > 0 ? String(changeCount) : undefined}
          testId="nav-changes"
          onClick={() => onNavigate('changes')}
        />
        <NavRow
          icon="history"
          label="History"
          active={page === 'history'}
          testId="nav-history"
          onClick={() => onNavigate('history')}
        />
        <NavRow
          icon="house"
          label="Working Copy"
          active={page === 'working-copy'}
          testId="nav-working-copy"
          onClick={() => onNavigate('working-copy')}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionLabel>SVN</SectionLabel>
        <div
          testId="svn-update-card"
          style={{
            backgroundColor: theme.panel,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 14,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <text style={{ color: theme.textMuted, fontSize: 11, fontFamily: font.ui }}>Working copy</text>
            <text testId="wc-revision" style={{ color: theme.text, fontSize: 16, fontFamily: font.ui, fontWeight: 600 }}>
              {`r${revision}`}
            </text>
            <text testId="wc-sync" style={{ color: theme.success, fontSize: 10, fontFamily: font.ui }}>
              {syncLabel}
            </text>
          </div>
          <Button
            label={updating ? 'Updating' : 'Update'}
            variant="secondary"
            size="sm"
            disabled={mutating}
            onClick={onUpdate}
            testId="update-button"
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 6 }}>
        <SectionLabel>Quick actions</SectionLabel>
        <QuickAction
          icon="plus"
          label="Add unversioned files"
          testId="add-unversioned-files"
          disabled={mutating || !onAddUnversioned}
          onClick={onAddUnversioned}
        />
        <QuickAction
          icon="revert"
          label="Revert selected"
          testId="revert-selected"
          disabled={mutating || !onRevertSelected}
          onClick={onRevertSelected}
        />
        <QuickAction
          icon="trash"
          label="Delete selected"
          testId="delete-selected"
          disabled={mutating || !onDeleteSelected}
          onClick={onDeleteSelected}
        />
      </div>

      <div style={{ flexGrow: 1 }} />
      {svnVersion ? (
        <text
          testId="sidebar-svn-version"
          style={{ color: theme.textSubtle, fontSize: 10, fontFamily: font.ui, paddingLeft: 6 }}
        >
          {`SVN ${svnVersion}`}
        </text>
      ) : null}
      {menuOpen && canSwitch ? (
        <div
          testId="workspace-menu"
          onMouseDownOutside={() => setMenuOpen(false)}
          style={{
            position: 'absolute',
            top: 88,
            left: 16,
            width: 206,
            backgroundColor: theme.panel,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            paddingTop: 6,
            paddingBottom: 6,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {(recents ?? []).map((item) => {
            const active = Boolean(currentPath && item.absolutePath === currentPath);
            return (
              <MenuRow
                key={item.absolutePath}
                testId={`workspace-recent-${item.name}`}
                title={item.name}
                subtitle={item.statusTone === 'missing' ? 'Missing' : item.path}
                active={active}
                muted={item.statusTone === 'missing'}
                onClick={() => {
                  if (active) {
                    setMenuOpen(false);
                    return;
                  }
                  setMenuOpen(false);
                  onSwitchWorkingCopy?.(item.absolutePath);
                }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MenuRow({
  title,
  subtitle,
  testId,
  active,
  muted,
  onClick,
}: {
  title: string;
  subtitle?: string;
  testId: string;
  active?: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      testId={testId}
      onClick={onClick}
      style={{
        marginLeft: 6,
        marginRight: 6,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 8,
        paddingBottom: 8,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        cursor: 'pointer',
        backgroundColor: active ? theme.accentSoft : undefined,
        hover: active ? undefined : { backgroundColor: theme.panelHover },
      }}
    >
      <text
        style={{
          color: active ? theme.accent : muted ? theme.textMuted : theme.text,
          fontSize: 12,
          fontFamily: font.ui,
          fontWeight: active ? 600 : 500,
        }}
      >
        {title}
      </text>
      {subtitle ? (
        <text style={{ color: theme.textMuted, fontSize: 10, fontFamily: font.ui }}>{subtitle}</text>
      ) : null}
    </div>
  );
}

function QuickAction({
  icon,
  label,
  testId,
  disabled,
  onClick,
}: {
  icon: IconName;
  label: string;
  testId: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      testId={testId}
      onClick={disabled ? undefined : onClick}
      style={{
        paddingLeft: 6,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Icon name={icon} size={13} color={theme.text} />
      <text style={{ color: theme.text, fontSize: 12, fontFamily: font.ui }}>{label}</text>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <text style={{ color: theme.textSubtle, fontSize: 10, fontFamily: font.ui, fontWeight: 600, paddingLeft: 6 }}>
      {children}
    </text>
  );
}

function NavRow({
  icon,
  label,
  active,
  badge,
  onClick,
  testId,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <div
      testId={testId}
      onClick={onClick}
      style={{
        height: 38,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        backgroundColor: active ? theme.accentSoft : undefined,
        hover: active ? undefined : { backgroundColor: theme.panelHover },
      }}
    >
      <Icon name={icon} size={14} color={active ? theme.accent : theme.textMuted} />
      <text
        style={{
          color: active ? theme.accent : theme.text,
          fontSize: 13,
          fontFamily: font.ui,
          fontWeight: active ? 600 : 500,
          flexGrow: 1,
        }}
      >
        {label}
      </text>
      {badge ? (
        <div
          style={{
            minWidth: 24,
            height: 22,
            paddingLeft: 8,
            paddingRight: 8,
            borderRadius: 6,
            backgroundColor: theme.accentBadge,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <text style={{ color: theme.accent, fontSize: 10, fontFamily: font.ui, fontWeight: 600 }}>{badge}</text>
        </div>
      ) : null}
    </div>
  );
}
