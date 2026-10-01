#!/usr/bin/env node
/**
 * Fails the publish build when the compiled dist/ exposes a Maia version other
 * than the one declared in package.json (feature 007, FR-008).
 *
 * `--expected <version>` replaces the package.json value; it only exists to
 * exercise the failure path.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distSrc = path.resolve(rootDir, 'dist', 'src');

const expectedFlag = process.argv.indexOf('--expected');
const expected = expectedFlag >= 0
  ? process.argv[expectedFlag + 1]
  : JSON.parse(readFileSync(path.resolve(rootDir, 'package.json'), 'utf8')).version;

const load = (relativePath) => import(pathToFileURL(path.resolve(distSrc, relativePath)).href);

const { readMaiaPackageVersion } = await load('shared/package/read.maia.package.version.js');
const { createDefaultManifest } = await load('agent/catalog/manifest/defaults.js');
const { createModernResultMeta } = await load('agent/mcp/runtime/protocol/json-rpc/create.modern.result.meta.js');

const points = {
  readMaiaPackageVersion: readMaiaPackageVersion(),
  'manifest sources.local.ref': createDefaultManifest().sources.local.ref,
  'MCP serverInfo.version': createModernResultMeta()['io.modelcontextprotocol/serverInfo'].version,
};

const mismatches = Object.entries(points).filter(([, version]) => version !== expected);
for (const [point, version] of mismatches) {
  console.error(`Dist version mismatch: ${point} reports ${version}, package.json has ${expected}`);
}
if (mismatches.length > 0) process.exit(1);

console.log(`Dist version check passed: ${expected}`);
