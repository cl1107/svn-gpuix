import { describe, expect, test } from 'bun:test';
import { loadRevisionDiff } from '../../src/application/loadRevisionDiff';

describe('loadRevisionDiff', () => {
  test('读取指定 working copy 中的 revision patch', async () => {
    const signal = new AbortController().signal;
    const patch = 'diff --git a/readme.txt b/readme.txt\n+hello\n';

    const result = await loadRevisionDiff({
      rootPath: '/tmp/wc',
      revision: 42,
      signal,
      svn: {
        async getRevisionDiff(rootPath, revision, receivedSignal) {
          expect(rootPath).toBe('/tmp/wc');
          expect(revision).toBe(42);
          expect(receivedSignal).toBe(signal);
          return { kind: 'text', patch };
        },
      },
    });

    expect(result).toEqual({ kind: 'text', patch });
  });
});
