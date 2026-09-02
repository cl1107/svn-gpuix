import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { visibleChanges } from '../../src/domain/change';
import { parseStatusXml } from '../../src/services/svn/parsers/statusParser';

const fixture = readFileSync(join(import.meta.dir, '../fixtures/status.xml'), 'utf8');
const root = '/tmp/frontend-web';

describe('parseStatusXml', () => {
  test('解析常见 item，并保留 property-only 修改', () => {
    const changes = parseStatusXml(fixture, root);
    const byPath = Object.fromEntries(changes.map((change) => [change.path, change]));

    expect(byPath['src/App.ts']?.status).toBe('modified');
    expect(byPath['src/App.ts']?.absolutePath).toBe('/tmp/frontend-web/src/App.ts');
    expect(byPath['src/App.ts']?.revision).toBe(12);
    expect(byPath['src/new.ts']?.status).toBe('added');
    expect(byPath['gone.txt']?.status).toBe('deleted');
    expect(byPath['scratch.txt']?.status).toBe('unversioned');
    expect(byPath['missing.txt']?.status).toBe('missing');
    expect(byPath['conflict.txt']?.status).toBe('conflicted');
    expect(byPath['ignored.log']?.status).toBe('ignored');
    expect(byPath['vendor']?.status).toBe('external');
    expect(byPath['clean.txt']).toBeUndefined();
    expect(byPath['props-only.txt']?.status).toBe('modified');
    expect(byPath['props-only.txt']?.propertyStatus).toBe('modified');
  });

  test('默认隐藏 ignored / external', () => {
    const visible = visibleChanges(parseStatusXml(fixture, root)).map((change) => change.path);
    expect(visible).toEqual([
      'src/App.ts',
      'src/new.ts',
      'gone.txt',
      'scratch.txt',
      'missing.txt',
      'conflict.txt',
      'props-only.txt',
    ]);
  });

  test('缺少 status 根节点时抛错', () => {
    expect(() => parseStatusXml('<info />', root)).toThrow(/missing <status>/);
  });
});
