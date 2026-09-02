import { describe, expect, test } from 'bun:test';
import { parseAppearancePreference, readSystemAppearance, resolveAppearance } from '../../src/app/appearance';
import { darkTheme, lightTheme, tokensFor } from '../../src/app/theme';
import type { CommandRunner } from '../../src/services/svn/commandRunner';

describe('appearance', () => {
  test('未知值回退 system', () => {
    expect(parseAppearancePreference(undefined)).toBe('system');
    expect(parseAppearancePreference('sepia')).toBe('system');
    expect(parseAppearancePreference('dark')).toBe('dark');
  });

  test('system 跟随 OS，light/dark 锁定', () => {
    expect(resolveAppearance('system', 'dark')).toBe('dark');
    expect(resolveAppearance('system', 'light')).toBe('light');
    expect(resolveAppearance('light', 'dark')).toBe('light');
    expect(resolveAppearance('dark', 'light')).toBe('dark');
  });

  test('resolveTheme 浅深 key 成对', () => {
    expect(Object.keys(tokensFor('light'))).toEqual(Object.keys(lightTheme));
    expect(Object.keys(tokensFor('dark'))).toEqual(Object.keys(darkTheme));
    expect(tokensFor('light').bg).toBe('#F8F9FB');
    expect(tokensFor('dark').bg).toBe('#12151C');
  });
});

describe('readSystemAppearance', () => {
  test('Dark stdout is dark; missing key is light; argv is defaults', async () => {
    const calls: string[][] = [];
    const darkRunner = {
      async run(request: { argv: string[] }) {
        calls.push(request.argv);
        return { exitCode: 0, stdout: 'Dark\n', stderr: '' };
      },
    } as CommandRunner;
    expect(await readSystemAppearance(darkRunner)).toBe('dark');
    expect(calls[0]).toEqual(['defaults', 'read', '-g', 'AppleInterfaceStyle']);

    const lightRunner = {
      async run() {
        throw new Error('The domain/default pair of (kCFPreferencesAnyApplication, AppleInterfaceStyle) does not exist');
      },
    } as unknown as CommandRunner;
    expect(await readSystemAppearance(lightRunner)).toBe('light');
  });
});
