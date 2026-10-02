# Implementation Plan: Registro do proxy `maia` no Cursor, Cline, Continue e demais agentes

**Branch**: `010-agent-mcp-registration` (a criar a partir da `develop`, merge `966f065`) |
**Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-agent-mcp-registration/spec.md`

## Summary

A pesquisa ([research.md](./research.md), D1) confirmou pela documentação oficial os três
defeitos da issue e achou mais dois: o Zed recebe a forma antiga `command: { path, args }` e o
Codex recebe uma tabela inline em várias linhas, que só é TOML válido na versão 1.1.

Abordagem:

1. **US1 Cursor (P1)**: `mcpServers` + `type: "stdio"` + `env.MAIA_PROJECT_DIR = "${workspaceFolder}"`
   (o Cursor não documenta `cwd`). O `maia mcp-server` passa a aceitar `MAIA_PROJECT_DIR`
   antes de `CLAUDE_PROJECT_DIR` (D2). A entrada `servers.maia` antiga é migrada.
2. **US2 Continue (P1)**: novo formato `continue-mcp-block`, que gera
   `.continue/mcpServers/maia.yaml` com um serializador YAML próprio e pequeno (D9). A entrada
   `mcpServers.maia` sai do `.continue/config.json`.
3. **US3 Cline (P2)**: o registro vai para o `cline_mcp_settings.json` global, só com
   confirmação em `maia init`/`maia agent add`. O Maia procura o arquivo nos locais
   conhecidos (D3). Cada projeto tem sua chave (`maia-<slug>-<hash8>`), e a entrada aponta o
   projeto por `env.MAIA_PROJECT_DIR` (D4). Os demais fluxos só relatam a situação (D5). O
   novo estado `pending` aparece no bloco e na saída (D6). Entra o comando `maia agent rm`
   (D7).
4. **US4 Codex/Zed (P3)**: os formatos documentados (tabela `[mcp_servers.maia]` e
   `context_servers` plano) e o aviso de projeto confiável no Codex (`registrationNote`).
5. **US5 Contrato (P2)**: um teste literal por agente e o roteiro manual em
   `docs/agents/validation.md` (D10, D11).

Migração genérica: `legacyProxyLocations` com o formato de cada local legado substitui
`legacyConfigPaths` (D8). As escritas só acontecem quando o conteúdo muda (idempotência).

## Technical Context

**Language/Version**: TypeScript 7 sobre Node.js ≥ 26 (TS nativo no dev)

**Primary Dependencies**: nenhuma nova. Usa `node:fs`, `node:path`, `node:os`, `node:crypto`
(hash da chave do Cline) e `node:readline/promises` (pela `CliInteraction.confirm` que já
existe)

**Storage**: arquivos de config de cada agente no projeto, o `cline_mcp_settings.json`
global (só com confirmação) e o `maia.json` (remoção de agente)

**Testing**: `node:test`. Testes de contrato literais por agente em
`tests/agents/contract/`. Os testes do Cline usam home e `CLINE_DATA_DIR` temporários e
`CliInteraction` injetada. O `scripts/run-tests.mjs` passa a exportar `CLINE_DATA_DIR`,
`CLINE_MCP_SETTINGS_PATH` e `XDG_CONFIG_HOME`/`APPDATA` temporários, para nenhum teste
alcançar o arquivo real do Cline

**Target Platform**: Linux, macOS e Windows (os caminhos do Cline variam por SO, D3)

**Project Type**: CLI (pacote npm `@maumenvi/maia-cli`)

**Performance Goals**: n/a. São alguns arquivos pequenos por comando

**Constraints**: nenhum caminho absoluto em arquivo de projeto (FR-008). Nada é escrito no
global sem TTY e confirmação (FR-006). Arquivo ilegível nunca é sobrescrito (FR-009). A
escrita no global é atômica (temporário + rename)

**Scale/Scope**: 7 alvos de agente, cerca de 25 arquivos de código novos ou alterados em
`src/agent/agents/`, `src/cli/commands/agent/`, `src/config/core/` e `src/cli/shared/`, 7
testes de contrato, testes de migração e o roteiro de docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação | Como |
|-----------|----------|------|
| Idioma pt-BR | ✅ | artefatos em pt-BR; mensagens do CLI seguem em inglês, como no resto do código |
| I. Test-First | ✅ | cada mudança de alvo começa pelo teste de contrato literal (D10); as funções puras novas têm teste unitário; typecheck e suíte verdes por tarefa |
| II. Security by Default | ✅ | a escrita global só acontece com TTY e confirmação explícita (padrão "não"); testes isolados do arquivo real do Cline; nenhum segredo nas entradas; arquivo inválido não é sobrescrito |
| III. Spec-Driven | ✅ | spec → plan (este) → tasks; os ajustes de escopo feitos no plan estão registrados na spec (Clarifications, "Ajustes do `/speckit-plan`") |
| IV. Small & Reversible | ✅ | uma tarefa por alvo ou mecanismo (MAIA_PROJECT_DIR, legacyProxyLocations, Cursor, Continue, Zed, Codex, Cline leitura, Cline escrita, `agent rm`, docs) |
| V. Single Responsibility | ✅ | cada tipo e função nova em arquivo próprio com comentário de propósito (data-model) |
| VI. Scope-Organized | ✅ | lógica do Cline global em `src/agent/agents/global/`; serializadores em `src/agent/agents/inject/`; comando em `src/cli/commands/agent/` |
| VII. Clean Code | ✅ | `legacyConfigPaths` é removido, não mantido em paralelo |
| VIII. Pure Functions | ✅ | candidatos, chave, entrada, estado do global, `removeProxyEntry`, `renderContinueMcpBlock`, `removeMarkedBlock` e `resolveMcpServerProjectRoot` são puros; I/O nas bordas (`configureAgents`, `offerClineGlobalRegistration`, `agent rm`) |
| IX. File Naming | ✅ | `cline.settings.candidates.ts`, `cursor.registration.contract.test.ts` etc. |

**Exceção consciente**: a escrita no arquivo global do Cline é a primeira exceção ao
"local-only" do Maia. Foi decidida pela pessoa usuária (Clarification B) e fica limitada ao
Cline e a comandos interativos. Não fere nenhum princípio da constituição.

**Re-check pós-design**: sem violações. Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/010-agent-mcp-registration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── agent.registration.md
│   ├── cline.global.md
│   └── cli.agent.rm.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── config/core/
│   └── resolve.mcp.server.project.root.ts      # + MAIA_PROJECT_DIR (D2)
├── agent/agents/
│   ├── contracts/
│   │   ├── agent.target.ts                     # legacyProxyLocations, workspace-env, stdioType, registrationNote, globalRegistration
│   │   ├── agent.registration.ts               # + pending, note
│   │   ├── agent.mcp.server.config.ts          # type + 'stdio'
│   │   ├── legacy.proxy.location.ts            # novo
│   │   └── global.registration.ts              # novo
│   ├── inject/
│   │   ├── agent.config.format.ts              # + continue-mcp-block
│   │   ├── inject.agent.config.ts              # changed/idempotência; novo formato
│   │   ├── inject.result.ts                    # + changed
│   │   ├── inject.zed.settings.ts              # forma plana
│   │   ├── inject.toml.mcp.servers.ts          # tabela [mcp_servers.<key>]
│   │   ├── render.continue.mcp.block.ts        # novo (puro)
│   │   ├── remove.proxy.entry.ts               # novo (puro, por formato)
│   │   ├── migrate.legacy.proxy.locations.ts   # novo (borda)
│   │   ├── remove.agent.mcp.entry.ts           # passa a cobrir zed/toml/continue
│   │   └── has.maia.proxy.entry.ts             # recebe o formato do local
│   ├── global/
│   │   ├── cline.settings.candidates.ts        # novo (puro, D3)
│   │   ├── cline.entry.key.ts                  # novo (puro, D4)
│   │   ├── cline.global.entry.ts               # novo (puro)
│   │   ├── cline.global.entry.state.ts         # novo (tipo)
│   │   ├── inspect.cline.global.entry.ts       # novo (puro)
│   │   ├── upsert.cline.global.entry.ts        # novo (puro)
│   │   ├── remove.cline.global.entry.ts        # novo (puro)
│   │   └── write.json.atomic.ts                # novo (borda)
│   └── registry/
│       ├── mcp.entry.ts                        # workspace-env, stdioType
│       ├── cursor.ts  continue.agent.ts  cline.ts  codex.ts  claude.ts
└── cli/
    ├── commands/agent/
    │   ├── agent.command.ts                    # + rm/remove
    │   ├── configure.agents.ts                 # migração genérica; Cline só leitura; nota; changed
    │   ├── resolve.cline.registration.ts       # novo: situação do Cline (leitura)
    │   ├── offer.cline.global.registration.ts  # novo: pergunta + escrita (async)
    │   ├── remove.agents.ts                    # novo: fluxo do agent rm
    │   └── render.agent.capability.block.ts    # pending + note
    ├── commands/init/init.command.ts           # chama offerClineGlobalRegistration
    ├── help/command.help.ts                    # agent rm
    └── shared/remove.marked.block.ts           # novo (puro)

src/agent/catalog/store/agent.catalog.store.ts  # + removeSelectedAgents

tests/
├── agents/contract/<id>.registration.contract.test.ts   # 7 arquivos
├── agents/migration/<id>.legacy.migration.test.ts       # cursor, continue, cline, zed, codex
├── agents/global/*.test.ts                              # candidatos, chave, inspect/upsert/remove
├── cli/agent.rm.test.ts
├── cli/cline.global.registration.test.ts
└── support/assert.no.absolute.path.ts

docs/agents/validation.md                        # roteiro manual (FR-011)
README.md, README.pt-BR.md, AGENT.md             # Known issues / follow-ups
scripts/run-tests.mjs                            # isola Cline/XDG/APPDATA
```

**Structure Decision**: projeto único, a estrutura que já existe. A lógica nova do arquivo
global fica em `src/agent/agents/global/` (escopo próprio, princípio VI), separada da
injeção em arquivos de projeto (`inject/`).

## Ordem sugerida (para o `/speckit-tasks`)

1. Base: isolamento no `run-tests.mjs` (Cline/XDG/APPDATA temporários, antes de qualquer
   teste do Cline); `MAIA_PROJECT_DIR` no `resolveMcpServerProjectRoot`; `InjectResult.changed`;
   `legacyProxyLocations` + `removeProxyEntry` + `migrateLegacyProxyLocations`, com o Claude
   migrado para o mecanismo novo sem mudar comportamento.
2. US1 Cursor → US2 Continue (cada um: contrato → alvo → migração).
3. US5: testes de contrato do Claude, Copilot, Zed e Codex (formato atual), antes de mexer
   neles.
4. US4: Zed plano e Codex em tabela; `registrationNote`.
5. US3: tipos e funções puras do global → `pending` no bloco → leitura em `configureAgents`
   → `offerClineGlobalRegistration` em init/agent add → migração de `.cline/mcp.json`.
6. `maia agent rm` (`removeMarkedBlock`, `removeSelectedAgents`, remoção por formato, Cline).
7. Docs (`validation.md`, READMEs, AGENT.md), CHANGELOG.

## Complexity Tracking

Sem violações a justificar.
