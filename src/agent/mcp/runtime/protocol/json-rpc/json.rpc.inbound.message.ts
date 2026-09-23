import type { JsonRpcNotification } from './json.rpc.notification.ts';
import type { JsonRpcRequest } from './json.rpc.request.ts';

/** Represents a structurally valid request or notification received by a JSON-RPC server. */
export type JsonRpcInboundMessage = JsonRpcRequest | JsonRpcNotification;
