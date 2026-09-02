import { describe, expect, test } from 'bun:test';
import { parseAppearancePreference, resolveAppearance } from '../../src/app/appearance';
import { darkTheme, lightTheme, tokensFor } from '../../src/app/theme';

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
    expect(tokensFor('dark').bg).toBe('#16181D');
  });
});
