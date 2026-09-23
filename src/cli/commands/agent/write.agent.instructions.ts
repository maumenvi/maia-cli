import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { AgentTarget } from '../../../agent/agents/contracts/agent.target.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { upsertMarkedBlock } from '../../shared/upsert.marked.block.ts';
import {
  CAPABILITY_BLOCK_END,
  CAPABILITY_BLOCK_START,
  renderAgentCapabilityBlock,
} from './render.agent.capability.block.ts';

/**
 * Upsert Maia's managed capability block into the agent's native instruction
 * file, creating the file (and parent directories) when needed and never
 * touching content outside the markers.
 */
export function writeAgentInstructions(store: AgentCatalogStore, target: AgentTarget): string | null {
  if (!target.instructionsFile) {
    return null;
  }

  const filePath = target.instructionsFile(store.getPaths().projectRoot);
  const current = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const next = upsertMarkedBlock(
    current,
    CAPABILITY_BLOCK_START,
    CAPABILITY_BLOCK_END,
    renderAgentCapabilityBlock(store, target),
  );

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, next, 'utf8');
  return filePath;
}
