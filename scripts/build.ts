import { spawnSync } from 'node:child_process';
import { chmod, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const binary = path.join(dist, 'revision');
const appName = 'Revision';
const appBundle = path.join(dist, `${appName}.app`);
const sourceIcon = path.join(root, 'assets', 'app-icon.svg');
const masterIcon = path.join(dist, 'app-icon.png');
const iconset = path.join(dist, 'AppIcon.iconset');
const icns = path.join(dist, 'AppIcon.icns');

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status === 0) return;

  const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  throw new Error(`${command} ${args.join(' ')} failed${detail ? `\n${detail}` : ''}`);
}

function tryRun(command: string, args: string[]): boolean {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).status === 0;
}

async function compileBinary(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [path.join(root, 'src', 'main.tsx')],
    compile: {
      outfile: binary,
    },
  });

  if (result.success) return;

  for (const message of result.logs) {
    console.error(message);
  }
  throw new Error('bun build --compile failed');
}

async function renderMasterIcon(): Promise<void> {
  const converted = tryRun('sips', [
    '-s',
    'format',
    'png',
    '--resampleHeightWidth',
    '1024',
    '1024',
    sourceIcon,
    '--out',
    masterIcon,
  ]);
  if (converted) return;

  // Some macOS versions do not expose SVG conversion through sips. Quick Look
  // ships with macOS and can rasterize this flat, text-free SVG without adding
  // a graphics dependency to the project.
  const quickLookDir = path.join(dist, '.icon-quicklook');
  await rm(quickLookDir, { recursive: true, force: true });
  await mkdir(quickLookDir, { recursive: true });
  run('qlmanage', ['-t', '-s', '1024', '-o', quickLookDir, sourceIcon]);
  await copyFile(path.join(quickLookDir, `${path.basename(sourceIcon)}.png`), masterIcon);
  await rm(quickLookDir, { recursive: true, force: true });
}

async function buildMacIcon(): Promise<void> {
  await renderMasterIcon();
  await rm(iconset, { recursive: true, force: true });
  await mkdir(iconset, { recursive: true });

  const sizes = [
    [16, 'icon_16x16.png'],
    [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'],
    [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'],
    [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'],
    [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'],
    [1024, 'icon_512x512@2x.png'],
  ] as const;

  for (const [pixels, name] of sizes) {
    run('sips', [
      '-z',
      String(pixels),
      String(pixels),
      masterIcon,
      '--out',
      path.join(iconset, name),
    ]);
  }

  run('iconutil', ['-c', 'icns', iconset, '-o', icns]);
  await rm(iconset, { recursive: true, force: true });
}

async function wrapMacApp(version: string): Promise<void> {
  await buildMacIcon();
  await rm(appBundle, { recursive: true, force: true });

  const macos = path.join(appBundle, 'Contents', 'MacOS');
  const resources = path.join(appBundle, 'Contents', 'Resources');
  await mkdir(macos, { recursive: true });
  await mkdir(resources, { recursive: true });

  const executable = path.join(macos, 'revision');
  await copyFile(binary, executable);
  await chmod(executable, 0o755);
  await copyFile(icns, path.join(resources, 'AppIcon.icns'));

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>${appName}</string>
  <key>CFBundleExecutable</key>
  <string>revision</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>io.github.cl1107.revision</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>${appName}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${version}</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`;

  await writeFile(path.join(appBundle, 'Contents', 'Info.plist'), plist, 'utf8');
}

async function main(): Promise<void> {
  const packageJson = await Bun.file(path.join(root, 'package.json')).json() as { version: string };

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await compileBinary();

  if (process.platform === 'darwin') {
    await wrapMacApp(packageJson.version);
    console.log(`Built ${path.relative(root, binary)} and ${path.relative(root, appBundle)}`);
    return;
  }

  console.log(`Built ${path.relative(root, binary)} (macOS app bundle skipped on ${process.platform})`);
}

await main();
