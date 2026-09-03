import { homedir } from 'node:os';
import { join } from 'node:path';
import type { CommandRunner } from '../svn/commandRunner';
import type { PathOpener } from './pathOpener';

export function resolveAbsolutePath(path: string, home = homedir()): string {
  const trimmed = path.trim();
  if (trimmed === '~') return home;
  if (trimmed.startsWith('~/')) return join(home, trimmed.slice(2));
  return trimmed;
}

export class MacOSPathOpener implements PathOpener {
  constructor(private readonly runner: CommandRunner) {}

  async openPath(path: string): Promise<void> {
    const target = resolveAbsolutePath(path);
    if (!target) return;
    await this.runner.run({
      argv: ['open', target],
    });
  }
}
