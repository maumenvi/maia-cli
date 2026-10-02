import { globalMcpEnvPath } from '../../../config/core/global.mcp.env.path.ts';
import { readEnvLayer } from '../../../config/core/read.env.layer.ts';

/** Names that already have a non-empty value in the per-user global credentials file. */
export function globalEnvNames(): Set<string> {
  const { values } = readEnvLayer(globalMcpEnvPath());
  return new Set([...values].filter(([, value]) => value.length > 0).map(([name]) => name));
}
