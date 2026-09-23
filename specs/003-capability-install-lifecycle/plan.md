# Implementation Plan: Ciclo de Vida de Instalação de Capacidades

**Branch**: `003-capability-install-lifecycle` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação da feature em `/specs/003-capability-install-lifecycle/spec.md`

**Note**: Este template é preenchido pelo comando `/speckit-plan`; sua definição descreve o fluxo de execução.

## Summary

`maia install`/`maia i` já cobre a maior parte do ciclo de vida de instalação
(FR-001–FR-005, FR-007, FR-009), mas a investigação de código e a sessão de
clarificação de 2026-09-22 revelaram dois problemas concretos que este plano
fecha:

1. **FR-008 (rollback explícito, NON-NEGOTIABLE pela clarificação)**: hoje
   `installSkill`/`installMcp`/o branch de tool em `install-command.ts` seguem
   todos o mesmo padrão de risco — materializar o artefato em disco, *depois*
   escrever a entrada no manifesto (`store.addDependency`), *depois*
   reconstruir o lockfile (`store.buildLock()`). Se o processo morre entre
   qualquer uma dessas etapas, o resultado observável é exatamente o que a
   Clarification 1 proíbe: um artefato órfão sem entrada de manifesto, ou um
   manifesto sem lockfile correspondente. Não existe hoje nenhum mecanismo de
   desfazer — cada arquivo é escrito atomicamente (via `writeFileAtomic`),
   mas a *sequência* de arquivos não é.
2. **FR-006 (remoção incompleta)**: `remove.ts` tem um gap real e verificável
   contra os próprios Acceptance Scenarios do spec (US5.2) e SC-004. Não existe
   branch `if (kind === 'tool')` — o arquivo materializado de uma tool nunca é
   apagado. A remoção de MCP só ressincroniza `.vscode/mcp.json`
   (`store.syncVsCodeMcp()`), não os demais agentes configurados, ao contrário
   do install, que sincroniza todos via `restoreConfiguredAgents`. E embora
   `materializeAgentSkills` seja derivado do lockfile (então uma skill
   removida deixa de ser reescrita nas próximas sincronizações), ele nunca
   *apaga* a cópia nativa antiga que já existia em, por exemplo,
   `.claude/skills/<nome>/SKILL.md` — só escreve o que deveria existir, não
   remove o que não deveria mais existir.

FR-004's novo comportamento de "pular sincronização do agente incompatível
com aviso" (Clarification 2) é fechado como parte do mesmo trabalho que já
toca `configureAgents`/`collectAgentMcpEntries` para o rollback e para a
paridade de remoção.

O restante do requisito já está implementado e é tratado como baseline
coberto por regressão: FR-001–FR-003, FR-005, FR-007 (regeneração do lockfile
a partir do manifesto, conforme Clarification 3 — já é exatamente o que
`store.buildLock()` faz hoje, nenhuma mudança necessária), FR-009 (overwrite
já é o comportamento natural de `addDependency`/`setManifestDependency`,
nenhuma mudança necessária).

## Technical Context

**Language/Version**: TypeScript (type-stripping nativo do Node.js), alvo Node.js ≥26

**Primary Dependencies**: Nenhuma além dos built-ins do Node.js; `typescript`
é dependência apenas de desenvolvimento. Este plano não adiciona nenhuma
dependência de runtime nova — o mecanismo de rollback é implementado como um
helper puro de coordenação (registro de ações de desfazer + execução em
ordem reversa), não como um journal persistido em disco nem como uma
biblioteca de transações externa.

**Storage**: Arquivos JSON planos — `maia.json` (manifesto), `maia.lock.json`
(lockfile), `.maia/skills|tools|mcp/` (fallback), diretórios nativos de
agente (ex.: `.claude/skills/`), `.maia/mcp.env` (credenciais).

**Testing**: `node:test` via `scripts/run-tests.mjs`; o padrão já
estabelecido em `tests/cli/install.test.ts` (store real contra `mkdtempSync`,
sem mock de fs) é reaproveitado. Para o rollback, os testes simulam falha
injetando uma função que lança erro na etapa desejada (ex.: mockar
`store.buildLock` para lançar após a materialização ter ocorrido) e
verificando que o artefato/manifesto foram revertidos.

**Target Platform**: CLI multiplataforma (shells Linux/macOS/Windows),
runtime Node.js ≥26.

**Project Type**: Ferramenta CLI (projeto único; sem separação
frontend/backend).

**Performance Goals**: SC-001 exige que uma instalação atualize
manifesto/lockfile/artefatos/config de agente em uma única invocação sem
passos manuais; o rollback não pode introduzir latência perceptível — é
apenas contabilidade em memória (uma lista de callbacks de desfazer),
sem I/O extra além do que já ocorre nas escritas normais.

**Constraints**: Nenhuma mudança de schema de manifesto/lockfile é
necessária. O mecanismo de rollback deve funcionar dentro de um único
processo síncrono/assíncrono (não precisa sobreviver a um restart do
processo — a spec exige "nenhum estado parcial observável após a operação
terminar ou falhar", não recuperação de crash entre processos diferentes,
já que não há WAL/journal em disco no design escolhido — ver Decision 1 em
research.md).

**Scale/Scope**: Escopo de projeto único; número de capacidades instaladas
tipicamente pequeno (dezenas). O rollback cobre uma instalação/remoção por
vez (não há paralelismo de múltiplas instalações concorrentes no mesmo
processo).

## Constitution Check

*GATE: Deve passar antes da pesquisa da Fase 0. Reverificar após o design da Fase 1.*

| Princípio | Verificação | Status |
|---|---|---|
| I. Test-First | Cada gap (rollback em install/remove, tool removal, MCP removal multi-agente, skip de agente incompatível) recebe teste `node:test` escrito antes/junto da correção; `npm test` e `npm run typecheck` continuam verdes. | PASS (planejado, ver Fase 2 de tarefas) |
| II. Security by Default | Nenhum segredo é tocado por esta feature além do já existente registro de nomes de credencial (inalterado). O rollback em si é uma ação protetora (desfazer escrita parcial), não destrutiva por natureza — reduz risco em vez de introduzi-lo. | PASS |
| III. Spec-Driven Workflow | Este plano segue o spec ratificado e clarificado em 2026-09-22; `/speckit-tasks` e `/speckit-implement` seguirão com revisão humana entre fases, igual ao padrão já usado em 001/002. | PASS |
| IV. Small & Reversible Changes | O rollback e cada correção de remoção (tool, MCP multi-agente, skill nativa) são independentes entre si e revertíveis isoladamente; a quebra em tarefas manterá uma tarefa por commit. | PASS |
| V. Single Responsibility per File | O helper de rollback (registro + execução de ações de desfazer) fica em arquivo próprio; cada correção de remoção (tool, MCP) ganha sua própria função nomeada em vez de inline no branch do `remove.ts`. | PASS |
| VI. Scope-Organized Directories | Todas as mudanças ficam nos diretórios escopados existentes que estendem (`src/cli/install/`, `src/cli/commands/remove.ts` e módulos irmãos, `src/cli/shared/workspace/`) — nenhum escopo de topo novo. | PASS |
| VII. Clean Code | Sem mudança nessa baseline; `npm run check:architecture` continua como gate. | PASS |
| VIII. Pure Functions | O helper de rollback é uma função de coordenação que recebe callbacks (as próprias operações de I/O ficam nos callbacks fornecidos pelo chamador, não dentro do helper) — o helper em si não faz I/O, apenas orquestra ordem de execução e desfazer. | PASS |
| IX. File Naming Convention | Arquivos novos seguem `palavra.palavra.ts`; arquivos de teste usam `.test.ts`. | PASS |

Nenhuma violação a justificar. Complexity Tracking fica vazio.

**Reverificação pós-Fase 1**: data-model.md e os três contratos
(contracts/install-rollback.md, contracts/remove-command.md,
contracts/install-command.md) não introduzem novos escopos de topo nem
dependências de runtime novas. O helper de rollback é reaproveitado por
install (3 branches: skill/tool/mcp) e por remove (3 branches) sem
duplicação de lógica de coordenação — apenas os callbacks de desfazer
diferem por tipo de capacidade. `agentSupportsTransport` é permissivo por
padrão hoje (nenhum `AgentTarget` real declara restrição), o que significa
zero mudança de comportamento observável para os agentes já suportados —
apenas o ponto de extensão exigido pela Clarification 2 é criado. Gate
reconfirmado: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/003-capability-install-lifecycle/
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
│   ├── shared/
│   │   └── rollback/
│   │       └── install-rollback.ts            # NOVO — helper de coordenação de rollback, FR-008
│   ├── install/
│   │   ├── skill/
│   │   │   └── install-skill.ts                # MODIFICAR — envolver com rollback
│   │   └── mcp/
│   │       └── install-mcp.ts                  # MODIFICAR — envolver com rollback
│   └── commands/
│       ├── install/
│       │   └── install-command.ts              # MODIFICAR — branch de tool envolvido com rollback
│       ├── remove.ts                            # MODIFICAR — adicionar branch de tool, MCP multi-agente
│       └── agent/
│           └── remove-native-agent-artifacts.ts  # NOVO — apaga cópias nativas órfãs (skill), FR-006
└── agent/
    └── agents/
        └── inject/
            └── agent-supports-transport.ts       # NOVO — predicado puro, FR-004 (skip de agente incompatível)

tests/
├── cli/
│   ├── install.test.ts                          # MODIFICAR — casos de rollback em falha simulada
│   └── remove.test.ts                            # NOVO — cobertura de remoção de tool, MCP multi-agente,
│                                                    limpeza de cópia nativa de skill (hoje inexistente
│                                                    como arquivo dedicado)
└── shared/
    ├── install-rollback.test.ts                  # NOVO
    └── agent-supports-transport.test.ts           # NOVO
```

**Structure Decision**: Projeto CLI único, mesma estrutura `src/`/`tests/` já
confirmada em 001 e 002. O helper de rollback fica em
`src/cli/shared/rollback/` (novo subdiretório escopado, análogo a
`src/cli/shared/workspace/` já existente) por ser uma preocupação
transversal usada tanto por install quanto por remove — não pertence a
nenhum dos dois comandos especificamente. As correções de remoção seguem a
granularidade já estabelecida em `remove.ts` (um branch por kind), extraída
para uma função nomeada onde a lógica deixa de ser trivial (limpeza de
cópias nativas de skill).

## Complexity Tracking

*Nenhuma violação do Constitution Check — esta seção fica intencionalmente vazia.*
