import { globalMcpEnvPath } from '../../../config/core/global.mcp.env.path.ts';
import { readEnvLayer } from '../../../config/core/read.env.layer.ts';

/**
 * Names in the per-user global credentials file: by default only those with
 * a value; with `includeEmpty`, also placeholders the user chose to keep
 * there (so no duplicate placeholder is added to the project).
 */
export function globalEnvNames(includeEmpty = false): Set<string> {
  const { values } = readEnvLayer(globalMcpEnvPath());
  return new Set([...values].filter(([, value]) => includeEmpty || value.length > 0).map(([name]) => name));
}
