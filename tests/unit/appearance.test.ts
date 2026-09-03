import { describe, expect, test } from 'bun:test';
import {
  createMacOSSystemAppearanceService,
  parseAppearancePreference,
  readSystemAppearance,
  resolveAppearance,
} from '../../src/app/appearance';
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

  test('浅深 token key 成对', () => {
    expect(Object.keys(tokensFor('light'))).toEqual(Object.keys(lightTheme));
    expect(Object.keys(tokensFor('dark'))).toEqual(Object.keys(darkTheme));
    expect(tokensFor('light').bg).toBe('#F8F9FB');
    expect(tokensFor('dark').bg).toBe('#12151C');
  });
});

describe('system appearance', () => {
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

  test('polling 串行执行且 unsubscribe 后停止', async () => {
    let calls = 0;
    let active = 0;
    let maxActive = 0;
    const runner = {
      async run() {
        calls += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Bun.sleep(3);
        active -= 1;
        return { exitCode: 0, stdout: 'Dark\n', stderr: '' };
      },
    } as unknown as CommandRunner;

    const service = createMacOSSystemAppearanceService(runner, 2);
    const seen: string[] = [];
    const unsubscribe = service.subscribe((mode) => seen.push(mode));

    for (let i = 0; i < 50 && seen.length < 2; i++) {
      await Bun.sleep(2);
    }

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(maxActive).toBe(1);

    unsubscribe();
    const callsWhenStopped = calls;
    await Bun.sleep(12);
    expect(calls).toBe(callsWhenStopped);
  });
});
