# Implementation Plan: Inicialização do Projeto & Configuração de Agentes

**Branch**: `001-project-init-agents` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação da feature em `/specs/001-project-init-agents/spec.md`

**Note**: Este template é preenchido pelo comando `/speckit-plan`; sua definição descreve o fluxo de execução.

## Summary

`maia init` e a configuração de agentes já existem e cobrem a maior parte dos
requisitos funcionais do spec (criação de manifesto/lockfile, materialização de
diretório fallback, seleção/aliasing de agentes, escrita de configuração nativa por
agente, reexecuções idempotentes). Este plano fecha os quatro gaps que a sessão de
clarificação de 2026-09-21 identificou e transformou em requisitos explícitos que o
código atual não satisfaz:

1. **FR-003 / FR-014 (não-interativo, sem agentes)**: `promptForAgentIds` atualmente
   retorna `[]` silenciosamente quando stdin/stdout não são um TTY, o que
   `initCommand` então trata como "nenhum agente selecionado" (fallback-only). O
   spec agora exige que esse caso falhe explicitamente com orientação de uso e sem
   alterações de arquivo.
2. **FR-012 (gate de versão de schema)**: `normalizeManifest` mescla silenciosamente
   qualquer manifesto parseado — independente de `maiaVersion` — em
   `createDefaultManifest()`. O spec agora exige recusar continuar quando o
   `maiaVersion` do manifesto for incompatível com a CLI em execução.
3. **FR-013 (limpeza de diretório fallback vazio)**: a remoção de skill/tool
   (`removeCommand` → `removeMaterializedFile`) apaga apenas o arquivo alvo; nada no
   código chama `rmdirSync`/`rmSync` no diretório fallback pai (`skills/`, `tools/`,
   `mcp/`) quando ele fica vazio.
4. **FR-014 (atomicidade em falha de escrita)**: `saveManifest`/`saveLock` chamam
   `writeFileSync` diretamente; uma falha no meio da escrita (ex.: disco cheio,
   permissão revogada entre `mkdirSync` e `writeFileSync`) pode deixar um
   manifesto/lockfile truncado ou zerado em vez de falhar de forma limpa sem
   escrita parcial.

Os demais requisitos funcionais (FR-001, FR-002, FR-004–FR-011) já estão
implementados por `init-command.ts`, `configure-agents.ts`, `agent-registry.ts`,
`normalize-agent-ids.ts`, `parse-agent-selection.ts`, e os writers `inject/` por
agente, e são tratados como baseline já coberto por regressão, não trabalho novo.

## Technical Context

**Language/Version**: TypeScript (type-stripping nativo do Node.js), alvo Node.js ≥26

**Primary Dependencies**: Nenhuma além dos built-ins do Node.js (`node:fs`,
`node:path`, `node:readline/promises`); `typescript` é dependência apenas de
desenvolvimento para `tsc --noEmit`

**Storage**: Arquivos JSON planos no sistema de arquivos local — `maia.json`
(manifesto), `maia.lock.json` (lockfile), diretórios fallback `.maia/` (`skills/`,
`mcp/`, `tools/`), além dos arquivos de configuração nativa por agente (ex.:
`.mcp.json`, `CLAUDE.md`)

**Testing**: `node:test` via `scripts/run-tests.mjs` (ver `npm test`,
`npm run test:coverage`)

**Target Platform**: CLI multiplataforma (shells Linux/macOS/Windows), runtime
Node.js ≥26

**Project Type**: Ferramenta CLI (projeto único; sem separação frontend/backend)

**Performance Goals**: Init e configuração de agente concluem em menos de 30 segundos
em uma máquina local típica (SC-001); nenhuma outra meta de throughput — este é um
comando local de baixa frequência e invocação única, não um serviço.

**Constraints**: Nenhuma chamada de rede é necessária para esta feature (init/config
de agente opera inteiramente sobre arquivos locais de manifesto/lockfile/config
nativa); deve permanecer idempotente (FR-009, FR-010); nunca deve deixar arquivos
parcialmente escritos em caso de falha (FR-014); nunca deve tocar em conteúdo fora do
bloco gerenciado pelo Maia em arquivos nativos de agente (FR-006, já implementado via
`agent-guidance-marker.ts` e `inject-agent-config.ts`).

**Scale/Scope**: Escopo de projeto único, máquina de desenvolvedor único; tamanhos de
manifesto/lockfile limitados pelo número de capacidades instaladas e agentes
configurados (tipicamente dezenas de entradas, não milhares).

## Constitution Check

*GATE: Deve passar antes da pesquisa da Fase 0. Reverificar após o design da Fase 1.*

| Princípio | Verificação | Status |
|---|---|---|
| I. Test-First | Cada gap (gate de schema, falha não-interativa, limpeza de dir. vazio, escrita atômica) recebe um teste `node:test` escrito antes/junto da correção; `npm test` e `npm run typecheck` devem continuar verdes. | PASS (planejado, ver geração de tarefas na Fase 2) |
| II. Security by Default | Nenhum segredo é tocado por esta feature. A ação destrutiva em escopo (remover um diretório fallback vazio) é restrita a um diretório que o próprio Maia possui e só ocorre após verificação de que ele tem zero entradas — sem depender apenas da intenção do modelo/usuário. | PASS |
| III. Spec-Driven Workflow | Este plano segue o spec ratificado (clarificado em 2026-09-21); `/speckit-tasks` e `/speckit-implement` seguirão com revisão humana entre fases. | PASS |
| IV. Small & Reversible Changes | Cada um dos 4 gaps é implementável e reversível de forma independente; a quebra em tarefas (Fase 2) manterá cada tarefa em um único commit. | PASS |
| V. Single Responsibility per File | A lógica nova segue a convenção existente: um arquivo novo por símbolo (ex.: um `assert-manifest-schema-compatible.ts` dedicado, um `remove-empty-fallback-dir.ts` dedicado), na mesma granularidade dos `src/cli/shared/workspace/*` e `src/agent/catalog/*` existentes. | PASS |
| VI. Scope-Organized Directories | As correções ficam nos diretórios escopados existentes que elas estendem (`src/cli/commands/init/`, `src/cli/shared/workspace/`, `src/agent/catalog/manifest/`) — nenhum escopo de topo novo é necessário. | PASS |
| VII. Clean Code | Nenhuma mudança nessa baseline; a checagem de lint/arquitetura existente (`npm run check:architecture`) continua valendo como gate. | PASS |
| VIII. Pure Functions | A checagem de compatibilidade e a detecção de diretório vazio são predicados puros; apenas o ponto de chamada realiza I/O (`rmdirSync`, `process.exit`/throw), consistente com a separação já existente (ex.: `parseAgentSelection` é puro, `promptForAgentIds` faz I/O). | PASS |
| IX. File Naming Convention | Arquivos novos seguem a nomenclatura `palavra.palavra.ts` separada por ponto já usada nos diretórios que estendem (ex.: padrão de `assert-no-symlink-traversal.ts`); arquivos de teste usam `.test.ts`. | PASS |

Nenhuma violação a justificar. A seção de Complexity Tracking não é necessária.

**Reverificação pós-Fase 1**: O modelo de dados (data-model.md), os contratos
(contracts/init-command.md), e o guia de início rápido (quickstart.md) não
introduzem novas entidades, nenhum escopo de topo novo, e nenhuma dependência de
runtime nova. Todo arquivo novo listado na Estrutura do Projeto abaixo tem
responsabilidade única e vive dentro de um diretório escopado existente. Gate
reconfirmado: PASS, sem alterações na tabela acima.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-init-agents/
├── plan.md              # Este arquivo (saída do comando /speckit-plan)
├── research.md          # Saída da Fase 0 (/speckit-plan)
├── data-model.md         # Saída da Fase 1 (/speckit-plan)
├── quickstart.md         # Saída da Fase 1 (/speckit-plan)
├── contracts/            # Saída da Fase 1 (/speckit-plan)
└── tasks.md              # Saída da Fase 2 (/speckit-tasks — NÃO criado pelo /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── cli/
│   ├── commands/
│   │   ├── init/
│   │   │   ├── init-command.ts               # existente — orquestra o init
│   │   │   ├── prompt-for-agent-ids.ts        # MODIFICAR — distinguir não-TTY de "usuário pulou"
│   │   │   ├── ensure-initialized.ts          # existente
│   │   │   └── assert-manifest-schema-compatible.ts  # NOVO — gate do FR-012
│   │   └── agent/
│   │       └── configure-agents.ts            # existente
│   └── shared/
│       └── workspace/
│           ├── remove-materialized-file.ts    # existente
│           └── remove-empty-fallback-dir.ts    # NOVO — FR-013
├── agent/
│   └── catalog/
│       ├── manifest/
│       │   ├── normalize/
│       │   │   └── normalize-manifest.ts      # MODIFICAR — chamar o gate de compat. de schema
│       │   └── schema/
│       │       └── is-manifest-schema-compatible.ts  # NOVO — predicado puro, FR-012
│       └── store/
│           └── agent-catalog-store.ts         # MODIFICAR — saveManifest/saveLock atômicos, FR-014
└── shared/
    └── fs/
        └── write-file-atomic.ts               # NOVO — helper de escrita atômica compartilhado, FR-014

tests/
├── cli/
│   ├── init-non-interactive-no-agents.test.ts # NOVO — gate não-interativo FR-003/FR-014
│   └── init-schema-incompatible.test.ts       # NOVO — FR-012
├── shared/
│   ├── remove-empty-fallback-dir.test.ts      # NOVO — FR-013
│   └── write-file-atomic.test.ts              # NOVO — FR-014
└── fixtures/
    └── manifests/
        └── incompatible-schema.maia.json      # NOVO fixture para o teste do FR-012
```

**Structure Decision**: Projeto CLI único (layout `src/` / `tests/` existente, sem
separação frontend/backend — confirmado por `bin: { maia: ... }` no `package.json` e
pelos escopos existentes `src/cli/`, `src/agent/`, `src/config/`, `src/shared/`).
Todos os arquivos novos estendem diretórios escopados existentes; nenhum escopo de
topo novo é introduzido. Cada símbolo novo ganha seu próprio arquivo conforme o
Princípio V da Constituição, nomeado com palavras separadas por ponto conforme o
Princípio IX.

## Complexity Tracking

*Nenhuma violação do Constitution Check — esta seção fica intencionalmente vazia.*
