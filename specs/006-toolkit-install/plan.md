# Implementation Plan: Instalação de Toolkits

**Branch**: `006-toolkit-install` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação da feature em `/specs/006-toolkit-install/spec.md`

**Note**: Este template é preenchido pelo comando `/speckit-plan`; sua definição descreve o fluxo de execução.

## Summary

Introduz um quarto tipo de item no ecossistema do Maia — o **toolkit** — que, ao
contrário de skills/MCPs/tools, **não é materializado pelo Maia**: o Maia monta e
executa (sem shell) os comandos do instalador nativo do toolkit, registra o resultado
em `maia.json`/`maia.lock.json` e passa a restaurá-lo em `maia i`/`maia ci`, a
verificá-lo em `maia verify` e a descrevê-lo (somente leitura) pelo MCP.

O catálogo v1 é embutido e contém só o GitHub Spec Kit (`speckit`). Abordagem:

1. **Núcleo puro** em `src/agent/toolkits/`: definição tipada do catálogo, resolução
   de escopo efetivo (`-g` sem suporte ⇒ aviso + projeto), mapeamento agente →
   integração, construção de argv, normalização de versão e derivação da entrada de
   lock. Tudo testável sem I/O.
2. **Bordas com I/O** em `src/cli/commands/toolkit/`: executor de processo
   (`NativeRunner`), confirmação (`ConfirmFn`), resolução da última release no GitHub,
   detecção de estado instalado, rollback de caminhos novos e remoção com guardrails.
3. **Manifesto/lock**: seção `toolkits` nos dois arquivos; versão exata sempre no
   manifesto para manter `buildLockFromManifest` puro; `lockfileVersion` 2 apenas
   quando há toolkits (research Decision 6).
4. **Integrações**: `maia i`/`ci` chamam `restoreToolkits`; `verify` checa presença e
   versão; ferramenta MCP `maia_toolkits`; seção `### Toolkits` no bloco de
   instruções dos agentes.

## Technical Context

**Language/Version**: TypeScript (type-stripping nativo do Node.js), alvo Node.js ≥26

**Primary Dependencies**: apenas built-ins (`node:child_process`, `node:fs`,
`node:readline/promises`, `fetch` global). Nenhuma dependência de runtime nova.
Dependências **externas em runtime do usuário** (não do Maia): `uv`/`uvx` e Git
para o Spec Kit — checadas como pré-requisito (FR-007).

**Storage**: `maia.json` e `maia.lock.json` (seção `toolkits`); arquivos do toolkit
são do toolkit (`.specify/`, pastas de integração dos agentes).

**Testing**: `node:test` via `scripts/run-tests.mjs`. Instalador e prompts injetados
(`NativeRunner`, `ConfirmFn`, `FetchFn`) — nenhum teste depende de `uv` ou rede.

**Target Platform**: CLI multiplataforma; `--script ps` no Windows, `sh` nos demais.

**Project Type**: Ferramenta CLI (projeto único).

**Performance Goals**: sem metas de throughput. Detecção de estado em `maia i`/`ci`
não usa rede (versão vem do manifesto/lock); só `maia toolkit i` sem `--version`
consulta a API do GitHub (uma requisição).

**Constraints**:
- Nunca `shell: true`; versão validada por regex antes de entrar em argv.
- `buildLockFromManifest` permanece puro (sem rede/disco para toolkits).
- Manifesto/lock só gravados após o instalador retornar 0.
- `maia i`/`ci` nunca perguntam; `ci` sempre `--non-interactive`.
- Compatibilidade: projetos sem toolkits não mudam de formato (lock segue v1).

**Scale/Scope**: 1 toolkit no catálogo; poucos toolkits por projeto; ~7 agentes
mapeados.

## Constitution Check

*GATE: Deve passar antes da pesquisa da Fase 0. Reverificar após o design da Fase 1.*

| Princípio | Verificação | Status |
|---|---|---|
| I. Test-First | Cada unidade pura (escopo efetivo, mapeamento de integrações, argv, versão, lock entry, view) e cada fluxo de comando (install/ls/rm, `i`, `ci`, `verify`, MCP) recebe teste `node:test` escrito antes da implementação **e commitado junto com ela** (suíte nunca vermelha entre commits), com runner/confirm/fetch falsos. | PASS (planejado) |
| II. Security by Default | Execução sem shell com argv; versão validada por regex; confirmação explícita antes de executar código de terceiros (FR-010a); `ci` usa só versão/origem travadas (FR-026); exclusão de arquivos só com confirmação e via `assertPathAllowed` (FR-024/025); ferramenta global nunca desinstalada pelo Maia; instaladores nativos destrutivos (`init --force` em troca de versão, `integration uninstall`) só rodam após guardrail sobre todos os caminhos declarados (FR-027, research D11/D14); `maia i`/`ci` nunca sobrescrevem. | PASS |
| III. Spec-Driven Workflow | Spec com 6 clarificações e `/speckit-analyze` aplicado; plan → tasks → implement com revisão humana. | PASS |
| IV. Small & Reversible Changes | Fatiamento natural em commits: flags curtas → tipos/catálogo → lock/manifesto → install → i/ci/verify → MCP/instruções → rm. Cada um reversível. | PASS |
| V. Single Responsibility per File | Um símbolo por arquivo, com JSDoc (gate `check:architecture`). | PASS |
| VI. Scope-Organized Directories | Novo escopo `src/agent/toolkits/` (domínio) e `src/cli/commands/toolkit/` (comando), espelhando `agent/agents` × `cli/commands/agent`. | PASS |
| VII. Clean Code | Sem duplicação: reutiliza `withRollback`, `assertPathAllowed`, `createGitHubHeaders`, gate de staleness e `upsert.marked.block`. | PASS |
| VIII. Pure Functions | Núcleo em `agent/toolkits` é puro; I/O isolado em runner/confirm/fetch/leitura de versão injetados. | PASS |
| IX. File Naming Convention | `palavra.palavra.ts`, testes `.test.ts` (gate `check:naming`). | PASS |

**Reverificação pós-Fase 1**: o data-model mantém o lock derivável do manifesto (§4);
os contratos não introduzem dependências de runtime; a única ressalva é a
atomicidade do instalador de terceiros, registrada em Complexity Tracking. Gate
reconfirmado: PASS com uma justificativa.

## Project Structure

### Documentation (this feature)

```text
specs/006-toolkit-install/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── toolkit-command.md
│   ├── manifest-lock-toolkits.md
│   └── mcp-toolkits-tool.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── agent/
│   ├── toolkits/                                        # NOVO escopo (núcleo puro)
│   │   ├── contracts/
│   │   │   ├── toolkit.definition.ts
│   │   │   ├── toolkit.scope.ts
│   │   │   ├── toolkit.command.ts                       # { command, args }
│   │   │   ├── toolkit.prerequisite.ts
│   │   │   ├── toolkit.integration.ts
│   │   │   ├── toolkit.install.context.ts
│   │   │   ├── toolkit.install.state.ts
│   │   │   └── toolkit.view.ts
│   │   ├── catalog/
│   │   │   ├── speckit.ts
│   │   │   ├── toolkit.catalog.ts
│   │   │   ├── find.toolkit.ts
│   │   │   └── list.toolkit.names.ts
│   │   ├── plan/
│   │   │   ├── resolve.effective.scope.ts               # FR-011/012
│   │   │   ├── resolve.toolkit.integrations.ts          # FR-008, research D3
│   │   │   ├── build.toolkit.install.commands.ts        # argv por escopo
│   │   │   ├── normalize.toolkit.version.ts             # research D5
│   │   │   ├── parse.requested.version.ts               # regex + prefixo v
│   │   │   ├── classify.toolkit.state.ts                # data-model §5
│   │   │   └── collect.toolkit.path.patterns.ts         # projectPaths + integrationPaths
│   │   ├── lock/
│   │   │   └── build.toolkit.lock.entries.ts            # puro, FR-014
│   │   └── view/
│   │       └── to.toolkit.view.ts
│   ├── catalog/
│   │   ├── types/dependencies/toolkit.dependency.ts     # NOVO
│   │   ├── types/lock/lock.toolkit.ts                   # NOVO
│   │   ├── types/lock/source.lock.ts                    # MODIFICAR (+toolkits?)
│   │   ├── types/manifest/sources.manifest.ts           # MODIFICAR (+toolkits)
│   │   ├── manifest/defaults.ts                         # MODIFICAR
│   │   ├── manifest/normalize/normalize.manifest.ts     # MODIFICAR
│   │   ├── lock/build.ts                                # MODIFICAR (toolkits + versão 1|2)
│   │   ├── lock/staleness/lock.comparable.projection.ts # MODIFICAR (+toolkits)
│   │   ├── types/store/catalog.store.options.ts         # MODIFICAR (+toolkitCatalog, research D17)
│   │   └── store/agent.catalog.store.ts                 # MODIFICAR (set/removeToolkit, catálogo no buildLock)
│   └── mcp/server/
│       ├── collect/collect.toolkit.entries.ts           # NOVO
│       ├── collect/collect.all.tools.ts                 # MODIFICAR
│       └── router.ts                                    # MODIFICAR (origin toolkit:catalog)
└── cli/
    ├── commands/
    │   ├── toolkit/                                     # NOVO
    │   │   ├── toolkit.command.ts                       # dispatch i|install|ls|rm
    │   │   ├── install.toolkit.ts
    │   │   ├── list.toolkits.ts
    │   │   ├── remove.toolkit.ts
    │   │   ├── restore.toolkits.ts                      # usado por i/ci
    │   │   ├── verify.toolkits.ts                       # usado por verify/ci
    │   │   ├── detect.toolkit.state.ts
    │   │   ├── check.toolkit.prerequisites.ts
    │   │   ├── resolve.toolkit.release.ts               # GitHub API
    │   │   ├── snapshot.toolkit.paths.ts
    │   │   ├── assert.toolkit.paths.allowed.ts          # guardrail antes de sobrescrita/uninstall (D11, D14)
    │   │   ├── format.toolkit.command.ts                # texto de "Will run:"
    │   │   ├── toolkit.io.ts                            # { runner, confirm, fetch, platform, catalog }
    │   │   ├── default.toolkit.io.ts
    │   │   ├── rollback.new.toolkit.paths.ts
    │   │   ├── delete.toolkit.paths.ts                  # via assertPathAllowed
    │   │   ├── native.runner.ts                         # tipo
    │   │   ├── run.native.command.ts                    # spawnSync sem shell
    │   │   ├── confirm.fn.ts                            # tipo
    │   │   └── prompt.confirm.ts                        # readline, sem TTY = não
    │   ├── command.handlers.ts                          # MODIFICAR (+toolkit)
    │   ├── help.ts                                      # MODIFICAR
    │   ├── install/install.command.ts                   # MODIFICAR (restoreToolkits)
    │   ├── ci.ts                                        # MODIFICAR
    │   ├── verify.ts                                    # MODIFICAR
    │   ├── assert.lockfile.version.compatible.ts        # MODIFICAR ({1,2})
    │   └── agent/render.agent.capability.block.ts       # MODIFICAR (### Toolkits)
    └── shared/flags/
        ├── parse.flags.ts                               # MODIFICAR (-g, -y)
        └── short.flag.aliases.ts                        # NOVO

tests/
├── toolkits/                                            # NOVO — unidades puras
│   ├── speckit.definition.test.ts
│   ├── find.toolkit.test.ts
│   ├── parse.requested.version.test.ts
│   ├── resolve.effective.scope.test.ts
│   ├── resolve.toolkit.integrations.test.ts
│   ├── build.toolkit.install.commands.test.ts
│   ├── normalize.toolkit.version.test.ts
│   ├── classify.toolkit.state.test.ts
│   ├── build.toolkit.lock.entries.test.ts
│   └── to.toolkit.view.test.ts
├── cli/
│   ├── toolkit.install.test.ts                          # NOVO
│   ├── toolkit.remove.test.ts                           # NOVO
│   ├── toolkit.list.test.ts                             # NOVO
│   ├── run.native.command.test.ts                       # NOVO
│   ├── prompt.confirm.test.ts                           # NOVO
│   ├── detect.toolkit.state.test.ts                     # NOVO
│   ├── check.toolkit.prerequisites.test.ts              # NOVO
│   ├── snapshot.toolkit.paths.test.ts                   # NOVO
│   ├── assert.toolkit.paths.allowed.test.ts             # NOVO
│   ├── install.test.ts / ci.test.ts / verify.test.ts    # MODIFICAR
│   └── agent.test.ts                                    # MODIFICAR (### Toolkits)
├── shared/
│   ├── parse.flags.test.ts                              # NOVO
│   ├── is.lock.stale.test.ts                            # MODIFICAR
│   └── is.lockfile.version.compatible.test.ts           # MODIFICAR
└── tools/mcp.server.test.ts                             # MODIFICAR (maia_toolkits)
```

**Structure Decision**: projeto CLI único. O domínio de toolkits ganha escopo próprio
`src/agent/toolkits/` (puro, como `agent/access/policy`), e o comando ganha
`src/cli/commands/toolkit/` (bordas com I/O, como `cli/commands/agent`). Tipos de
manifesto/lock ficam junto aos existentes em `agent/catalog/types/` por simetria com
skills/MCPs/tools.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Rollback parcial (003 exige "nenhum estado parcial") — o instalador nativo é código de terceiros e não é transacional | FR-006 proíbe o Maia de materializar arquivos do toolkit; logo a atomicidade da escrita é do toolkit | Snapshot/restauração da árvore inteira do projeto: custo alto e risco de sobrescrever trabalho do usuário. Mitigação adotada (research D10): nada é registrado em manifesto/lock em caso de falha, e os caminhos **declarados** pelo toolkit que não existiam antes são removidos via guardrail; instalação global não é desfeita, mas o comando de desinstalação é informado. |
| Execução de instaladores nativos destrutivos (`init --force`, `integration uninstall`) | O toolkit é a fonte da verdade da sua instalação (FR-006) | Reimplementar a escrita/remoção no Maia violaria FR-006. Mitigação obrigatória (Princípio II): guardrail avaliado pelo Maia sobre todos os caminhos declarados **antes** de executar o processo (research D11, D14); `maia i`/`ci` nunca sobrescrevem (D5). |
| Lock com duas versões de formato (1 e 2) | Maia antigo deve falhar diante de toolkits em vez de ignorá-los (FR-018) | Bump incondicional quebraria todos os locks existentes; campo opcional em v1 faria Maia antigo reportar sucesso sem instalar toolkits. |
