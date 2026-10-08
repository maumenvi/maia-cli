import { createHash } from 'node:crypto';
import path from 'node:path';

/** Creates a stable, project-specific key for Cline's global server map. */
export function clineEntryKey(projectRoot: string): string {
  const absoluteRoot = path.resolve(projectRoot);
  const slug = path.basename(absoluteRoot)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'project';
  const hash = createHash('sha256').update(absoluteRoot).digest('hex').slice(0, 8);
  return `maia-${slug}-${hash}`;
}
