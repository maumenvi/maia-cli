/** Checks whether JSON-RPC params use the required structured object or array form. */
export function isJsonRpcParams(value: unknown): boolean {
  return typeof value === 'undefined'
    || (typeof value === 'object' && value !== null);
}
