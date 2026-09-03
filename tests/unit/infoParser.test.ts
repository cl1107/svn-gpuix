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

describe('remote info & parseRemoteRevision', () => {
  test('INFO_HEAD_ARGV 与 REMOTE_INFO_ARGV 符合 remote HEAD 查询契约', async () => {
    const { INFO_HEAD_ARGV, REMOTE_INFO_ARGV } = await import('../../src/services/svn/info');
    expect(INFO_HEAD_ARGV).toEqual(['svn', 'info', '--xml', '-r', 'HEAD', '--non-interactive']);
    expect(REMOTE_INFO_ARGV).toEqual(INFO_HEAD_ARGV);
  });

  test('从 remote svn info XML 解析 HEAD revision', () => {
    const { parseRemoteRevision } = require('../../src/services/svn/parsers/infoParser');
    const xml = `<?xml version="1.0"?>
<info>
<entry kind="dir" path="repo" revision="42">
<url>file:///repo</url>
<repository>
<root>file:///repo</root>
</repository>
<commit revision="42">
<author>alice</author>
</commit>
</entry>
</info>`;
    expect(parseRemoteRevision(xml)).toBe(42);
  });

  test('entry @_revision 缺失时可回退到 commit revision', () => {
    const { parseRemoteRevision } = require('../../src/services/svn/parsers/infoParser');
    const xml = `<?xml version="1.0"?>
<info>
<entry kind="dir" path="repo">
<url>file:///repo</url>
<commit revision="18">
<author>bob</author>
</commit>
</entry>
</info>`;
    expect(parseRemoteRevision(xml)).toBe(18);
  });

  test('缺少 revision 时抛错', () => {
    const { parseRemoteRevision } = require('../../src/services/svn/parsers/infoParser');
    const xml = `<?xml version="1.0"?>
<info>
<entry kind="dir" path="repo">
<url>file:///repo</url>
</entry>
</info>`;
    expect(() => parseRemoteRevision(xml)).toThrow(/missing revision/);
  });

  test('无效 XML 抛错', () => {
    const { parseRemoteRevision } = require('../../src/services/svn/parsers/infoParser');
    expect(() => parseRemoteRevision('<not-info />')).toThrow(/missing <info>/);
  });
});
