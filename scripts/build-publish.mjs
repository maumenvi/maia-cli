import { execSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const dataDir = path.resolve(rootDir, 'data');
const distDataDir = path.resolve(distDir, 'data');

const copyJsonFilesRecursively = (sourceDir, targetDir) => {
  const entries = readdirSync(sourceDir);
  for (const entry of entries) {
    const sourcePath = path.resolve(sourceDir, entry);
    const targetPath = path.resolve(targetDir, entry);
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      mkdirSync(targetPath, { recursive: true });
      copyJsonFilesRecursively(sourcePath, targetPath);
      continue;
    }

    if (!entry.endsWith('.json')) {
      continue;
    }

    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, readFileSync(sourcePath));
  }
};

rmSync(distDir, { recursive: true, force: true });
execSync('npx tsc -p tsconfig.publish.json', { cwd: rootDir, stdio: 'inherit' });
if (existsSync(dataDir)) {
  copyJsonFilesRecursively(dataDir, distDataDir);
}
chmodSync(path.resolve(distDir, 'src', 'cli', 'index.js'), 0o755);
execSync('node scripts/check-dist-version.mjs', { cwd: rootDir, stdio: 'inherit' });
