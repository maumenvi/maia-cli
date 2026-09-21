---

description: "Lista de tarefas para a implementação da feature"
---

# Tasks: Inicialização do Projeto & Configuração de Agentes

**Input**: Documentos de design em `/specs/001-project-init-agents/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/init-command.md, quickstart.md

**Tests**: Testes são obrigatórios nesta feature — a Constituição do projeto declara
Test-First como Princípio I, NON-NEGOTIABLE ("Nenhuma lógica nova entra sem teste").
Cada tarefa de correção abaixo tem uma tarefa de teste correspondente que deve ser
escrita e falhar antes da implementação.

**Organization**: As tarefas são agrupadas pela User Story do spec.md que exercitam.
Os quatro gaps fechados por este plano (FR-003/FR-014 não-interativo, FR-012 gate de
schema, FR-013 limpeza de diretório vazio, FR-014 escrita atômica) mapeiam da
seguinte forma:

- **US1** (Inicializar um novo projeto, P1) é o fluxo que exercita a checagem de
  não-interatividade e a escrita atômica do manifesto/lockfile — os dois gaps ficam
  nessa fase.
- **US2** (Selecionar e configurar agentes, P1) é o fluxo que exercita o gate de
  compatibilidade de schema, pois ele roda antes de qualquer seleção de agente.
- O gap de limpeza de diretório fallback vazio (FR-013) é exercitado pelo comando
  `maia rm`, que não tem User Story própria neste spec (US1–US4 cobrem apenas
  init/configuração); ele é tratado na fase Foundational por afetar um helper
  compartilhado (`remove-materialized-file.ts` já existe, esta tarefa adiciona o
  helper simétrico de limpeza de diretório) sem depender de nenhuma outra tarefa.
- **US3** e **US4** não têm gaps de comportamento identificados pela sessão de
  clarificação — são baseline já implementado e testado; nenhuma tarefa nova é
  necessária para elas nesta iteração.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: A qual user story esta tarefa pertence (ex.: US1, US2)
- Caminhos de arquivo exatos são incluídos nas descrições

## Path Conventions

Projeto único (CLI): `src/`, `tests/` na raiz do repositório — conforme confirmado
em plan.md → Project Structure.

## Phase 1: Setup

**Purpose**: Nenhuma inicialização de projeto nova é necessária — a estrutura
`src/`/`tests/`, o toolchain TypeScript, e o runner `node:test` já existem e estão
configurados (ver Technical Context em plan.md). Esta fase só cria o fixture de
teste compartilhado usado pelas tarefas de teste abaixo.

- [X] T001 [P] Criar fixture de manifesto com `maiaVersion` incompatível em
  `tests/fixtures/manifests/incompatible-schema.maia.json`, com o conteúdo
  `{"name":"fixture","version":"0.1.0","maiaVersion":"^99.0.0","config":{},"registries":{},"sources":{},"skills":{},"mcps":{},"tools":{},"agents":{}}`
  (usado pela tarefa de teste do FR-012 na Fase 3)

**Checkpoint**: Fixture pronto — as fases seguintes podem começar.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura compartilhada que bloqueia as User Stories 1 e 2 — o
helper de escrita atômica (usado por ambas) e o helper de limpeza de diretório
fallback vazio (FR-013, exercitado por `maia rm`, sem User Story própria neste
spec mas com o mesmo padrão pure-predicate + I/O-no-caller das outras correções).

**⚠️ CRITICAL**: Nenhuma tarefa de User Story pode começar até esta fase estar completa.

- [X] T002 [P] Escrever teste para `writeFileAtomic` em
  `tests/shared/write-file-atomic.test.ts`, cobrindo: (a) escrita bem-sucedida
  produz o conteúdo exato no `targetPath`; (b) uma falha simulada durante a escrita
  do arquivo temporário deixa o `targetPath` original intacto quando ele já
  existia; (c) nenhum arquivo `.tmp` residual permanece após sucesso ou falha.
  Este teste DEVE falhar antes da T003 ser implementada.
- [X] T003 [P] Implementar `writeFileAtomic(targetPath: string, content: string):
  void` em `src/shared/fs/write-file-atomic.ts`, escrevendo em um arquivo
  temporário no mesmo diretório de `targetPath` e usando `renameSync` para
  substituição atômica, conforme Decision 4 em research.md. Deve relançar o erro
  `fs` original (preservando seu `code`) em caso de falha, limpando o arquivo
  temporário antes de relançar. Faz a T002 passar.
- [X] T004 [P] Escrever teste para `removeEmptyFallbackDir` em
  `tests/shared/remove-empty-fallback-dir.test.ts`, cobrindo: (a) diretório vazio é
  removido; (b) diretório com entradas restantes é deixado intocado; (c) diretório
  inexistente (`ENOENT`) é tratado como no-op sem erro; (d) outros erros do
  sistema de arquivos são relançados. Este teste DEVE falhar antes da T005 ser
  implementada.
- [X] T005 [P] Implementar `removeEmptyFallbackDir(dirPath: string): void` em
  `src/cli/shared/workspace/remove-empty-fallback-dir.ts`, checando
  `readdirSync(dirPath).length === 0` antes de chamar `rmdirSync(dirPath)`,
  engolindo `ENOENT` mas relançando qualquer outro erro, conforme Decision 3 em
  research.md. Faz a T004 passar.
- [X] T006 [US-] Integrar `removeEmptyFallbackDir` ao comando de remoção em
  `src/cli/commands/remove.ts`, chamando-o após `removeMaterializedFile` para o
  diretório pai do artefato removido (skill/tool), satisfazendo o FR-013. Sem
  User Story própria neste spec — depende de T005.

**Checkpoint**: Infraestrutura pronta — a implementação de US1 e US2 pode começar.

---

## Phase 3: User Story 1 - Inicializar um novo projeto (Priority: P1) 🎯 MVP

**Goal**: `maia init` cria manifesto/lockfile/diretórios fallback de forma correta
e, quando rodado em um ambiente não-interativo sem agentes, falha explicitamente em
vez de silenciosamente cair no fallback-only; escritas de manifesto/lockfile nunca
deixam arquivo parcial em caso de falha.

**Independent Test**: Rodar `maia init` em um diretório de projeto não
inicializado, com e sem TTY, e verificar os comportamentos descritos no Cenário 1
de quickstart.md (falha explícita não-interativa) e no Cenário 3
(escrita atômica, via simulação de falha de disco).

### Tests for User Story 1 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da implementação**

- [X] T007 [P] [US1] Escrever teste de integração para `maia init` sem agentes em
  ambiente não-interativo (stdin/stdout não-TTY simulados) em
  `tests/cli/init-non-interactive-no-agents.test.ts`, cobrindo: (a) exit code
  diferente de zero; (b) mensagem de erro explícita orientando passar agentes como
  argumentos; (c) nenhum `maia.json`, `maia.lock.json`, ou diretório `.maia/` é
  criado no diretório de teste. Referencia o Cenário 1 de quickstart.md. Este
  teste DEVE falhar antes da T009 ser implementada.
- [X] T008 [P] [US1] Escrever teste de regressão para `maia init <agent>` em
  ambiente não-interativo com agente explícito, no mesmo arquivo
  `tests/cli/init-non-interactive-no-agents.test.ts`, verificando que o
  comportamento de sucesso existente (manifesto, lockfile, e configuração nativa
  do agente criados) continua funcionando quando agentes SÃO fornecidos
  explicitamente. Referencia o Cenário 2 de quickstart.md.

### Implementation for User Story 1

- [X] T009 [US1] Modificar `promptForAgentIds` em
  `src/cli/commands/init/prompt-for-agent-ids.ts` para retornar o tipo
  `AgentSelectionOutcome` definido em data-model.md
  (`{ kind: 'selected', agentIds } | { kind: 'skipped' } | { kind: 'non-interactive' }`)
  em vez de um `string[]` bruto, preservando a checagem de TTY existente mas
  tornando o caso não-TTY distinguível do caso "TTY, usuário pulou". Depende de
  T007/T008 (testes escritos e falhando).
- [X] T010 [US1] Atualizar `initCommand` em
  `src/cli/commands/init/init-command.ts` para tratar
  `AgentSelectionOutcome.kind === 'non-interactive'` lançando um erro explícito
  com mensagem orientando o uso de argumentos de agente, sem chamar
  `store.saveSelectedAgents` nem qualquer outra operação de escrita, satisfazendo
  FR-003 e a Behavior 1 do contracts/init-command.md. Depende de T009. Faz T007
  passar.
- [X] T011 [US1] Atualizar `AgentCatalogStore.saveManifest` e
  `AgentCatalogStore.saveLock` em
  `src/agent/catalog/store/agent-catalog-store.ts` para usar `writeFileAtomic`
  (de T003) em vez de `writeFileSync` diretamente, satisfazendo FR-014 e a
  Behavior 3 do contracts/init-command.md. Depende de T003.

**Checkpoint**: Neste ponto, a User Story 1 deve estar totalmente funcional e
testável de forma independente — `npm test -- tests/cli/init-non-interactive-no-agents.test.ts`
deve passar.

---

## Phase 4: User Story 2 - Selecionar e configurar um ou mais agentes (Priority: P1)

**Goal**: `maia init`/`agent add` recusam continuar quando o manifesto existente
foi escrito por uma versão de schema incompatível, reportando a incompatibilidade
explicitamente em vez de mesclar silenciosamente campos desconhecidos.

**Independent Test**: Escrever um `maia.json` com `maiaVersion` incompatível no
diretório de teste, rodar `maia init claude`, e verificar o comportamento descrito
no Cenário 3 de quickstart.md (exit code diferente de zero, mensagem nomeando
ambas as versões, arquivo original byte-a-byte inalterado).

### Tests for User Story 2 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da implementação**

- [X] T012 [P] [US2] Escrever teste unitário para o predicado
  `isManifestSchemaCompatible` em
  `tests/shared/is-manifest-schema-compatible.test.ts`, cobrindo: (a) versão do
  manifesto satisfeita pelo range suportado → `true`; (b) versão do manifesto mais
  antiga que o range suportado → `false`; (c) versão do manifesto mais nova que o
  range suportado → `false`. Este teste DEVE falhar antes da T014 ser
  implementada.
- [X] T013 [P] [US2] Escrever teste de integração para `maia init` contra o
  fixture de schema incompatível em
  `tests/cli/init-schema-incompatible.test.ts`, usando o fixture de T001
  (`tests/fixtures/manifests/incompatible-schema.maia.json`), cobrindo: (a) exit
  code diferente de zero; (b) mensagem de erro nomeia tanto o `maiaVersion`
  declarado quanto o range suportado pela CLI; (c) o arquivo de manifesto no
  diretório de teste permanece byte-a-byte idêntico ao fixture original após a
  tentativa de init. Referencia o Cenário 3 de quickstart.md. Este teste DEVE
  falhar antes da T015 ser implementada.

### Implementation for User Story 2

- [X] T014 [P] [US2] Implementar `isManifestSchemaCompatible(maiaVersion: string,
  runningCliVersion: string): boolean` em
  `src/agent/catalog/manifest/schema/is-manifest-schema-compatible.ts` como
  função pura, comparando o range semver declarado (ex.: `'^1.0.0'`) contra a
  versão da CLI em execução, sem depender de biblioteca semver externa, conforme
  Decision 2 em research.md. Faz T012 passar.
- [X] T015 [US2] Criar o tipo de erro `ManifestSchemaCompatibilityError` (campos
  `manifestVersion`, `supportedRange`, conforme data-model.md) e a função que o
  lança, `assertManifestSchemaCompatible`, em
  `src/cli/commands/init/assert-manifest-schema-compatible.ts`, chamando
  `isManifestSchemaCompatible` (T014) e lançando o erro tipado quando
  incompatível. Depende de T014.
- [X] T016 [US2] Integrar `assertManifestSchemaCompatible` ao carregamento do
  manifesto — chamado a partir de `normalizeManifest` em
  `src/agent/catalog/manifest/normalize/normalize-manifest.ts` (ou de seu
  chamador em `AgentCatalogStore.loadManifest`, conforme a Decision 2 em
  research.md) — antes de mesclar o conteúdo parseado com os padrões, garantindo
  que nenhuma alteração de arquivo ocorre quando a checagem falha, satisfazendo
  FR-012 e a Behavior 2 do contracts/init-command.md. Depende de T015. Faz T013
  passar.

**Checkpoint**: Neste ponto, as User Stories 1 E 2 devem funcionar de forma
independente — `npm test -- tests/cli/init-schema-incompatible.test.ts` deve
passar sem quebrar `tests/cli/init-non-interactive-no-agents.test.ts`.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Validação final cruzando as quatro correções e conformidade com a
Constituição do projeto.

- [X] T017 [P] Rodar `npm run typecheck` e confirmar zero erros após todas as
  mudanças das Fases 2–4, conforme Princípio I da Constituição (typecheck sempre
  verde).
- [X] T018 [P] Rodar `npm run check:architecture` e confirmar que todos os
  arquivos novos (T003, T005, T014, T015) têm exatamente um símbolo arquitetural
  documentado por arquivo, conforme Princípio V da Constituição.
- [X] T019 Executar manualmente os 5 cenários de quickstart.md em um diretório de
  projeto temporário fora do repositório, confirmando que o comportamento
  observado corresponde exatamente ao descrito em cada cenário (Behaviors 1–4 de
  contracts/init-command.md).
- [X] T020 Rodar `npm test` completo e confirmar que a suíte inteira passa,
  incluindo os testes pré-existentes de `tests/cli/agent.test.ts` (regressão de
  US2/US3/US4 já implementadas), conforme Princípio I da Constituição.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente.
- **Foundational (Phase 2)**: Depende da conclusão do Setup — BLOQUEIA as User
  Stories 1 e 2 (ambas usam `writeFileAtomic`; T006 depende de T005 mas não
  bloqueia US1/US2).
- **User Story 1 (Phase 3)**: Depende da conclusão da Foundational (usa
  `writeFileAtomic` de T003). Sem dependência de US2.
- **User Story 2 (Phase 4)**: Depende da conclusão da Foundational. Sem
  dependência de US1 — pode rodar em paralelo com a Phase 3 se houver capacidade
  de equipe, já que ambas tocam arquivos diferentes dentro de
  `src/cli/commands/init/` (T009/T010/T011 vs. T014/T015/T016).
- **Polish (Final Phase)**: Depende da conclusão de US1 e US2.

### User Story Dependencies

- **User Story 1 (P1)**: Pode começar após a Foundational (Phase 2) — sem
  dependência de outras user stories.
- **User Story 2 (P1)**: Pode começar após a Foundational (Phase 2) — sem
  dependência de US1, embora ambas modifiquem arquivos dentro de
  `src/cli/commands/init/` (arquivos diferentes: `prompt-for-agent-ids.ts` e
  `init-command.ts` para US1 vs. `assert-manifest-schema-compatible.ts` novo para
  US2).

### Within Each User Story

- Testes DEVEM ser escritos e FALHAR antes da implementação.
- Helpers puros (predicados, funções de I/O isoladas) antes dos pontos de
  integração que os chamam.
- Integração em `init-command.ts` por último, depois que os helpers que ela
  consome existem e estão testados.

### Parallel Opportunities

- T002 e T004 (testes de helpers Foundational) podem rodar em paralelo — arquivos
  diferentes, sem dependência mútua.
- T003 e T005 (implementação dos helpers Foundational) podem rodar em paralelo
  após seus respectivos testes existirem.
- T007 e T008 (testes de US1) podem rodar em paralelo — mesmo arquivo mas casos
  de teste independentes; T012 e T013 (testes de US2) também.
- Uma vez que a Foundational (Phase 2) esteja completa, a Phase 3 (US1) e a
  Phase 4 (US2) inteiras podem rodar em paralelo se houver dois
  desenvolvedores/agentes disponíveis, pois tocam conjuntos de arquivos
  disjuntos.

---

## Parallel Example: Foundational (Phase 2)

```bash
# Lançar os dois testes de helper juntos:
Task: "Escrever teste para writeFileAtomic em tests/shared/write-file-atomic.test.ts"
Task: "Escrever teste para removeEmptyFallbackDir em tests/shared/remove-empty-fallback-dir.test.ts"

# Depois, lançar as duas implementações juntas:
Task: "Implementar writeFileAtomic em src/shared/fs/write-file-atomic.ts"
Task: "Implementar removeEmptyFallbackDir em src/cli/shared/workspace/remove-empty-fallback-dir.ts"
```

## Parallel Example: User Story 1 vs. User Story 2

```bash
# Com dois desenvolvedores/agentes, após a Foundational estar completa:
Developer A: T007 → T008 → T009 → T010 → T011  (User Story 1)
Developer B: T012 → T013 → T014 → T015 → T016  (User Story 2)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar a Phase 1: Setup.
2. Completar a Phase 2: Foundational (CRÍTICO — bloqueia ambas as user stories).
3. Completar a Phase 3: User Story 1.
4. **PARAR e VALIDAR**: rodar
   `npm test -- tests/cli/init-non-interactive-no-agents.test.ts` e confirmar que
   passa isoladamente.
5. Neste ponto, o gap mais crítico do FR-003/FR-014 (comportamento não-interativo
   silencioso) já está fechado, mesmo sem a User Story 2.

### Incremental Delivery

1. Completar Setup + Foundational → infraestrutura pronta (helpers de escrita
   atômica e limpeza de diretório disponíveis e testados).
2. Adicionar User Story 1 → testar independentemente → é o MVP desta feature de
   correção de gaps.
3. Adicionar User Story 2 → testar independentemente → fecha o gap do gate de
   schema.
4. Rodar a fase de Polish → validar toda a suíte e os cenários de quickstart.md
   juntos.
5. Cada story adiciona valor sem quebrar a anterior — nenhuma delas depende da
   outra estar completa.

### Parallel Team Strategy

Com dois desenvolvedores/agentes disponíveis:

1. Equipe completa Setup + Foundational junto (bloqueante para ambos).
2. Uma vez que a Foundational esteja pronta:
   - Desenvolvedor A: User Story 1 (T007–T011)
   - Desenvolvedor B: User Story 2 (T012–T016)
3. As stories completam e se integram de forma independente — arquivos tocados
   não se sobrepõem.

---

## Notes

- Tarefas `[P]` = arquivos diferentes, sem dependências entre si.
- O rótulo `[Story]` mapeia a tarefa à user story específica para rastreabilidade;
  T001 e T006 não carregam rótulo de story por serem, respectivamente, um
  fixture compartilhado e uma correção sem User Story própria no spec (FR-013).
- Cada user story deve ser completável e testável de forma independente.
- Verificar que os testes falham antes de implementar.
- Fazer commit após cada tarefa ou grupo lógico, conforme Princípio IV da
  Constituição (mudanças pequenas e reversíveis, uma tarefa por commit).
- Parar em qualquer checkpoint para validar a story isoladamente.
- Evitar: tarefas vagas, conflitos no mesmo arquivo, dependências entre stories
  que quebrem a independência.
