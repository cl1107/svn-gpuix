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
  test('formatRevisionDate 用 UTC 日期时间', () => {
    expect(formatRevisionDate('2026-09-01T23:18:00.000Z')).toBe('2026-09-01 23:18');
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
