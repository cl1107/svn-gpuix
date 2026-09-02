import { describe, expect, test } from 'bun:test';
import { commitChanges } from '../../src/application/commitChanges';
import { OperationManager } from '../../src/application/operationManager';

describe('commitChanges', () => {
  test('走 OperationManager 并提交 trim 后的 message', async () => {
    const operations = new OperationManager();
    const result = await commitChanges({
      rootPath: '/tmp/wc',
      paths: ['a.ts'],
      message: '  fix  ',
      operations,
      svn: {
        async commit(rootPath, paths, message) {
          expect(rootPath).toBe('/tmp/wc');
          expect(paths).toEqual(['a.ts']);
          expect(message).toBe('fix');
          return { revision: 9, output: 'Committed revision 9.\n' };
        },
      },
    });
    expect(result.revision).toBe(9);
  });

  test('空 message 不调用 svn', async () => {
    const operations = new OperationManager();
    try {
      await commitChanges({
        rootPath: '/tmp/wc',
        paths: ['a.ts'],
        message: '   ',
        operations,
        svn: {
          async commit() {
            throw new Error('should not commit');
          },
        },
      });
      throw new Error('expected validation error');
    } catch (error) {
      expect((error as Error).message).toContain('Commit requires');
    }
  });
});
