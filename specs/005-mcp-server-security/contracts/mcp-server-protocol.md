# Contract: Protocolo do Servidor MCP (stdio)

**Feature**: `005-mcp-server-security` | **Requisitos**: FR-002, FR-003, FR-004 | **Critério**: SC-001

## Transporte

- **Canal**: stdin/stdout do processo `maia mcp-server`.
- **Framing**: JSON-RPC 2.0 newline-delimited (um objeto JSON por linha).
- **Invariante**: stdout é canal de protocolo exclusivo. Diagnósticos vão para stderr.
- **Fora de escopo**: HTTP, SSE, WebSocket. O Maia é cliente desses transportes para
  MCPs externos, mas não se expõe por eles.

## Invocação

```
maia mcp-server [--name <nome>] [--version <versão>] [--dynamic] [--agent <id>]
```

| Flag | Default | Efeito |
|------|---------|--------|
| `--name` | `maia-mcp-server` | Identidade reportada em `serverInfo.name`. |
| `--version` | `1.0.0` | Identidade reportada em `serverInfo.version`. |
| `--dynamic` | desligado | Recoleta capacidades a cada `tools/list` em vez de usar o cache da inicialização (FR-003). |
| `--agent` | ausente | Escopa os resultados às autorizações daquele agente (FR-003). Ausente ⇒ política default do catálogo. |

## Métodos

### `initialize` (era legada, stateful)

**Params**: `{ protocolVersion?: string, clientInfo?: {...}, capabilities?: {...} }`

| Entrada | Resposta |
|---------|----------|
| `protocolVersion` ausente | `result` com a revisão default (`2025-11-25`) |
| `protocolVersion` ∈ `{2025-11-25, 2025-06-18, 2024-11-05}` | `result` ecoando a revisão pedida |
| `protocolVersion` presente, não suportada | **`error -32602`** com `data.supported` |

**Mudança desta feature**: a terceira linha. Hoje retorna sucesso com a revisão
trocada silenciosamente.

```jsonc
// Requisição incompatível
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"1999-01-01"}}

// Resposta exigida
{"jsonrpc":"2.0","id":1,"error":{
  "code":-32602,
  "message":"Unsupported MCP protocol version 1999-01-01",
  "data":{"requested":"1999-01-01","supported":["2025-11-25","2025-06-18","2024-11-05"]}
}}
```

### `server/discover` (era moderna, stateless)

Anuncia `supportedVersions: ["2026-07-28"]`, `capabilities.tools`, e `_meta` com a
identidade do servidor. Sem mudança nesta feature.

### `tools/list`

Retorna as capacidades **instaladas, habilitadas e autorizadas** para o agente
identificado. Com `--dynamic`, recoleta no momento da consulta.

Capacidade não autorizada para o agente **não é listada** — ela é filtrada na coleta,
não barrada na resposta.

Forma do resultado por era:
- Moderna: `{ resultType: 'complete', tools: [...], _meta: {...} }`
- Legada: `{ tools: [...] }`

### `tools/call`

**Params**: `{ name: string, arguments?: object }`

Nomes seguem a convenção:
- `<nome>` — pacote de skill ou tool instalado.
- `<servidor>__<ferramenta>` — ferramenta proxiada de um MCP registrado.

Ferramenta inexistente ou não autorizada retorna `isError: true` com texto
explicativo, **não** um erro JSON-RPC — é falha de aplicação, não de protocolo.

### `ping`, `shutdown`

Disponíveis apenas na era legada. `shutdown` encerra as sessões de MCP filhas.

## Validação de entrada

| Entrada | Código | Mensagem |
|---------|--------|----------|
| JSON inválido | `-32700` | `Parse error` |
| Não é request nem notification | `-32600` | `Invalid Request` |
| `_meta` com revisão moderna desconhecida | `-32022` | `Unsupported MCP protocol version <v>` |
| `initialize` com revisão legada desconhecida | `-32602` | `Unsupported MCP protocol version <v>` |
| Método desconhecido | `-32601` | `Method not found: <método>` |

**SC-001**: nenhuma entrada inválida pode produzir sucesso, ser ignorada em silêncio,
ou derrubar o processo. Toda rejeição carrega código e mensagem identificáveis.

## Encerramento

Ao fechar stdin, o servidor para de aceitar requisições, encerra as sessões filhas com
teto de tempo, e sai — `0` na conclusão limpa, `1` se o teto for atingido. Nenhum
processo de MCP filho pode sobreviver ao pai.
