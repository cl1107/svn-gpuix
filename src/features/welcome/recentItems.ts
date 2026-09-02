import { basename } from 'node:path';
import type { RecentWorkingCopy } from '../../domain/repository';
import type { RecentItem } from './WelcomeScreen';

export function displayPath(absolutePath: string, home: string): string {
  if (absolutePath === home) return '~';
  if (absolutePath.startsWith(`${home}/`)) return `~${absolutePath.slice(home.length)}`;
  return absolutePath;
}

export function toRecentItem(
  item: RecentWorkingCopy,
  exists: boolean,
  home: string,
): RecentItem {
  const name = basename(item.path) || item.path;
  return {
    name,
    path: displayPath(item.path, home),
    absolutePath: item.path,
    statusLabel: exists ? 'Working copy' : 'Missing',
    statusTone: exists ? 'ok' : 'missing',
  };
}
