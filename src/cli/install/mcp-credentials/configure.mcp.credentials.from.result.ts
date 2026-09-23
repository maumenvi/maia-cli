import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { ensureMcpEnvFileEntries } from './ensure.mcp.env.file.entries.ts';
import { extractCredentialRequirements } from './extract.credential.requirements.ts';
import { parseEnvFile } from './parse.env.file.ts';
import { syncEnvFile } from './sync.env.file.ts';

/** Performs the configure mcp credentials from result operation. */
export async function configureMcpCredentialsFromResult(
  store: AgentCatalogStore,
  result: CatalogSearchResult,
): Promise<void> {
  const requirements = extractCredentialRequirements(result);
  if (requirements.length === 0) {
    ensureMcpEnvFileEntries(store, 'install' in result && result.install.type === 'mcp' ? result.install.vscode : undefined);
    return;
  }

  const envFile = store.getPaths().mcpEnv;
  const existing = existsSync(envFile) ? parseEnvFile(readFileSync(envFile, 'utf8')) : new Map<string, string>();
  const toPersist: Record<string, string> = {};

  console.log(`MCP "${result.name}" may require specific credentials. We will configure them in .maia/mcp.env: ${envFile}`);
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  // The pasted value stays visible so a mistyped or truncated key can be spotted
  // before it is written. It is the only place a credential is shown, and it
  // never reaches a log or a versioned file.
  const input = interactive
    ? createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    : null;

  try {
    for (const requirement of requirements) {
      const hasProcessValue = Boolean(process.env[requirement.envName]);
      const hasEnvFileValue = Boolean(existing.get(requirement.envName));
      if (hasProcessValue || hasEnvFileValue) {
        continue;
      }

      if (requirement.description) {
        console.log(`- ${requirement.envName}: ${requirement.description}`);
      } else {
        console.log(`- ${requirement.envName}`);
      }
      if (requirement.sourceUrl) {
        console.log(`  URL: ${requirement.sourceUrl}`);
      }

      if (!input) {
        console.log(`  Set ${requirement.envName} manually in .maia/mcp.env to enable this MCP.`);
        toPersist[requirement.envName] = '';
        continue;
      }

      const value = (await input.question(
        `  Paste the value for ${requirement.envName} (visible; Enter to skip): `,
      )).trim();
      toPersist[requirement.envName] = value;
    }
  } finally {
    input?.close();
  }

  if (Object.keys(toPersist).length > 0 || requirements.length > 0) {
    syncEnvFile(envFile, toPersist, requirements.map((requirement) => requirement.envName));
  }

  if (Object.keys(toPersist).length > 0) {
    console.log(`Credentials file updated at ${envFile}`);
  }
}
