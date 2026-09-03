import { describe, expect, test } from 'bun:test';
import {
  authorInitial,
  filterRevisions,
  formatRevisionDate,
  type SvnRevision,
} from '../../src/domain/revision';

const revisions: SvnRevision[] = [
  {
    revision: 12,
    author: 'alice',
    date: '2026-09-01T12:00:00.000Z',
    message: 'Fix user service',
    changedPaths: [{ action: 'M', path: '/trunk/src/App.ts' }],
  },
  {
    revision: 11,
    author: 'bob',
    date: '2026-08-30T08:00:00.000Z',
    message: 'Add profile page',
    changedPaths: [{ action: 'A', path: '/trunk/src/pages/profile.vue' }],
  },
];

describe('revision helpers', () => {
  test('formatRevisionDate 在 UTC 与 +08 时区下格式化结果不同', () => {
    const instant = '2026-09-01T23:18:00.000Z';
    const inUtc = formatRevisionDate(instant, 'UTC');
    const inShanghai = formatRevisionDate(instant, 'Asia/Shanghai');
    expect(inUtc).toBe('2026-09-01 23:18');
    expect(inShanghai).toBe('2026-09-02 07:18');
    expect(inUtc).not.toBe(inShanghai);
  });

  test('formatRevisionDate 缺省 timeZone 时使用系统本地时区', () => {
    const instant = '2026-09-01T23:18:00.000Z';
    const osZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(formatRevisionDate(instant)).toBe(formatRevisionDate(instant, osZone));
  });

  test('formatRevisionDate 保留午夜无 T 的日期格式，有 T 则保留时间', () => {
    expect(formatRevisionDate('2026-09-01', 'UTC')).toBe('2026-09-01');
    expect(formatRevisionDate('2026-09-01T00:00:00.000Z', 'UTC')).toBe('2026-09-01 00:00');
    expect(formatRevisionDate('')).toBe('');
    expect(formatRevisionDate(undefined)).toBe('');
    expect(formatRevisionDate('invalid-date')).toBe('invalid-date');
  });

  test('authorInitial 取首字母', () => {
    expect(authorInitial('alice')).toBe('A');
    expect(authorInitial('张三')).toBe('张');
    expect(authorInitial(undefined)).toBe('?');
  });

  test('filterRevisions 按 message / author / revision / path', () => {
    expect(filterRevisions(revisions, 'alice').map((item) => item.revision)).toEqual([12]);
    expect(filterRevisions(revisions, 'r11').map((item) => item.revision)).toEqual([11]);
    expect(filterRevisions(revisions, 'profile').map((item) => item.revision)).toEqual([11]);
    expect(filterRevisions(revisions, 'App.ts').map((item) => item.revision)).toEqual([12]);
  });
});
