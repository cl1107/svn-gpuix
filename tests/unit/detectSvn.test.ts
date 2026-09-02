import { describe, expect, test } from 'bun:test';
import { CommandError, type CommandRequest, type CommandResult } from '../../src/services/svn/commandRunner';
import { detectSvn } from '../../src/services/svn/detectSvn';

class FakeRunner {
  constructor(private readonly impl: (request: CommandRequest) => Promise<CommandResult>) {}
  run(request: CommandRequest) {
    return this.impl(request);
  }
}

describe('detectSvn', () => {
  test('返回 svn --version --quiet 的版本号', async () => {
    const runner = new FakeRunner(async (request) => {
      expect(request.argv).toEqual(['svn', '--version', '--quiet']);
      return { exitCode: 0, stdout: '1.14.5\n', stderr: '' };
    });

    const result = await detectSvn(runner as never);
    expect(result).toEqual({ status: 'available', version: '1.14.5' });
  });

  test('可执行文件不存在时给出 svn-not-found', async () => {
    const runner = new FakeRunner(async () => {
      throw new CommandError({
        command: ['svn', '--version', '--quiet'],
        exitCode: 127,
        stdout: '',
        stderr: 'ENOENT',
        message: 'executable not found',
      });
    });

    const result = await detectSvn(runner as never);
    expect(result.status).toBe('unavailable');
    if (result.status === 'unavailable') {
      expect(result.error.kind).toBe('svn-not-found');
    }
  });
});
