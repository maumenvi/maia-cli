# Data Model: Integração com o Claude Code, skills completas, instalação segura e variáveis globais

**Feature**: 009-agent-integration-fixes | **Date**: 2026-10-02

## AgentTarget (contrato existente, campos novos opcionais)

| Campo | Tipo | Regra |
|-------|------|-------|
| `configPaths(cwd)` | `string[]` | `claude`: **só** `[.mcp.json]` |
| `legacyConfigPaths?(cwd)` | `string[]` | **novo**; `claude`: `[.claude/claude_desktop_config.json]`. Só para migrar e remover a entrada `maia` |
| `projectDir?` | `'omit' \| 'workspace-variable' \| 'absolute'` | **novo**; padrão `'absolute'`. `claude: 'omit'`, `copilot: 'workspace-variable'` (`${workspaceFolder}`) |
| `nativeCommands?` | `readonly string[]` | **novo**; `claude`: lista do research D10 |

## Entrada do proxy `maia`

```json
{ "command": "maia", "args": ["mcp-server", "--agent", "<id>"], "cwd": "<conforme projectDir>" }
```

`cwd` fica ausente quando o valor é `'omit'`. O perfil `.maia/agents/<id>/capabilities.json`
grava `mcpServer` sempre sem `cwd`.

## Resultado do registro (novo)

`AgentRegistration = { status: 'registered'; configPath: string } | { status: 'skipped'; reason: string }`

O `configureAgents` produz esse valor e o `writeAgentInstructions`/`renderAgentCapabilityBlock`
o consome.

## Dependência de skill (manifesto)

| Campo | Antes | Depois |
|-------|-------|--------|
| `path` | `skills/<nome>/SKILL.md` | `skills/<nome>` (pasta) |
| `sourceName?` | — | **novo**: nome da skill na fonte quando difere do nome local (`--as`). Validação: `^[A-Za-z0-9._-]+$` |
| `allowedLlms` | `['*']` por padrão | segue o research D7; `[]` = nenhum agente autorizado |

## LockPackage (skill)

| Campo | Regra |
|-------|-------|
| `path` | `skills/<nome>` |
| `files?` | **novo**: `Record<caminho relativo POSIX, "sha256:<hex>">`. Ordenado por caminho. Sem `..`, sem caminho absoluto. No máximo **200** entradas |
| `artifactHash` | `"sha256:" + sha256(join(sorted(files).map(p => p + "\0" + hash + "\n")))` |
| `sourceName?` | **novo**, como no manifesto |
| integridade | `files` e `sourceName` entram no payload **só quando presentes** |

`lockfileVersion`: `3` se algum pacote tem `files`; senão `2` se há toolkits; senão `1`.
Versões aceitas: `[1, 2, 3]`.

## Problemas de verificação (novos tipos)

| `kind` | Quando |
|--------|--------|
| `missing-file` | arquivo listado em `files` não existe |
| `changed-file` | hash do arquivo difere |
| `unexpected-file` | arquivo na pasta da skill que não está em `files` |

## SkillFiles (transitório, não persistido)

`Array<{ path: string; content: Buffer }>`, relativo à pasta do `SKILL.md`. Precisa conter
`SKILL.md`. Tamanho total no máximo **5 MB**.

## Arquivo global de variáveis

| Atributo | Valor |
|----------|-------|
| Caminho | `$MAIA_CONFIG_HOME/mcp.env`; senão `${XDG_CONFIG_HOME:-~/.config}/maia/mcp.env`; no Windows, `%APPDATA%\maia\mcp.env` |
| Permissões | diretório `0700`, arquivo `0600` (só na criação) |
| Formato | o mesmo `KEY=value` de `.maia/mcp.env` |

### Precedência ao subir um MCP

```text
processo (não vazio)  >  projeto .maia/mcp.env (não vazio)  >  global mcp.env  >  ausente
```

### Escopo de escrita

| Comando | Destino dos valores pedidos | Placeholder vazio |
|---------|-----------------------------|-------------------|
| `maia mcp add\|i\|install <x>` | projeto | projeto, exceto se o global tiver valor |
| `maia mcp add\|i <x> --env-g` / `maia mcp find <q> --env-g` | global | global |
| `maia i` / `maia ci` | — | projeto, exceto se o global tiver valor |

## Candidato de catálogo (exibição)

`displayName (source) [trusted|untrusted]`, mais a descrição e as credenciais, como hoje.
Confiança efetiva = `trusted` da fonte do manifesto com o mesmo alias, senão a do provider.

## Estados: registro do Claude em projeto legado

```text
[.claude/claude_desktop_config.json com "maia", sem .mcp.json]
        │  maia init claude | maia i | maia mcp add …
        ▼
[.mcp.json com "maia" (sem cwd); legado sem "maia" (outras entradas preservadas)]
        + saída: Moved the "maia" proxy from … to ….
```
