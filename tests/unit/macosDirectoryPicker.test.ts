import { describe, expect, test } from 'bun:test';
import { CommandError, type CommandRequest, type CommandResult } from '../../src/services/svn/commandRunner';
import { isPickerCanceled, MacOSDirectoryPicker } from '../../src/services/picker/macosDirectoryPicker';

class FakeRunner {
  constructor(private readonly impl: (request: CommandRequest) => Promise<CommandResult>) {}
  run(request: CommandRequest) {
    return this.impl(request);
  }
}

describe('MacOSDirectoryPicker', () => {
  test('用 osascript argv 打开文件夹选择器并去掉尾斜杠', async () => {
    const picker = new MacOSDirectoryPicker(
      new FakeRunner(async (request) => {
        expect(request.argv[0]).toBe('osascript');
        expect(request.argv[1]).toBe('-e');
        expect(request.argv[2]).toContain('choose folder with prompt "Open SVN Working Copy"');
        expect(request.argv[2]).toContain('on error number -128');
        return { exitCode: 0, stdout: '/Users/dev/project/\n', stderr: '' };
      }) as never,
    );

    expect(await picker.pickDirectory()).toBe('/Users/dev/project');
  });

  test('AppleScript 取消返回空字符串时得到 null', async () => {
    const picker = new MacOSDirectoryPicker(
      new FakeRunner(async () => ({ exitCode: 0, stdout: '\n', stderr: '' })) as never,
    );
    expect(await picker.pickDirectory()).toBeNull();
  });

  test('用户取消返回 null', async () => {
    const picker = new MacOSDirectoryPicker(
      new FakeRunner(async () => {
        throw new CommandError({
          command: ['osascript'],
          exitCode: 1,
          stdout: '',
          stderr: '0:27: execution error: User canceled. (-128)\n',
        });
      }) as never,
    );

    expect(await picker.pickDirectory()).toBeNull();
  });

  test('中文取消文案也当作取消', async () => {
    const picker = new MacOSDirectoryPicker(
      new FakeRunner(async () => {
        throw new CommandError({
          command: ['osascript'],
          exitCode: 1,
          stdout: '',
          stderr: '0:27: execution error: 用户已取消。 (-128)\n',
        });
      }) as never,
    );
    expect(await picker.pickDirectory()).toBeNull();
  });

  test('osascript exit 1 且 stderr 为空当作取消', async () => {
    const error = new CommandError({
      command: ['osascript', '-e', 'script'],
      exitCode: 1,
      stdout: '',
      stderr: '',
    });
    expect(isPickerCanceled(error)).toBe(true);
    const picker = new MacOSDirectoryPicker(
      new FakeRunner(async () => {
        throw error;
      }) as never,
    );
    expect(await picker.pickDirectory()).toBeNull();
  });
});
