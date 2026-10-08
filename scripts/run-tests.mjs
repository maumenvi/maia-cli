import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const artifactPaths = [
  'sources',
  'source.lock',
  '.env',
  'skills',
  'mcps',
  'tools',
  '.vscode/mcp.json',
];

const existedBefore = new Set(
  artifactPaths.filter((relativePath) => existsSync(path.resolve(rootDir, relativePath))),
);

function removeIfCreatedByTests(relativePath) {
  if (existedBefore.has(relativePath)) return;
  const absolutePath = path.resolve(rootDir, relativePath);
  if (!existsSync(absolutePath)) return;
  rmSync(absolutePath, { recursive: true, force: true });
}

function removeEmptyDirectory(relativePath) {
  const absolutePath = path.resolve(rootDir, relativePath);
  if (!existsSync(absolutePath)) return;
  if (readdirSync(absolutePath).length > 0) return;
  rmSync(absolutePath, { recursive: true, force: true });
}

let exitCode = 0;
// Tests must never read or write the developer's real global Maia config.
const configHome = mkdtempSync(path.join(os.tmpdir(), 'maia-test-config-'));

try {
  const testArguments = process.argv.includes('--coverage')
    ? [
        '--test',
        '--experimental-test-coverage',
        '--test-coverage-lines=80',
        '--test-coverage-branches=70',
        '--test-coverage-functions=80',
      ]
    : ['--test'];
  const result = spawnSync(process.execPath, testArguments, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      MAIA_CONFIG_HOME: configHome,
      CLINE_MCP_SETTINGS_PATH: path.join(configHome, 'cline', 'settings.json'),
      CLINE_DATA_DIR: path.join(configHome, 'cline-data'),
      XDG_CONFIG_HOME: path.join(configHome, 'xdg'),
      APPDATA: path.join(configHome, 'appdata'),
    },
  });

  if (result.error) {
    throw result.error;
  }

  exitCode = result.status ?? 1;
} finally {
  rmSync(configHome, { recursive: true, force: true });
  for (const relativePath of artifactPaths) {
    removeIfCreatedByTests(relativePath);
  }

  if (!existedBefore.has('.vscode/mcp.json')) {
    removeEmptyDirectory('.vscode');
  }
}

process.exit(exitCode);
