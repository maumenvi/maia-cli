import type { LockVerificationProblem } from '../../../agent/catalog/lock/verify/lock.verification.problem.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { SourceLock } from '../../../agent/catalog/types/lock/source.lock.ts';
import { findToolkit } from '../../../agent/toolkits/catalog/find.toolkit.ts';
import { detectToolkitState } from './detect.toolkit.state.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/** Checks locked toolkits by presence and version only — never by file hash (FR-019). */
export function verifyToolkits(
  store: Pick<AgentCatalogStore, 'getPaths'>,
  lock: SourceLock,
  io: Pick<ToolkitIo, 'runner' | 'catalog'>,
): LockVerificationProblem[] {
  const problems: LockVerificationProblem[] = [];
  for (const entry of Object.values(lock.toolkits ?? {})) {
    const packageId = `toolkit:${entry.name}`;
    const definition = findToolkit(entry.name, io.catalog);
    if (!definition) {
      problems.push({ packageId, kind: 'toolkit', message: `${packageId} is not in Maia's built-in catalog` });
      continue;
    }
    const { state, projectVersion } = detectToolkitState(definition, entry, store.getPaths().projectRoot, io);
    if (state === 'absent') {
      problems.push({ packageId, kind: 'toolkit', message: `${packageId} is not installed` });
    } else if (state === 'mismatch') {
      problems.push({ packageId, kind: 'toolkit', message: `${packageId} is at ${projectVersion} but maia.lock.json requires ${entry.version}` });
    } else if (state === 'global-tool-missing') {
      problems.push({ packageId, kind: 'toolkit', message: `${packageId} global tool is missing or at another version (requires ${entry.version})` });
    }
  }
  return problems;
}
