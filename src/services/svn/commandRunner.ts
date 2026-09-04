export interface CommandRequest {
  argv: string[];
  cwd?: string;
  signal?: AbortSignal;
  onStdout?: (chunk: string) => void;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class CommandError extends Error {
  readonly command: string[];
  readonly cwd: string | undefined;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;

  constructor(input: {
    command: string[];
    cwd?: string;
    exitCode: number;
    stdout: string;
    stderr: string;
    message?: string;
  }) {
    super(input.message ?? commandErrorMessage(input));
    this.name = 'CommandError';
    this.command = input.command;
    this.cwd = input.cwd;
    this.exitCode = input.exitCode;
    this.stdout = input.stdout;
    this.stderr = input.stderr;
  }
}

const MACOS_COMMAND_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/opt/local/bin',
] as const;

function commandEnvironment(): Record<string, string | undefined> | undefined {
  if (process.platform !== 'darwin') return undefined;

  // Finder-launched apps may omit PATH entirely; the standard package-manager
  // locations remain the product-defined search path in that environment.
  const inheritedPath = process.env.PATH;
  const inheritedPaths = inheritedPath === undefined
    ? []
    : inheritedPath.split(':').filter((path) => path.length > 0);
  const searchPaths = [...inheritedPaths];
  for (const path of MACOS_COMMAND_PATHS) {
    if (!searchPaths.includes(path)) searchPaths.push(path);
  }

  return { ...process.env, PATH: searchPaths.join(':') };
}

function commandErrorMessage(input: {
  command: string[];
  exitCode: number;
  stderr: string;
}): string {
  const detail = input.stderr.trim();
  if (detail) return detail;
  return `${input.command.join(' ')} exited with ${input.exitCode}`;
}

async function readSpawnOutput(
  stream: ReadableStream<Uint8Array> | number | undefined,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  if (!stream || typeof stream === 'number') return '';
  if (!onChunk) return new Response(stream).text();

  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let output = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    output += chunk;
    onChunk(chunk);
  }
  const tail = decoder.decode();
  if (tail) {
    output += tail;
    onChunk(tail);
  }
  return output;
}

function isExecutableMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message) : '';
  return code === 'ENOENT' || message.includes('ENOENT') || message.includes('No such file');
}

/** 统一 process 入口：argv 数组、禁止 shell。 */
export class CommandRunner {
  async run(request: CommandRequest): Promise<CommandResult> {
    if (request.argv.length === 0) {
      throw new CommandError({
        command: request.argv,
        cwd: request.cwd,
        exitCode: 1,
        stdout: '',
        stderr: 'empty argv',
      });
    }

    if (request.signal?.aborted) {
      throw new CommandError({
        command: request.argv,
        cwd: request.cwd,
        exitCode: 1,
        stdout: '',
        stderr: 'aborted',
        message: 'aborted',
      });
    }

    let proc: ReturnType<typeof Bun.spawn>;
    try {
      proc = Bun.spawn(request.argv, {
        cwd: request.cwd,
        env: commandEnvironment(),
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'ignore',
      });
    } catch (error) {
      if (isExecutableMissing(error)) {
        throw new CommandError({
          command: request.argv,
          cwd: request.cwd,
          exitCode: 127,
          stdout: '',
          stderr: String(error),
          message: 'executable not found',
        });
      }
      throw error;
    }

    const abort = () => {
      proc.kill();
    };
    request.signal?.addEventListener('abort', abort, { once: true });
    if (request.signal?.aborted) abort();

    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        readSpawnOutput(proc.stdout, request.onStdout),
        readSpawnOutput(proc.stderr),
        proc.exited,
      ]);

      if (request.signal?.aborted) {
        throw new CommandError({
          command: request.argv,
          cwd: request.cwd,
          exitCode,
          stdout,
          stderr,
          message: 'aborted',
        });
      }

      const result: CommandResult = { exitCode, stdout, stderr };
      if (exitCode !== 0) {
        throw new CommandError({
          command: request.argv,
          cwd: request.cwd,
          exitCode,
          stdout,
          stderr,
        });
      }
      return result;
    } finally {
      request.signal?.removeEventListener('abort', abort);
    }
  }
}
