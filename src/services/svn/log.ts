import { DEFAULT_LOG_LIMIT, type SvnRevision } from '../../domain/revision';
import type { CommandRunner } from './commandRunner';
import { parseLogXml } from './parsers/logParser';

export function logArgv(limit = DEFAULT_LOG_LIMIT): string[] {
  // `.` 限定当前 working copy URL；HEAD:1 走该 URL 的 HEAD，
  // 避免 mixed-revision WC 用默认 BASE:1 漏掉刚提交的 revision。
  return ['svn', 'log', '--xml', '-v', '-l', String(limit), '-r', 'HEAD:1', '--', '.'];
}

export async function readRevisionLog(
  runner: CommandRunner,
  input: { cwd: string; limit?: number; signal?: AbortSignal },
): Promise<SvnRevision[]> {
  const argv = logArgv(input.limit);
  const result = await runner.run({
    argv,
    cwd: input.cwd,
    signal: input.signal,
  });
  return parseLogXml(result.stdout);
}
