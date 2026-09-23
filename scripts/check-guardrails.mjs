#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadGuardrailConfig } from '../src/guardrails/config/load.guardrail.config.ts';
import { evaluateGuardrail } from '../src/guardrails/policy/evaluate.guardrail.ts';
import { formatGuardrailDecision } from '../src/guardrails/audit/format.guardrail.decision.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Returns the staged paths git reports for this commit. */
function stagedPaths() {
  const result = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) return [];
  return result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

const targets = process.argv.slice(2).length > 0 ? process.argv.slice(2) : stagedPaths();
const loaded = loadGuardrailConfig(rootDir);

if (loaded.state === 'malformed') {
  console.error(`Guardrail config is malformed: ${loaded.reason}`);
  console.error('Blocking every destructive action until it is fixed.');
  process.exit(2);
}

const blocked = [];
for (const target of targets) {
  const decision = evaluateGuardrail(
    { kind: 'file-overwrite', targetPath: target, reason: 'staged change' },
    {
      workspaceRoot: rootDir,
      config: loaded.state === 'loaded' ? loaded.config : undefined,
    },
  );
  if (decision.outcome === 'block') blocked.push(formatGuardrailDecision(decision));
}

if (blocked.length > 0) {
  console.error('Guardrail blocked the following change(s):');
  for (const entry of blocked) console.error(entry);
  process.exit(1);
}

console.log(`Guardrail OK for ${targets.length} staged path(s)`);
