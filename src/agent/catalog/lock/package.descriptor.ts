import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import type { AccessDefaultPolicy } from '../../access/policy/access.default.policy.ts';
import { resolveAllowedLlms } from '../../access/policy/resolve.allowed.llms.ts';
import { normalizeVersion } from '../shared/version.ts';
import type { CatalogDependencyBase } from '../types/dependencies/catalog.dependency.base.ts';
import type { McpDependency } from '../types/dependencies/mcp.dependency.ts';
import type { ToolDependency } from '../types/dependencies/tool.dependency.ts';
import type { CatalogKind } from '../types/kinds.ts';
import type { LockPackage } from '../types/lock/lock.package.ts';
import type { SourceLock } from '../types/lock/source.lock.ts';
import type { RegistryEntry } from '../types/registry.ts';
import { computeLockIntegrity } from './integrity/compute.lock.integrity.ts';

/** Performs the create package descriptor operation. */
export function createPackageDescriptor(
  kind: CatalogKind,
  name: string,
  dependency: CatalogDependencyBase,
  sourceInfo: SourceLock['sources'][string],
  registryEntry?: RegistryEntry,
  defaultAccessPolicy: AccessDefaultPolicy = 'allow',
  workspaceRoot = process.cwd(),
): LockPackage {
  const version = normalizeVersion(registryEntry?.version ?? dependency.version);
  const descriptor: LockPackage = {
    name,
    type: kind,
    version,
    source: dependency.source,
    resolvedFrom: dependency.version,
    path: dependency.path ?? registryEntry?.path ?? `${kind}s/${name}`,
    integrity: '',
    enabled: dependency.enabled ?? true,
    capabilities: [...(dependency.capabilities ?? registryEntry?.capabilities ?? [])],
    constraints: [...(dependency.constraints ?? [])],
    allowedLlms: resolveAllowedLlms(dependency.allowedLlms ?? registryEntry?.allowedLlms, defaultAccessPolicy),
    sourceCommit: sourceInfo.commit,
    provenance: {
      repo: sourceInfo.url,
      ref: sourceInfo.ref ?? 'main',
      trusted: sourceInfo.trusted ?? false,
    },
  };

  if (kind === 'mcp') {
    const mcpDependency = dependency as McpDependency;
    const vscodeConfig = mcpDependency.vscode ?? registryEntry?.vscode;
    if (!vscodeConfig) {
      throw new Error(`MCP "${name}" requires a "vscode" field in sources or registry`);
    }
    if (vscodeConfig.transport === 'http' && !vscodeConfig.url) {
      throw new Error(`MCP "${name}" requires "vscode.url" when transport is "http"`);
    }
    if (vscodeConfig.transport === 'sse' && !vscodeConfig.url) {
      throw new Error(`MCP "${name}" requires "vscode.url" when transport is "sse"`);
    }
    if (vscodeConfig.transport === 'ws' && !vscodeConfig.url) {
      throw new Error(`MCP "${name}" requires "vscode.url" when transport is "ws"`);
    }
    if (vscodeConfig.transport === 'npx' && !vscodeConfig.package) {
      throw new Error(`MCP "${name}" requires "vscode.package" when transport is "npx"`);
    }
    if ((vscodeConfig.transport === 'stdio' || typeof vscodeConfig.transport === 'undefined') && !vscodeConfig.command) {
      throw new Error(`MCP "${name}" requires "vscode.command" when transport is "stdio"`);
    }
    descriptor.vscode = vscodeConfig;
  }

  if (kind === 'tool') {
    const toolDependency = dependency as ToolDependency;
    descriptor.inputSchema = toolDependency.inputSchema ?? registryEntry?.inputSchema;
  }

  if (descriptor.path) {
    const resolvedPath = path.isAbsolute(descriptor.path)
      ? descriptor.path
      : path.resolve(workspaceRoot, descriptor.path);
    if (existsSync(resolvedPath) && statSync(resolvedPath).isFile()) {
      const hash = createHash('sha256').update(readFileSync(resolvedPath)).digest('hex');
      descriptor.artifactHash = `sha256:${hash}`;
    }
  }

  descriptor.integrity = computeLockIntegrity(descriptor);

  return descriptor;
}
