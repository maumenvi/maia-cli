# Implementation Plan: Lockfile, Integridade & Restauração em CI

**Branch**: `004-lockfile-integrity-ci` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação da feature em `/specs/004-lockfile-integrity-ci/spec.md`

**Note**: Este template é preenchido pelo comando `/speckit-plan`; sua definição descreve o fluxo de execução.

## Summary

Os quatro comandos desta feature (`lock`, `verify`, `ci`, `context`) já existem e
funcionam para os fluxos felizes. As duas sessões de clarificação de 2026-09-22 (10
perguntas) expuseram que **dois critérios de sucesso do spec são hoje falsos** e que
quatro comportamentos estão indefinidos ou inconsistentes com o que as features
001–003 estabeleceram. Este plano fecha seis lacunas:

1. **SC-003 / FR-001 (determinismo) — falso hoje**: `buildLockFromManifest` grava
   `generatedAt: new Date().toISOString()`, então reexecutar `maia lock` sem
   mudança nenhuma produz bytes diferentes. A Clarification 2 decidiu remover o
   campo; a Clarification 10 acrescentou que o arquivo não deve sequer ser
   reescrito quando o conteúdo gerado é idêntico ao que está em disco.
2. **SC-002 / FR-002 (verificação incompleta) — falso hoje**: `verifySourceLock`
   só compara hash quando o pacote tem `artifactHash`; sem ele, checa apenas que o
   arquivo não está vazio, então um artefato sem hash aceita qualquer conteúdo. A
   Clarification 6 decidiu recusar nesse caso.
3. **FR-002 (relato agregado)**: `verifySourceLock` lança no primeiro problema. A
   Clarification 9 decidiu acumular e reportar todos de uma vez.
4. **FR-008 (staleness em CI) — contradição com a 003**: `ci.ts` lê o lockfile em
   disco como fonte de verdade, enquanto `installCommand([])` regenera do manifesto
   (decisão da 003). A Clarification 1 resolveu: CI continua usando o lock em disco,
   mas **falha** se ele estiver desatualizado em relação ao manifesto.
5. **FR-009 (rollback em CI)**: `reinstallFromLock` materializa via dois
   `Promise.all` sem proteção; a Clarification 4 estendeu a garantia de rollback da
   003 (`withRollback`, já implementado) à restauração em CI.
6. **FR-006, FR-010, FR-011 (mensagens e gates)**: `context show` sem contexto dá
   `ENOENT` cru (Clarification 7 → falhar com orientação); `lockfileVersion` existe
   no tipo mas nada o lê (Clarification 5 → gate espelhando o de manifesto da 001);
   fonte inalcançável é indistinguível de capacidade ausente (Clarification 8 →
   distinguir, sem retry).

FR-003, FR-004, FR-005 e FR-007 já estão corretos e são tratados como baseline
coberto por regressão — `ci.ts` já valida antes de materializar (SC-004 tem quatro
testes provando isso) e não tem nenhum ponto interativo.

**Risco de compatibilidade**: os itens 2 e 3 mudam o veredito do `verify` sobre
lockfiles que hoje passam. Um lockfile gerado antes da materialização dos artefatos
não tem `artifactHash` e, após esta feature, passará a falhar a verificação. Isso é
intencional (é o furo que torna SC-002 falso), mas significa que a implementação
precisa tratar a transição, não apenas adicionar a checagem — ver Decision 2 em
research.md.

## Technical Context

**Language/Version**: TypeScript (type-stripping nativo do Node.js), alvo Node.js ≥26

**Primary Dependencies**: Nenhuma além dos built-ins do Node.js (`node:fs`,
`node:crypto`); `typescript` é dependência apenas de desenvolvimento. Este plano
não adiciona nenhuma dependência de runtime.

**Storage**: Arquivos JSON planos — `maia.json` (manifesto), `maia.lock.json`
(lockfile), `.maia/context.dev.json` e `.maia/context.llm.json` (contexto derivado),
artefatos materializados sob `.maia/`.

**Testing**: `node:test` via `scripts/run-tests.mjs`. **Lacuna relevante**: `lock`,
`verify` e `context` não têm nenhum teste direto hoje (`tests/cli/ci.test.ts` existe
e cobre bem SC-004; não existem `lock.test.ts`, `verify.test.ts`,
`context.test.ts`). Este plano cria os três.

**Target Platform**: CLI multiplataforma (shells Linux/macOS/Windows), runtime
Node.js ≥26.

**Project Type**: Ferramenta CLI (projeto único; sem separação frontend/backend).

**Performance Goals**: Nenhuma meta de throughput — comandos de invocação única e
baixa frequência. A única restrição de tempo relevante é que o gate de staleness
(FR-008) não pode introduzir I/O de rede no caminho do `ci`: ver Decision 4.

**Constraints**: Nenhuma mudança de schema do manifesto. O lockfile muda de forma
(remoção de `generatedAt`), o que é uma alteração de formato que a própria feature
introduz — `lockfileVersion` permanece `1`, já que a remoção de um campo que nada
lê não quebra nenhum consumidor (ver Decision 1). O gate de staleness deve comparar
apenas os campos derivados do manifesto, porque `artifactHash` (e portanto
`integrity`) dependem do disco e seriam sempre divergentes num checkout de CI limpo
— esta é a restrição de design mais delicada desta feature.

**Scale/Scope**: Escopo de projeto único; dezenas de capacidades por projeto.

## Constitution Check

*GATE: Deve passar antes da pesquisa da Fase 0. Reverificar após o design da Fase 1.*

| Princípio | Verificação | Status |
|---|---|---|
| I. Test-First | Cada uma das 6 lacunas recebe teste `node:test` escrito antes da correção. Fecha também a ausência total de cobertura de `lock`/`verify`/`context`, criando os três arquivos de teste. | PASS (planejado) |
| II. Security by Default | O item 2 (verify recusa pacote sem hash) é estritamente uma melhoria de postura de segurança: fecha um caminho em que conteúdo arbitrário passava na verificação. Nenhum segredo é tocado. | PASS |
| III. Spec-Driven Workflow | Plano segue o spec com 10 clarificações ratificadas; `/speckit-tasks` e `/speckit-implement` seguem com revisão humana entre fases. | PASS |
| IV. Small & Reversible Changes | As 6 lacunas são independentes entre si e revertíveis isoladamente; a quebra em tarefas manterá uma tarefa por commit. | PASS |
| V. Single Responsibility per File | Cada símbolo novo (comparador de staleness, gate de versão de lockfile, acumulador de problemas de verify) em arquivo próprio, seguindo a granularidade de `src/agent/catalog/lock/`. | PASS |
| VI. Scope-Organized Directories | Mudanças ficam nos diretórios escopados existentes (`src/agent/catalog/lock/`, `src/agent/catalog/lock/verify/`, `src/cli/commands/`) — nenhum escopo de topo novo. | PASS |
| VII. Clean Code | `npm run check:architecture` continua como gate. | PASS |
| VIII. Pure Functions | O comparador de staleness e o gate de versão são predicados puros (recebem lock + manifesto já carregados, não fazem I/O); a acumulação de problemas do verify transforma uma função que lançava em uma que retorna a lista, deixando o lançamento no chamador. | PASS |
| IX. File Naming Convention | Arquivos novos em `palavra.palavra.ts`; testes em `.test.ts`. | PASS |

Nenhuma violação a justificar. Complexity Tracking fica vazio.

**Reverificação pós-Fase 1**: data-model.md e os três contratos
(contracts/verify-lock.md, contracts/ci-command.md,
contracts/lock-verify-context-commands.md) não introduzem escopos de topo novos nem
dependências de runtime. A mudança de assinatura de `verifySourceLock` (de lançar
para retornar problemas) tem 3 call sites confirmados por grep (`verify.ts` 1x,
`ci.ts` 2x) mais o wrapper `store.verifyLock`, todos listados em
contracts/verify-lock.md. A remoção de `generatedAt` afeta apenas o tipo
`SourceLock` e seu construtor — nenhum leitor existe, confirmado por grep. O gate
de staleness é um predicado puro sobre dois lockfiles já em memória, sem I/O
próprio. Gate reconfirmado: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/004-lockfile-integrity-ci/
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
│       ├── lock/
│       │   ├── build.ts                              # MODIFICAR — remover generatedAt (FR-001)
│       │   ├── schema/
│       │   │   └── is-lockfile-version-compatible.ts  # NOVO — predicado puro, FR-010
│       │   ├── staleness/
│       │   │   ├── lock-comparable-projection.ts      # NOVO — projeção do lock sem campos de disco, FR-008
│       │   │   └── is-lock-stale.ts                   # NOVO — predicado puro, FR-008
│       │   └── verify/
│       │       ├── verify-source-lock.ts              # MODIFICAR — acumular problemas, recusar sem hash
│       │       └── lock-verification-problem.ts        # NOVO — tipo do problema acumulado, FR-002
│       └── store/
│           └── agent-catalog-store.ts                 # MODIFICAR — saveLock não reescreve se idêntico (FR-001)
└── cli/
    └── commands/
        ├── lock.ts                                    # MODIFICAR — reportar "sem mudanças" quando idêntico
        ├── verify.ts                                  # MODIFICAR — imprimir todos os problemas, gate de versão
        ├── ci.ts                                      # MODIFICAR — gate de staleness, gate de versão, rollback
        ├── context.ts                                 # MODIFICAR — orientação quando contexto ausente (FR-006)
        └── assert-lockfile-version-compatible.ts       # NOVO — erro tipado + assert, FR-010

tests/
├── cli/
│   ├── lock.test.ts                                   # NOVO — determinismo, não-reescrita (hoje inexistente)
│   ├── verify.test.ts                                 # NOVO — sem hash, multi-problema, versão (hoje inexistente)
│   ├── context.test.ts                                # NOVO — show sem build (hoje inexistente)
│   └── ci.test.ts                                     # MODIFICAR — staleness, rollback, fonte inalcançável
└── shared/
    ├── is-lock-stale.test.ts                          # NOVO
    └── is-lockfile-version-compatible.test.ts          # NOVO
```

**Structure Decision**: Projeto CLI único, mesma estrutura `src/`/`tests/` das
features 001–003. Os predicados novos ficam em subdiretórios escopados dentro de
`src/agent/catalog/lock/` (`schema/`, `staleness/`), espelhando o padrão que a
feature 001 estabeleceu ao criar `src/agent/catalog/manifest/schema/` para o gate
de manifesto — mantendo lockfile e manifesto simétricos na organização. O erro
tipado de versão de lockfile fica em `src/cli/commands/` junto ao equivalente de
manifesto que a 001 criou (`assert-manifest-schema-compatible.ts`), pela mesma
razão de simetria.

## Complexity Tracking

*Nenhuma violação do Constitution Check — esta seção fica intencionalmente vazia.*
