import { describe, expect, test } from 'bun:test';
import { CommandError, CommandRunner } from '../../src/services/svn/commandRunner';

const runner = new CommandRunner();

describe('CommandRunner', () => {
  test('用 argv 执行 svn --version --quiet', async () => {
    const result = await runner.run({ argv: ['svn', '--version', '--quiet'] });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+/);
  });

  test('macOS GUI 的精简 PATH 仍能找到 Homebrew SVN', async () => {
    const probe = Bun.spawn(
      [
        process.execPath,
        '-e',
        `import { CommandRunner } from './src/services/svn/commandRunner.ts';
const result = await new CommandRunner().run({ argv: ['svn', '--version', '--quiet'] });
process.stdout.write(result.stdout);`,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, PATH: '/usr/bin:/bin:/usr/sbin:/sbin' },
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(probe.stdout).text(),
      new Response(probe.stderr).text(),
      probe.exited,
    ]);

    expect(exitCode, stderr).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+/);
  });

  test('AbortSignal 会杀掉进程', async () => {
    const controller = new AbortController();
    const pending = runner.run({ argv: ['sleep', '8'], signal: controller.signal });
    controller.abort();
    try {
      await pending;
      throw new Error('expected CommandError');
    } catch (error) {
      expect(error).toBeInstanceOf(CommandError);
      if (error instanceof CommandError) {
        expect(error.message).toBe('aborted');
      }
    }
  });

  test('onStdout 流式回调 stdout', async () => {
    const chunks: string[] = [];
    const result = await runner.run({
      argv: ['/usr/bin/printf', 'hello\nworld\n'],
      onStdout: (chunk) => chunks.push(chunk),
    });
    expect(result.stdout).toContain('hello');
    expect(chunks.join('')).toContain('hello');
  });

  test('缺失可执行文件抛出 CommandError', async () => {
    try {
      await runner.run({ argv: ['svn-gpuix-missing-binary-xyz', '--version'] });
      throw new Error('expected CommandError');
    } catch (error) {
      expect(error).toBeInstanceOf(CommandError);
      if (error instanceof CommandError) {
        expect(error.exitCode).toBe(127);
      }
    }
  });
});
