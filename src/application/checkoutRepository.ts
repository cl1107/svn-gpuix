import type { RecentWorkingCopy, Repository } from '../domain/repository';
import type { SettingsRepository } from '../services/settings/settingsRepository';
import type { OperationManager } from './operationManager';
import { openRepository } from './openRepository';

export interface CheckoutClient {
  checkout(input: {
    url: string;
    destination: string;
    signal?: AbortSignal;
    onStdout?: (chunk: string) => void;
  }): Promise<Repository>;
  validateWorkingCopy(path: string, signal?: AbortSignal): Promise<Repository>;
}

export async function checkoutAndOpen(input: {
  url: string;
  destination: string;
  svn: CheckoutClient;
  settings: SettingsRepository;
  operations: OperationManager;
  signal?: AbortSignal;
  onStdout?: (chunk: string) => void;
}): Promise<{ repository: Repository; recents: RecentWorkingCopy[] }> {
  const url = input.url.trim();
  const destination = input.destination.trim();
  if (!url || !destination) {
    throw new Error('Checkout requires a repository URL and destination folder');
  }

  const checkedOut = await input.operations.runMutation('checkout', () =>
    input.svn.checkout({
      url,
      destination,
      signal: input.signal,
      onStdout: input.onStdout,
    }),
  );

  const opened = await openRepository({
    path: checkedOut.rootPath,
    svn: input.svn,
    settings: input.settings,
    signal: input.signal,
  });
  if (!opened.ok) throw opened.error;
  return { repository: opened.repository, recents: opened.recents };
}
