# Contract: arquivo de registro por agente (US1, US2, US4, US5)

Formato **literal** que o teste de contrato de cada agente compara (FR-010). Em todos: nenhum
caminho absoluto da máquina; outras chaves do arquivo são preservadas; um segundo run sem
mudança imprime `No change in <Agente> config: <caminho>` e não reescreve o arquivo.

## `cursor` — `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "maia": {
      "type": "stdio",
      "command": "maia",
      "args": ["mcp-server", "--agent", "cursor"],
      "env": { "MAIA_PROJECT_DIR": "${workspaceFolder}" }
    }
  }
}
```

| Situação | Efeito | Saída |
|----------|--------|-------|
| Arquivo com `servers.maia` (legado) | `servers.maia` removido; `mcpServers.maia` gravado; `servers` com outras chaves fica | `Moved the "maia" proxy from .cursor/mcp.json (servers) to .cursor/mcp.json (mcpServers).` |
| `maia` em `servers` e em `mcpServers` | `mcpServers.maia` atualizado, `servers.maia` removido | mesma mensagem |
| `servers` fica vazio após a remoção | a chave `servers: {}` é mantida | — |

Fonte: https://cursor.com/docs/mcp

## `continue` — `.continue/mcpServers/maia.yaml`

```yaml
name: Maia
version: 0.0.1
schema: v1
mcpServers:
  - name: maia
    type: stdio
    command: "maia"
    args:
      - "mcp-server"
      - "--agent"
      - "continue"
```

| Situação | Efeito | Saída |
|----------|--------|-------|
| `.continue/config.json` com `mcpServers.maia` | só essa chave sai; o arquivo fica | `Moved the "maia" proxy from .continue/config.json to .continue/mcpServers/maia.yaml.` |
| Outros arquivos em `.continue/mcpServers/` | intocados | — |

Fonte: https://docs.continue.dev/customize/deep-dives/mcp

## `zed` — `.zed/settings.json`

```json
{ "context_servers": { "maia": { "command": "maia", "args": ["mcp-server", "--agent", "zed"] } } }
```

A forma antiga `{ "command": { "path": "maia", "args": [...] } }` é substituída por esta.
Fonte: https://zed.dev/docs/ai/mcp

## `codex` — `.codex/config.toml`

```toml
[mcp_servers.maia]
command = "maia"
args = ["mcp-server", "--agent", "codex"]
```

A forma inline antiga (`maia = { … }` sob `[mcp_servers]`) é removida; outras entradas de
`[mcp_servers]` e outras tabelas ficam. Saída e bloco de instruções incluem:
`Codex applies .codex/config.toml only in trusted projects: trust this project when Codex asks.`
Fonte: https://learn.chatgpt.com/docs/extend/mcp?surface=cli

## `cline` — ver [cline.global.md](./cline.global.md)

`.cline/mcp.json` legado: `servers.maia` removido, saída
`Removed the "maia" proxy from .cline/mcp.json: Cline reads only its global MCP settings.`

## `claude`, `copilot` — sem mudança (009)

Cobertos pelo teste de contrato com o formato já validado:

- `.mcp.json`: `{ "mcpServers": { "maia": { "command": "maia", "args": ["mcp-server", "--agent", "claude"] } } }`
- `.vscode/mcp.json`: `{ "servers": { "maia": { "command": "maia", "args": ["mcp-server", "--agent", "copilot"], "cwd": "${workspaceFolder}" } } }`

## `maia mcp-server` — raiz do projeto

Ordem: `MAIA_PROJECT_DIR` → `CLAUDE_PROJECT_DIR` → subir a partir da pasta atual. Uma
variável que não leva a um projeto (inclusive o texto literal `${workspaceFolder}`) é
ignorada e a próxima é tentada. Sem raiz: mensagem e exit 1 da 009, sem criar arquivos.

## Arquivo inválido

JSON/TOML ilegível → nada é escrito naquele agente, exit 1,
`maia: Cannot update <caminho>: invalid JSON (<erro>). Fix or remove it and run "maia i".`
