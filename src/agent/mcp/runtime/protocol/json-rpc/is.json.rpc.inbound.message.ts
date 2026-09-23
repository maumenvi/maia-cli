import { isJsonRpcNotification } from './is.json.rpc.notification.ts';
import { isJsonRpcRequest } from './is.json.rpc.request.ts';
import type { JsonRpcInboundMessage } from './json.rpc.inbound.message.ts';

/** Validates any request-shaped JSON-RPC message accepted by an MCP server. */
export function isJsonRpcInboundMessage(value: unknown): value is JsonRpcInboundMessage {
  return isJsonRpcRequest(value) || isJsonRpcNotification(value);
}
