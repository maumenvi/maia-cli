# Contract: registro do proxy nos agentes (US1)

## `claude`

| Situação | Arquivo escrito | Saída |
|----------|-----------------|-------|
| Sem `.mcp.json` | cria `.mcp.json` | `Created Claude config: <raiz>/.mcp.json` |
| `.mcp.json` existe | atualiza só `mcpServers.maia` | `Updated Claude config: <raiz>/.mcp.json` |
| Legado `.claude/claude_desktop_config.json` com `mcpServers.maia` | remove só essa chave; o arquivo continua existindo | `Moved the "maia" proxy from .claude/claude_desktop_config.json to .mcp.json.` |
| `.mcp.json` com JSON inválido | nada é escrito; exit 1 | `maia: Cannot update <raiz>/.mcp.json: invalid JSON (<erro>). Fix or remove it and run "maia i".` |

Entrada gravada em `.mcp.json`:

```json
{ "mcpServers": { "maia": { "command": "maia", "args": ["mcp-server", "--agent", "claude"] } } }
```

As outras chaves de `mcpServers` e as outras chaves do topo do arquivo são preservadas.

## Demais agentes (nenhum caminho absoluto)

| Agente | Arquivo | `cwd` |
|--------|---------|-------|
| `copilot` | `.vscode/mcp.json` | `"${workspaceFolder}"` |
| `cursor` | `.cursor/mcp.json` | `"${workspaceFolder}"` |
| `zed` | `.zed/settings.json` | ausente |
| `codex` | `.codex/config.toml` | ausente |
| `continue` | `.continue/config.json` | ausente |
| `cline` | `.cline/mcp.json` | ausente |

## `maia mcp-server` sem projeto

A raiz vem de `CLAUDE_PROJECT_DIR` (se for um projeto), senão de subir a partir da pasta atual.
Sem raiz: exit 1 e stderr
`maia: no Maia project found from <cwd> (set the agent's working directory to the project or run "maia init <agent>" there).`
Nenhum arquivo é criado.

## `.maia/agents/<id>/capabilities.json`

`mcpServer` sem `cwd` para todos os agentes.

## Bloco gerenciado (`CLAUDE.md`, `AGENTS.md`, …)

| Registro | Frase após `## Maia capabilities` |
|----------|-----------------------------------|
| `registered` | `The \`maia\` MCP proxy is registered for this agent in \`<caminho relativo>\`; the capabilities below are reachable through it.` (+ frase de skills nativas quando houver `skillsDir`) |
| `skipped` | `No MCP server is registered for this agent: <motivo>. Run \`maia init <id>\` in the project to register it.`; a seção "MCP servers" lista `- _not registered_` |

Agora o bloco é reescrito também no caso `skipped`; antes ele era pulado.
