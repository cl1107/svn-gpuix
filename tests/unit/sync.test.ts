import { describe, expect, test } from 'bun:test';
import {
  composeSyncLabel,
  getSyncTone,
} from '../../src/domain/sync';

describe('sync helpers', () => {
  describe('composeSyncLabel', () => {
    test('0 local 且 0 behind 显示 Up to date', () => {
      expect(composeSyncLabel({ localCount: 0, behind: 0 })).toBe('Up to date');
    });

    test('0 local 且 behind 为 undefined (离线) 保持 Up to date', () => {
      expect(composeSyncLabel({ localCount: 0, behind: undefined })).toBe('Up to date');
    });

    test('0 local 且 N behind 显示 N behind', () => {
      expect(composeSyncLabel({ localCount: 0, behind: 2 })).toBe('2 behind');
      expect(composeSyncLabel({ localCount: 0, behind: 1 })).toBe('1 behind');
    });

    test('有 local 且 0 behind 保留本地变更文案', () => {
      expect(composeSyncLabel({ localCount: 1, behind: 0 })).toBe('1 local change');
      expect(composeSyncLabel({ localCount: 3, behind: 0 })).toBe('3 local changes');
    });

    test('有 local 且 behind 为 undefined (离线) 保留本地变更文案且不假装 0 behind', () => {
      expect(composeSyncLabel({ localCount: 1, behind: undefined })).toBe('1 local change');
      expect(composeSyncLabel({ localCount: 3, behind: undefined })).toBe('3 local changes');
    });

    test('同时有 local 与 behind 时组合展示', () => {
      expect(composeSyncLabel({ localCount: 3, behind: 2 })).toBe('3 local changes · 2 behind');
      expect(composeSyncLabel({ localCount: 1, behind: 1 })).toBe('1 local change · 1 behind');
      expect(composeSyncLabel({ localCount: 1, behind: 2 })).toBe('1 local change · 2 behind');
      expect(composeSyncLabel({ localCount: 2, behind: 1 })).toBe('2 local changes · 1 behind');
    });
  });

  describe('getSyncTone', () => {
    test('behind > 0 时返回 warning', () => {
      expect(getSyncTone(2)).toBe('warning');
      expect(getSyncTone(1)).toBe('warning');
    });

    test('behind 为 0 或 undefined 时返回 success', () => {
      expect(getSyncTone(0)).toBe('success');
      expect(getSyncTone(undefined)).toBe('success');
    });
  });
});
