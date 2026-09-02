import { describe, expect, test } from 'bun:test';
import { OperationManager } from '../../src/application/operationManager';
import { MutationBusyError } from '../../src/domain/operation';

describe('OperationManager', () => {
  test('同一时刻只能跑一个 mutation', async () => {
    const operations = new OperationManager();
    let release: () => void = () => {};
    const first = operations.runMutation(
      'commit',
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve('ok');
        }),
    );
    expect(operations.running).toBe('commit');
    try {
      await operations.runMutation('update', async () => 'nope');
      throw new Error('expected busy');
    } catch (error) {
      expect(error).toBeInstanceOf(MutationBusyError);
    }
    release();
    await expect(first).resolves.toBe('ok');
    await expect(operations.runMutation('update', async () => 'done')).resolves.toBe('done');
    expect(operations.running).toBeNull();
  });
});
