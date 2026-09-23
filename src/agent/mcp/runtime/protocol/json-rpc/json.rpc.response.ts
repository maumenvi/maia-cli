import type { JsonRpcFailure } from './json.rpc.failure.ts';
import type { JsonRpcSuccess } from './json.rpc.success.ts';

/** Represents either successful or failed JSON-RPC output. */
export type JsonRpcResponse<TResult = unknown> = JsonRpcSuccess<TResult> | JsonRpcFailure;

