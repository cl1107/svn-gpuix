import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLogXml } from '../../src/services/svn/parsers/logParser';

const fixture = readFileSync(join(import.meta.dir, '../fixtures/log.xml'), 'utf8');

describe('parseLogXml', () => {
  test('解析 message / unicode author / changed paths / copyfrom', () => {
    const revisions = parseLogXml(fixture);
    expect(revisions).toHaveLength(2);

    const first = revisions[0];
    expect(first?.revision).toBe(12);
    expect(first?.author).toBe('alice');
    expect(first?.message).toContain('Fix user service');
    expect(first?.message).toContain('second line');
    expect(first?.changedPaths).toEqual([
      { path: '/trunk/src/App.ts', action: 'M' },
      { path: '/trunk/new.ts', action: 'A', copyFromPath: '/trunk/old.ts', copyFromRevision: 10 },
      { path: '/trunk/gone.ts', action: 'D' },
      { path: '/trunk/replaced.ts', action: 'R' },
    ]);

    const second = revisions[1];
    expect(second?.revision).toBe(11);
    expect(second?.author).toBe('张三');
    expect(second?.message).toBe('');
    expect(second?.changedPaths).toEqual([{ path: '/trunk/README.md', action: 'M' }]);
  });

  test('空 log 返回空数组', () => {
    expect(parseLogXml('<?xml version="1.0"?><log></log>')).toEqual([]);
  });

  test('无效 XML 抛错', () => {
    expect(() => parseLogXml('<not-log />')).toThrow(/missing <log>/);
  });
});
