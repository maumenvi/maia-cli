/**
 * Which variables to set before starting an MCP. Precedence: a non-empty
 * value already in the process, then a non-empty project value, then the
 * global value. An empty project entry (`X=`) never hides the global one.
 */
export function mergeEnvLayers(
  processEnv: Record<string, string | undefined>,
  project: Map<string, string>,
  global: Map<string, string>,
): Record<string, string> {
  const toSet: Record<string, string> = {};
  for (const layer of [project, global]) {
    for (const [key, value] of layer) {
      if (!value || processEnv[key] || toSet[key]) continue;
      toSet[key] = value;
    }
  }
  return toSet;
}
