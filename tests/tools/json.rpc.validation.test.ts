import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isJsonRpcInboundMessage } from '../../src/agent/mcp/runtime/protocol/json-rpc/is.json.rpc.inbound.message.ts';
import { isJsonRpcNotification } from '../../src/agent/mcp/runtime/protocol/json-rpc/is.json.rpc.notification.ts';
import { isJsonRpcRequest } from '../../src/agent/mcp/runtime/protocol/json-rpc/is.json.rpc.request.ts';
import { isJsonRpcResponse } from '../../src/agent/mcp/runtime/protocol/json-rpc/is.json.rpc.response.ts';

describe('JSON-RPC runtime validation', () => {
  it('accepts structurally valid requests and notifications', () => {
    assert.equal(isJsonRpcRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'echo' },
    }), true);
    assert.equal(isJsonRpcNotification({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    }), true);
  });

  it('rejects malformed protocol fields and primitive params', () => {
    assert.equal(isJsonRpcInboundMessage({ id: 1, method: 'tools/list' }), false);
    assert.equal(isJsonRpcInboundMessage({ jsonrpc: '1.0', id: 1, method: 'tools/list' }), false);
    assert.equal(isJsonRpcInboundMessage({ jsonrpc: '2.0', id: {}, method: 'tools/list' }), false);
    assert.equal(isJsonRpcInboundMessage({ jsonrpc: '2.0', id: 1, method: '' }), false);
    assert.equal(isJsonRpcInboundMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: 'invalid' }), false);
  });

  it('requires exactly one valid result or error response member', () => {
    assert.equal(isJsonRpcResponse({ jsonrpc: '2.0', id: 1, result: {} }), true);
    assert.equal(isJsonRpcResponse({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32600, message: 'Invalid Request' },
    }), true);
    assert.equal(isJsonRpcResponse({ jsonrpc: '2.0', id: 1 }), false);
    assert.equal(isJsonRpcResponse({ jsonrpc: '2.0', id: 1, result: {}, error: {} }), false);
    assert.equal(isJsonRpcResponse({ jsonrpc: '2.0', id: 1, error: { code: 'bad', message: 1 } }), false);
  });
});
