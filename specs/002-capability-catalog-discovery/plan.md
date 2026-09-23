# Implementation Plan: Catálogo de Capacidades & Descoberta

**Branch**: `002-capability-catalog-discovery` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação da feature em `/specs/002-capability-catalog-discovery/spec.md`

**Note**: Este template é preenchido pelo comando `/speckit-plan`; sua definição descreve o fluxo de execução.

## Summary

A listagem e a descoberta de capacidades já existem parcialmente (`maia ls`,
`maia list-skills`, `maia list-tools`, `maia list-capabilities`, `maia source
add`/`ls`), mas uma investigação do código atual revelou que o requisito de maior
risco do spec — **FR-006** (degradar graciosamente e reportar claramente quando
nenhum resultado foi encontrado, distinto de uma fonte indisponível) — **não está
implementado**: `searchCatalog` usa `Promise.allSettled` para isolar falhas por
provedor (bom), mas descarta silenciosamente o motivo de cada rejeição
(`flatMap(... : [])`), então hoje "todas as fontes remotas estão fora do ar" e
"a consulta simplesmente não deu match em nada" produzem exatamente o mesmo
resultado observável (`[]` → "- none"). Isso bloqueia diretamente SC-002 e SC-003.

A sessão de clarificação de 2026-09-21 confirmou a direção deste plano
(`registries`/`sources` permanecem conceitos separados, FR-004 refere-se só a
`registries`) e acrescentou um quinto requisito explícito, FR-008 (precedência
local sobre remoto em identificadores duplicados), que também não está
implementado hoje: `searchCatalog` e os comandos `list-*` mostram resultados
locais e remotos em seções visualmente separadas, sem nenhuma deduplicação —
uma capacidade já instalada localmente pode aparecer de novo na seção de
descoberta remota se um provedor também a indexar.

Este plano fecha o gap de FR-006 e quatro lacunas menores encontradas durante a
investigação e a clarificação, mantendo a estrutura de comandos existente como
base:

1. **FR-006 (reportar falha de fonte vs. zero resultados)**: `searchCatalog`
   passa a retornar também a lista de falhas por provedor (id + motivo), não só
   os resultados; os comandos `list-*` exibem essa distinção tanto no modo texto
   quanto no `--json`, sempre — mesmo quando outras fontes retornaram resultados
   (decisão da Clarification 3).
2. **FR-008 (precedência local sobre remoto)**: um novo passo de deduplicação
   remove, da lista de resultados remotos, qualquer entrada cujo identificador
   canônico já exista no inventário local instalado, antes da exibição.
3. **FR-002/FR-003 (parâmetro de tipo + query + json em um único comando)**:
   `maia ls` (hoje só filtra por tipo, só mostra instalados, sem query/json) e a
   família `list-skills`/`list-tools`/`list-capabilities` (têm query/json mas
   cobertura de tipo fixa por comando) continuam existindo como estão — o spec
   não exige unificá-los em um único comando, e US1/US2 já são satisfeitas pela
   combinação dos comandos existentes. Este plano não força uma unificação fora
   de escopo; ver Assumptions.
4. **FR-005 (URL de fonte Git sintaticamente inválida)**: `source add` hoje
   aceita qualquer string não vazia como URL sem validação. A Clarification 4
   decidiu rejeitar imediatamente; este plano adiciona a validação de sintaxe
   mínima na adição da fonte.
5. **Cobertura de teste**: não existe hoje nenhum teste para `source add`/`ls`,
   nem um teste que exercite "uma fonte fora do ar, outra no ar" ou "todas fora
   do ar" (US4), nem um teste de deduplicação (FR-008). Este plano adiciona os
   três.

O restante do requisito já está implementado e é tratado como baseline coberto
por regressão: FR-001 (inventário local via lockfile), FR-004 (identificadores
canônicos em `CatalogSearchResult.id`, já consumidos pelo fluxo de instalação),
FR-007 (provedores nunca fabricam resultados — já validado por guards em cada
provider).

## Technical Context

**Language/Version**: TypeScript (type-stripping nativo do Node.js), alvo Node.js ≥26

**Primary Dependencies**: Nenhuma além dos built-ins do Node.js (`node:fetch`
global, `AbortController` para timeout); `typescript` é dependência apenas de
desenvolvimento.

**Storage**: Arquivos JSON planos — `maia.json` (manifesto, seções
`registries` e `sources`), `maia.lock.json` (inventário local instalado),
registros JSON locais lidos por `discoverRegistryEntries`.

**Testing**: `node:test` via `scripts/run-tests.mjs`; testes existentes mockam
`globalThis.fetch` para simular respostas HTTP de `skills.sh` e do registro MCP
(ver `tests/cli/list-skills.test.ts`, `tests/cli/list-tools.test.ts`) — este
plano segue o mesmo padrão para simular falhas de provedor.

**Target Platform**: CLI multiplataforma (shells Linux/macOS/Windows), runtime
Node.js ≥26.

**Project Type**: Ferramenta CLI (projeto único; sem separação frontend/backend).

**Performance Goals**: SC-001 exige busca por palavra-chave em menos de 5
segundos em catálogo local aquecido; a busca remota já usa timeout de 8s por
provedor (`default-timeout-ms.ts`), rodando em paralelo via
`Promise.allSettled` — este plano não altera esse orçamento de tempo, apenas
captura o motivo da falha quando o timeout/erro ocorre.

**Constraints**: Nenhuma mudança de schema de manifesto é necessária — os
campos `registries` e `sources` continuam com seus formatos atuais (ver
Decision 2 em research.md sobre por que este plano NÃO unifica os dois
conceitos). Mudanças em `searchCatalog` devem preservar compatibilidade com
todo código que já consome `CatalogSearchResult[]` diretamente.

**Scale/Scope**: Escopo de projeto único; número de provedores/fontes tipicamente
pequeno (dezenas, não milhares); resultados de busca limitados por `limit`
(padrão 10).

## Constitution Check

*GATE: Deve passar antes da pesquisa da Fase 0. Reverificar após o design da Fase 1.*

| Princípio | Verificação | Status |
|---|---|---|
| I. Test-First | Cada gap (falha de provedor reportada, deduplicação local/remoto, validação de URL, testes de `source`) recebe teste `node:test` escrito antes/junto da correção; `npm test` e `npm run typecheck` continuam verdes. | PASS (planejado, ver Fase 2 de tarefas) |
| II. Security by Default | Nenhum segredo é tocado por esta feature. A validação de URL de fonte Git é uma checagem aditiva (rejeita entrada claramente inválida), não uma ação destrutiva; não introduz dependência de rede nova além do fetch já existente. | PASS |
| III. Spec-Driven Workflow | Este plano segue o spec ratificado; `/speckit-tasks` e `/speckit-implement` seguirão com revisão humana entre fases, igual ao padrão já usado em 001. | PASS |
| IV. Small & Reversible Changes | Os cinco itens do Summary são independentes entre si e revertíveis isoladamente; a quebra em tarefas manterá uma tarefa por commit. | PASS |
| V. Single Responsibility per File | A mudança em `searchCatalog` introduz um tipo de retorno novo (`CatalogSearchOutcome`) em arquivo próprio; a validação de URL de fonte vira uma função pura em arquivo próprio, seguindo a granularidade já usada em `providers/core/`. | PASS |
| VI. Scope-Organized Directories | Todas as mudanças ficam nos diretórios escopados existentes que estendem (`src/agent/catalog/providers/core/`, `src/cli/commands/source.ts`, `src/cli/commands/list-*/`) — nenhum escopo de topo novo. | PASS |
| VII. Clean Code | Sem mudança nessa baseline; `npm run check:architecture` continua como gate. | PASS |
| VIII. Pure Functions | O predicado de validação de URL de fonte é puro; a agregação de falhas em `searchCatalog` permanece uma função que só orquestra promises já existentes, sem I/O adicional. | PASS |
| IX. File Naming Convention | Arquivos novos seguem `palavra.palavra.ts`; arquivos de teste usam `.test.ts`. | PASS |

Nenhuma violação a justificar. Complexity Tracking fica vazio.

**Reverificação pós-Fase 1**: data-model.md e os três contratos
(contracts/search-catalog.md, contracts/source-command.md,
contracts/list-discovery-commands.md) não introduzem novos escopos de topo nem
dependências de runtime novas. A mudança de assinatura de `searchCatalog`
(`CatalogSearchResult[]` → `CatalogSearchOutcome`) tem 6 chamadores afetados,
listados explicitamente em contracts/search-catalog.md, todos dentro de
diretórios já escopados (`cli/commands/list-*`, `cli/commands/install`,
`cli/commands/mcp`, `cli/commands/skills`) — nenhum chamador fica em um escopo
novo. Gate reconfirmado: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/002-capability-catalog-discovery/
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
├── agent/
│   └── catalog/
│       ├── providers/
│       │   ├── contracts/
│       │   │   ├── catalog-search-result.ts        # existente
│       │   │   └── catalog-search-failure.ts        # NOVO — {providerId, kind, message}, FR-006
│       │   └── core/
│       │       ├── search-catalog.ts                 # MODIFICAR — retornar CatalogSearchOutcome
│       │       ├── catalog-search-outcome.ts          # NOVO — {results, failures}, FR-006
│       │       └── exclude-locally-installed.ts       # NOVO — dedup local/remoto, FR-008
│       └── source/
│           └── is-valid-git-source-url.ts              # NOVO — predicado puro, FR-005 edge case
├── cli/
│   └── commands/
│       ├── list-skills/
│       │   └── print-lines.ts                        # MODIFICAR (ou novo helper) — exibir falhas de fonte
│       ├── list-tools/
│       │   └── (mesma mudança, arquivo espelhado)
│       ├── list-capabilities/
│       │   └── (mesma mudança, arquivo espelhado)
│       └── source.ts                                  # MODIFICAR — validar sintaxe de URL no add

tests/
├── cli/
│   ├── list-skills.test.ts                            # MODIFICAR — casos de fonte indisponível e dedup
│   └── source.test.ts                                  # NOVO — cobertura de source add/ls, hoje inexistente
└── shared/
    ├── is-valid-git-source-url.test.ts                 # NOVO
    └── exclude-locally-installed.test.ts                # NOVO — FR-008
```

**Structure Decision**: Projeto CLI único, mesma estrutura `src/`/`tests/` já
confirmada em 001-project-init-agents/plan.md. Todos os arquivos novos estendem
diretórios escopados existentes (`providers/contracts/`, `providers/core/`,
`agent/catalog/source/`). A duplicação de helpers entre `list-skills/`,
`list-tools/`, e `list-capabilities/` (três cópias quase idênticas de
`print-lines.ts`/`parse-args.ts`, encontrada durante a investigação) é uma
melhoria de reuso genuína mas está fora do escopo deste plano — nenhum dos 8
FRs do spec exige refatorar essa duplicação, e mexer nela infla o raio de
mudança sem necessidade funcional. Ver Assumptions.

## Complexity Tracking

*Nenhuma violação do Constitution Check — esta seção fica intencionalmente vazia.*
