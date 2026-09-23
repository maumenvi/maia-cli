import type { MCPConfig } from '../../../tools/contracts/mcp.config.ts';
import type { CatalogKind } from '../kinds.ts';

/** Describes the lock package contract. */
export interface LockPackage {
  name: string;
  type: CatalogKind;
  version: string;
  source: string;
  resolvedFrom: string;
  path: string;
  integrity: string;
  enabled: boolean;
  capabilities: string[];
  constraints: string[];
  allowedLlms: string[];
  sourceCommit?: string;
  artifactHash?: string;
  provenance: {
    repo: string;
    ref: string;
    trusted: boolean;
  };
  vscode?: MCPConfig;
  inputSchema?: Record<string, unknown>;
}
