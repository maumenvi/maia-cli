import { createModernRequestMeta } from '../protocol/json-rpc/create.modern.request.meta.ts';

/** Adds the required modern MCP `_meta` envelope to request parameters. */
export function withModernRequestMeta(params: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...params,
    _meta: createModernRequestMeta(),
  };
}

