import { describe, expect, test } from 'bun:test';
import { canCommit, lastOutputLine, parseCommitRevision, parseUpdateRevision } from '../../src/domain/operation';

describe('commit / update 输出解析', () => {
  test('解析 Committed revision N.', () => {
    expect(parseCommitRevision('Sending        a.ts\nTransmitting file data .\nCommitted revision 12.\n')).toBe(12);
    expect(parseCommitRevision('nothing here')).toBeUndefined();
  });

  test('解析 Updated / At revision', () => {
    expect(parseUpdateRevision('Updating \'.\':\nU    a.ts\nUpdated to revision 130.\n')).toBe(130);
    expect(parseUpdateRevision('At revision 4.\n')).toBe(4);
  });

  test('lastOutputLine 取最后一行非空输出', () => {
    expect(lastOutputLine('Updating...\nU src/App.ts\n')).toBe('U src/App.ts');
  });

  test('canCommit 需要非空 message、路径，且没有 mutation', () => {
    expect(canCommit({ message: 'fix', paths: ['a.ts'], mutating: false })).toBe(true);
    expect(canCommit({ message: '  ', paths: ['a.ts'], mutating: false })).toBe(false);
    expect(canCommit({ message: 'fix', paths: [], mutating: false })).toBe(false);
    expect(canCommit({ message: 'fix', paths: ['a.ts'], mutating: true })).toBe(false);
  });
});
