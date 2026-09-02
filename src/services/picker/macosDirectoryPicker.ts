import { CommandError, type CommandRunner } from '../svn/commandRunner';
import type { DirectoryPicker } from './DirectoryPicker';

const DEFAULT_TITLE = 'Open SVN Working Copy';

function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function normalizePickedPath(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '/') return trimmed;
  return trimmed.replace(/\/+$/, '');
}

export function isPickerCanceled(error: CommandError): boolean {
  const text = `${error.stderr}\n${error.stdout}\n${error.message}`;
  if (/-128/.test(text) || /User canceled/i.test(text) || /用户取消/.test(text)) return true;
  return error.command[0] === 'osascript' && error.exitCode === 1 && error.stderr.trim().length === 0;
}

function chooseFolderScript(title: string): string {
  return [
    'try',
    `  return POSIX path of (choose folder with prompt ${appleScriptString(title)})`,
    'on error number -128',
    '  return ""',
    'end try',
  ].join('\n');
}

export class MacOSDirectoryPicker implements DirectoryPicker {
  constructor(private readonly runner: CommandRunner) {}

  async pickDirectory(options?: { title?: string }): Promise<string | null> {
    const title = options?.title ?? DEFAULT_TITLE;
    const script = chooseFolderScript(title);

    try {
      const result = await this.runner.run({
        argv: ['osascript', '-e', script],
      });
      const path = normalizePickedPath(result.stdout);
      return path.length > 0 ? path : null;
    } catch (error) {
      if (error instanceof CommandError && isPickerCanceled(error)) {
        return null;
      }
      throw error;
    }
  }
}
