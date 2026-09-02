import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseInfoXml } from '../../src/services/svn/parsers/infoParser';

const fixture = readFileSync(join(import.meta.dir, '../fixtures/info.xml'), 'utf8');

describe('parseInfoXml', () => {
  test('从 svn info --xml 解析 Repository', () => {
    const repository = parseInfoXml(fixture, '/fallback');
    expect(repository).toEqual({
      rootPath: '/tmp/svn-gpuix-info-wc',
      repositoryUrl: 'file:///tmp/svn-gpuix-info-fixture/trunk',
      repositoryRoot: 'file:///tmp/svn-gpuix-info-fixture',
      uuid: '2dd7bbe8-5c5c-422b-b92f-38b779b37533',
      revision: 12,
    });
  });

  test('缺少 wcroot 时回退到传入路径', () => {
    const xml = `<?xml version="1.0"?>
<info>
<entry kind="dir" path="." revision="3">
<url>file:///repo</url>
<repository>
<root>file:///repo</root>
</repository>
</entry>
</info>`;
    const repository = parseInfoXml(xml, '/Users/dev/project');
    expect(repository.rootPath).toBe('/Users/dev/project');
    expect(repository.revision).toBe(3);
    expect(repository.uuid).toBeUndefined();
  });

  test('无效 XML 抛错', () => {
    expect(() => parseInfoXml('<not-info />', '/tmp')).toThrow(/missing <info>/);
  });
});
