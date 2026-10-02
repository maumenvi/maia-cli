# Data Model: registro do proxy `maia` por agente

Entidades em memória e nos arquivos que o Maia escreve. Os nomes de tipos são os do código
(`src/agent/agents/…`); cada tipo novo vai num arquivo próprio (princípio V).

## AgentTarget (alterado)

`src/agent/agents/contracts/agent.target.ts`

| Campo | Tipo | Mudança | Regra |
|-------|------|---------|-------|
| `configFormat` | `AgentConfigFormat` | ganha `'continue-mcp-block'` | Cursor passa de `'servers'` para `'mcp-servers'`; Continue passa para `'continue-mcp-block'`; Cline passa para `'mcp-servers'` (formato do arquivo global) |
| `configPaths(cwd)` | `string[]` | Cline retorna `[]` | alvo com `globalRegistration` não tem arquivo de projeto |
| `legacyConfigPaths(cwd)` | — | **removido** | substituído por `legacyProxyLocations` |
| `legacyProxyLocations?(cwd)` | `LegacyProxyLocation[]` | novo | nunca é destino; o Maia só remove a própria entrada `maia` |
| `projectDir` | `'omit' \| 'workspace-variable' \| 'workspace-env'` | ganha `'workspace-env'` | `'workspace-env'` grava `env.MAIA_PROJECT_DIR = "${workspaceFolder}"`; nunca caminho absoluto |
| `stdioType?` | `boolean` | novo | `true` grava `type: "stdio"` na entrada (Cursor) |
| `registrationNote?` | `string` | novo | texto anexado à situação `registered` (Codex: projeto confiável) |
| `globalRegistration?` | `GlobalRegistration` | novo | só Cline; ver abaixo |

Valores por alvo depois da feature:

| id | configFormat | configPaths | legacyProxyLocations | projectDir | stdioType | registrationNote | globalRegistration |
|----|--------------|-------------|----------------------|------------|-----------|------------------|--------------------|
| `claude` | `mcp-servers` | `.mcp.json` | `.claude/claude_desktop_config.json` (`mcp-servers`) | `omit` | — | — | — |
| `copilot` | `servers` | `.vscode/mcp.json` | — | `workspace-variable` | — | — | — |
| `cursor` | `mcp-servers` | `.cursor/mcp.json` | `.cursor/mcp.json` (`servers`) | `workspace-env` | `true` | — | — |
| `zed` | `zed-settings` | `.zed/settings.json` | — | `omit` | — | — | — |
| `codex` | `toml-mcp-servers` | `.codex/config.toml` | — | `omit` | — | aviso de projeto confiável | — |
| `continue` | `continue-mcp-block` | `.continue/mcpServers/maia.yaml` | `.continue/config.json` (`mcp-servers`) | `omit` | — | — | — |
| `cline` | `mcp-servers` | `[]` | `.cline/mcp.json` (`servers`) | `omit` | — | — | `cline` |

## LegacyProxyLocation (novo)

`src/agent/agents/contracts/legacy.proxy.location.ts`

| Campo | Tipo | Regra |
|-------|------|-------|
| `path` | `string` | absoluto, dentro do projeto |
| `format` | `'mcp-servers' \| 'servers'` | chave onde a entrada `maia` antiga está |

## GlobalRegistration (novo)

`src/agent/agents/contracts/global.registration.ts`

| Campo | Tipo | Regra |
|-------|------|-------|
| `candidatePaths(input)` | `(input: { env; platform; home }) => string[]` | pura; ordem e lista do research D3; sem duplicatas |
| `entryKey(projectRoot)` | `(root: string) => string` | pura; `maia-<slug>-<hash8>` (D4) |
| `entry(projectRoot, agentId)` | `(root, id) => AgentMcpServerConfig` | pura; `command`, `args`, `env.MAIA_PROJECT_DIR = root` |

## AgentMcpServerConfig (alterado)

| Campo | Mudança |
|-------|---------|
| `type` | ganha `'stdio'` |

## AgentRegistration (alterado)

`src/agent/agents/contracts/agent.registration.ts`

```ts
type AgentRegistration =
  | { status: 'registered'; configPath: string; note?: string }
  | { status: 'skipped'; reason: string }
  | { status: 'pending'; reason: string; manualStep: string };
```

Transições para o Cline (por projeto e por execução):

```text
            maia init cline / maia agent add cline
pending ──(TTY, não local-only, candidato existe, pessoa aceita)──▶ registered
pending ──(sem TTY | local-only | recusa | nenhum candidato)──────▶ pending
registered ──(entrada some ou muda no global)─────────────────────▶ pending (no próximo configureAgents)
registered ──(maia agent rm cline + aceita remover)────────────────▶ (agente fora do projeto)
```

Para os demais agentes: `registered` quando o arquivo de projeto foi escrito, `skipped`
quando local-only (comportamento da 009).

## ClineGlobalEntryState (novo, só leitura)

`src/agent/agents/global/cline.global.entry.state.ts` — resultado puro de inspecionar um
arquivo global já lido:

| Campo | Tipo | Regra |
|-------|------|-------|
| `path` | `string` | candidato existente |
| `current` | `boolean` | existe a chave do projeto com `command`, `args` e `env.MAIA_PROJECT_DIR` iguais ao esperado |
| `stale` | `string[]` | chaves de entradas do Maia cuja `env.MAIA_PROJECT_DIR` não existe mais |

## InjectResult (alterado)

| Campo | Mudança |
|-------|---------|
| `changed` | novo `boolean`: o conteúdo gravado difere do anterior; quando `false` nada é escrito e a saída usa `No change in` (idempotência, FR-005) |

## Arquivos escritos

| Arquivo | Dono | Escrita |
|---------|------|---------|
| `.cursor/mcp.json` | compartilhado | só `mcpServers.maia` (e remoção de `servers.maia`) |
| `.continue/mcpServers/maia.yaml` | Maia (arquivo inteiro) | gerado inteiro |
| `.continue/config.json` | compartilhado | só remoção de `mcpServers.maia` |
| `.cline/mcp.json` | compartilhado | só remoção de `servers.maia` |
| `cline_mcp_settings.json` (global) | Cline | só chaves `maia-<slug>-<hash>` do projeto e órfãs aceitas; atômico |
| `.zed/settings.json` | compartilhado | só `context_servers.maia` |
| `.codex/config.toml` | compartilhado | só `[mcp_servers.maia]` / forma inline antiga |
| arquivo de instruções do agente | compartilhado | só o bloco entre marcadores |
