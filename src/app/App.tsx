import { useCallback, useEffect, useRef, useState } from 'react';
import { homedir } from 'node:os';
import { basename } from 'node:path';
import { stat } from 'node:fs/promises';
import { fixtureRecents } from '../design/fixtures';
import { WelcomeScreen, type RecentItem, type SvnProbe } from '../features/welcome/WelcomeScreen';
import { displayPath, toRecentItem } from '../features/welcome/recentItems';
import { RepositoryScreen } from '../features/repository/RepositoryScreen';
import { checkoutAndOpen } from '../application/checkoutRepository';
import { toAppError } from '../application/errors';
import { openRepository } from '../application/openRepository';
import type { AppError } from '../domain/error';
import { lastOutputLine } from '../domain/operation';
import type { Repository } from '../domain/repository';
import { CheckoutDialog } from '../features/welcome/CheckoutDialog';
import { detectSvn } from '../services/svn/detectSvn';
import {
  parseAppearancePreference,
  resolveAppearance,
  subscribeSystemAppearance,
  type AppearancePreference,
  type ResolvedAppearance,
} from './appearance';
import { ThemeProvider, useTheme } from './ThemeContext';
import { Titlebar } from './Titlebar';
import { tokensFor } from './theme';
import { createAppServices, type AppServices } from './services';
import { addShortcutListener } from './shortcuts';

const defaultServices = createAppServices();

async function pathExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function presentRecents(
  recents: { path: string; lastOpenedAt: number }[],
  home = homedir(),
): Promise<RecentItem[]> {
  return Promise.all(recents.map(async (item) => toRecentItem(item, await pathExists(item.path), home)));
}

export function App({
  preview,
  services = defaultServices,
}: {
  preview?: 'changes' | 'history';
  services?: AppServices;
}) {
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [systemAppearance, setSystemAppearance] = useState<ResolvedAppearance>('light');

  useEffect(() => {
    let cancelled = false;
    services.settings.load().then((settings) => {
      if (!cancelled) setPreferenceState(parseAppearancePreference(settings.appearance));
    });
    return () => {
      cancelled = true;
    };
  }, [services]);

  useEffect(() => {
    if (preference !== 'system') return;
    return subscribeSystemAppearance(services.runner, setSystemAppearance);
  }, [preference, services.runner]);

  const setPreference = useCallback(
    (next: AppearancePreference) => {
      setPreferenceState(next);
      void services.settings.setAppearance(next);
    },
    [services],
  );

  const resolved = resolveAppearance(preference, systemAppearance);
  const tokens = tokensFor(resolved);

  return (
    <ThemeProvider tokens={tokens} preference={preference} resolved={resolved} setPreference={setPreference}>
      <AppShell preview={preview} services={services} />
    </ThemeProvider>
  );
}

function AppShell({
  preview,
  services,
}: {
  preview?: 'changes' | 'history';
  services: AppServices;
}) {
  const theme = useTheme();
  const [svn, setSvn] = useState<SvnProbe>({ status: 'checking' });
  const [repository, setRepository] = useState<Repository | null>(null);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [openError, setOpenError] = useState<AppError | null>(null);
  const [switchError, setSwitchError] = useState<AppError | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [checkoutDest, setCheckoutDest] = useState('');
  const [checkoutProgress, setCheckoutProgress] = useState('');
  const [checkoutError, setCheckoutError] = useState<AppError | null>(null);
  const busyRef = useRef(false);

  const svnVersion = svn.status === 'available' ? svn.version : undefined;
  const previewRecents = process.env.SVN_GPUIX_PREVIEW === 'welcome' ? fixtureRecents : recents;

  useEffect(() => {
    let cancelled = false;
    detectSvn(services.runner).then((result) => {
      if (!cancelled) setSvn(result);
    });
    services.settings.load().then(async (settings) => {
      if (cancelled) return;
      setRecents(await presentRecents(settings.recentWorkingCopies));
    });
    return () => {
      cancelled = true;
    };
  }, [services]);

  const openPath = useCallback(
    async (path: string, options?: { keepCurrentOnError?: boolean }) => {
      if (busyRef.current || svn.status !== 'available' || services.operations.running) return;
      busyRef.current = true;
      setBusy(true);
      setOpenError(null);
      setSwitchError(null);
      const keepCurrent = options?.keepCurrentOnError ?? false;
      const result = await openRepository({
        path,
        svn: services.svn,
        settings: services.settings,
      });
      setRecents(await presentRecents(result.recents));
      if (result.ok) {
        setRepository(result.repository);
        setSwitchError(null);
      } else if (keepCurrent) {
        setSwitchError(result.error);
      } else {
        setRepository(null);
        setOpenError(result.error);
      }
      busyRef.current = false;
      setBusy(false);
    },
    [services, svn.status],
  );

  const closeWorkingCopy = useCallback(() => {
    if (busyRef.current || services.operations.running) return;
    setRepository(null);
    setOpenError(null);
    setSwitchError(null);
  }, [services.operations]);

  const chooseFolder = useCallback(async () => {
    if (busyRef.current || svn.status !== 'available' || services.operations.running) return;
    try {
      const picked = await services.picker.pickDirectory({ title: 'Open SVN Working Copy' });
      if (!picked) return;
      await openPath(picked, { keepCurrentOnError: Boolean(repository) });
    } catch (error) {
      const appError = toAppError(error, 'Could not open working copy');
      if (repository) setSwitchError(appError);
      else setOpenError(appError);
    }
  }, [openPath, repository, services, svn.status]);

  const chooseFolderRef = useRef(chooseFolder);
  chooseFolderRef.current = chooseFolder;

  const openCheckout = useCallback(() => {
    if (busyRef.current || svn.status !== 'available') return;
    setCheckoutOpen(true);
    setCheckoutError(null);
  }, [svn.status]);

  const browseDestination = useCallback(async () => {
    try {
      const picked = await services.picker.pickDirectory({ title: 'Checkout Destination' });
      if (picked) setCheckoutDest(picked);
    } catch (error) {
      setCheckoutError(toAppError(error, 'Could not choose destination'));
    }
  }, [services.picker]);

  const runCheckout = useCallback(async () => {
    if (busyRef.current || svn.status !== 'available') return;
    busyRef.current = true;
    setBusy(true);
    setCheckoutError(null);
    let output = '';
    try {
      const result = await checkoutAndOpen({
        url: checkoutUrl,
        destination: checkoutDest,
        svn: services.svn,
        settings: services.settings,
        operations: services.operations,
        onStdout: (chunk) => {
          output += chunk;
          setCheckoutProgress(lastOutputLine(output));
        },
      });
      setRecents(await presentRecents(result.recents));
      setRepository(result.repository);
      setOpenError(null);
      setCheckoutOpen(false);
      setCheckoutUrl('');
      setCheckoutDest('');
    } catch (error) {
      setCheckoutError(toAppError(error, 'Checkout failed'));
    } finally {
      busyRef.current = false;
      setBusy(false);
      setCheckoutProgress('');
    }
  }, [checkoutDest, checkoutUrl, services, svn.status]);

  const openCheckoutRef = useRef(openCheckout);
  openCheckoutRef.current = openCheckout;
  const closeDialogRef = useRef(() => {
    if (!busyRef.current) {
      setCheckoutOpen(false);
      setCheckoutError(null);
    }
  });
  closeDialogRef.current = () => {
    if (!busyRef.current) {
      setCheckoutOpen(false);
      setCheckoutError(null);
    }
  };

  useEffect(() => {
    return addShortcutListener((action) => {
      if (action === 'open-working-copy') void chooseFolderRef.current();
      if (action === 'checkout') openCheckoutRef.current();
      if (action === 'close-dialog') closeDialogRef.current();
    });
  }, []);

  return (
    <div
      style={{
        height: '100%',
        position: 'relative',
        backgroundColor: theme.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Titlebar
        canOpen={!preview && svn.status === 'available' && !busy}
        showWelcome={!preview && Boolean(repository)}
        onOpenWorkingCopy={preview ? undefined : () => void chooseFolder()}
        onWelcomeScreen={!preview && repository ? closeWorkingCopy : undefined}
      />
      {preview ? (
        <RepositoryScreen initialPage={preview} svnVersion={svnVersion} />
      ) : repository ? (
        <RepositoryScreen
          repository={repository}
          svn={services.svn}
          operations={services.operations}
          workingCopyName={basename(repository.rootPath) || repository.rootPath}
          workingCopyPath={displayPath(repository.rootPath, homedir())}
          revision={repository.revision}
          svnVersion={svnVersion}
          recents={recents}
          noticeError={switchError}
          onSwitchWorkingCopy={(path) => void openPath(path, { keepCurrentOnError: true })}
        />
      ) : (
        <WelcomeScreen
          svn={svn}
          recents={previewRecents}
          error={openError}
          busy={busy}
          onOpenWorkingCopy={() => void chooseFolder()}
          onCheckout={openCheckout}
          onOpenRecent={(item) => void openPath(item.absolutePath)}
        />
      )}
      {checkoutOpen ? (
        <CheckoutDialog
          url={checkoutUrl}
          destination={checkoutDest}
          busy={busy}
          progress={checkoutProgress}
          error={checkoutError}
          onUrl={setCheckoutUrl}
          onDestination={setCheckoutDest}
          onBrowse={() => void browseDestination()}
          onCancel={() => {
            if (!busy) {
              setCheckoutOpen(false);
              setCheckoutError(null);
            }
          }}
          onCheckout={() => void runCheckout()}
        />
      ) : null}
    </div>
  );
}
