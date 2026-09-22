---

description: "Lista de tarefas para a implementação da feature"
---

# Tasks: Lockfile, Integridade & Restauração em CI

**Input**: Documentos de design em `/specs/004-lockfile-integrity-ci/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/verify-lock.md, contracts/ci-command.md,
contracts/lock-verify-context-commands.md, quickstart.md

**Tests**: Testes são obrigatórios nesta feature — a Constituição do projeto
declara Test-First como Princípio I, NON-NEGOTIABLE. Além disso, `lock`, `verify`
e `context` não têm **nenhum** teste direto hoje; esta feature cria os três
arquivos.

**Organization**: As tarefas são agrupadas pela User Story do spec.md que
exercitam. As 6 lacunas do Summary de plan.md mapeiam assim:

- **Foundational**: a mudança de assinatura de `verifySourceLock` (de lançar para
  retornar problemas) e o gate de versão de lockfile são consumidos tanto por US2
  quanto por US3 — tratá-los como pré-requisito bloqueante evita implementá-los
  duas vezes.
- **US1** (Gerar/atualizar lockfile, P1) ganha o determinismo: remoção de
  `generatedAt` e não-reescrita quando o conteúdo é idêntico.
- **US2** (Verificar integridade, P1) ganha a recusa de pacote sem hash
  registrado e o relato agregado de todos os problemas.
- **US3** (Restaurar em CI, P1) ganha o gate de staleness contra o manifesto, o
  rollback da materialização, e a distinção entre fonte inalcançável e capacidade
  ausente.
- **US4** (Construir/inspecionar contexto, P3) ganha a orientação quando o
  contexto nunca foi construído.

**⚠️ Nota de compatibilidade**: a tarefa T012 (verify recusa pacote sem hash) muda
o veredito sobre lockfiles que hoje passam — um lockfile gerado antes dos
artefatos serem materializados não tem `artifactHash` e passará a falhar. Isso é
intencional (é o furo que torna SC-002 falso), e T011 cobre esse caso
explicitamente para que o comportamento seja consciente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: A qual user story esta tarefa pertence
- Caminhos de arquivo exatos são incluídos nas descrições

## Path Conventions

Projeto único (CLI): `src/`, `tests/` na raiz do repositório — conforme
confirmado em plan.md → Project Structure.

## Phase 1: Setup

**Purpose**: Confirmar a baseline antes de qualquer mudança. Nenhuma
inicialização de projeto nova é necessária.

- [X] T001 Rodar `npm test` e `npm run typecheck` para confirmar que a suíte está
  verde antes de qualquer mudança desta feature (baseline de referência).

**Checkpoint**: Baseline confirmada.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Mudar `verifySourceLock` para acumular problemas em vez de lançar
(Decision 3 em research.md, contracts/verify-lock.md) e criar o gate de versão de
lockfile (Decision 6, FR-010). Ambos são consumidos por US2 e US3.

**⚠️ CRITICAL**: Nenhuma tarefa de US2 ou US3 pode começar até esta fase estar
completa. `npm run typecheck` DEVE ficar verde ao final.

- [X] T002 [P] Criar os tipos `LockVerificationProblem` (`{ packageId: string;
  kind: 'metadata' | 'missing-artifact' | 'hash-mismatch' |
  'missing-artifact-hash' | 'empty-artifact'; message: string }`) em
  `src/agent/catalog/lock/verify/lock-verification-problem.ts` e
  `LockVerificationResult` (`{ ok: true } | { ok: false; problems:
  LockVerificationProblem[] }`) em
  `src/agent/catalog/lock/verify/lock-verification-result.ts`, conforme
  data-model.md.
- [X] T003 [P] Escrever teste unitário para `isLockfileVersionCompatible` em
  `tests/shared/is-lockfile-version-compatible.test.ts` (novo arquivo), cobrindo:
  (a) versão igual à suportada → `true`; (b) versão maior que a suportada →
  `false`; (c) versão menor que a suportada → `false`. Este teste DEVE falhar
  antes da T005 ser implementada.
- [X] T004 Modificar `verifySourceLock` em
  `src/agent/catalog/lock/verify/verify-source-lock.ts` para retornar
  `LockVerificationResult` em vez de lançar: percorrer **todos** os pacotes
  acumulando um problema por condição detectada, sem interromper a varredura.
  Modificar também `verifySourceLockMetadata` em
  `src/agent/catalog/lock/verify/verify-source-lock-metadata.ts` para acumular
  problemas do tipo `metadata` em vez de lançar, contribuindo para a mesma lista.
  Erros de infraestrutura (ex.: falha de I/O ao ler arquivo que `existsSync`
  reportou presente) continuam sendo lançados. Depende de T002.
- [X] T005 [P] Implementar `isLockfileVersionCompatible(lockfileVersion: number,
  supported: number): boolean` em
  `src/agent/catalog/lock/schema/is-lockfile-version-compatible.ts` como função
  pura, e o erro tipado + `assertLockfileVersionCompatible` em
  `src/cli/commands/assert-lockfile-version-compatible.ts`, espelhando o padrão de
  `assert-manifest-schema-compatible.ts` criado pela feature 001. Faz T003 passar.
- [X] T006 Atualizar `AgentCatalogStore.verifyLock` em
  `src/agent/catalog/store/agent-catalog-store.ts` para repassar o novo
  `LockVerificationResult` sem convertê-lo em exceção (a borda CLI decide), e
  atualizar os 3 call sites para desestruturar o resultado: `src/cli/commands/verify.ts`
  (1 chamada) e `src/cli/commands/ci.ts` (2 chamadas). Nesta tarefa os chamadores
  apenas lançam se `ok === false` preservando o comportamento atual; a formatação
  agregada é T013. Depende de T004.
- [X] T007 Rodar `npm run typecheck` e confirmar zero erros após T002–T006.
  Depende de T006.

**Checkpoint**: `verifySourceLock` acumula problemas, gate de versão disponível,
build compila. US2 e US3 podem começar.

---

## Phase 3: User Story 1 - Gerar ou atualizar o lockfile (Priority: P1) 🎯 MVP

**Goal**: `maia lock` produz um lockfile byte-a-byte idêntico ao reexecutar sobre
um estado inalterado, e não reescreve o arquivo nesse caso — tornando SC-003
verdadeiro pela primeira vez.

**Independent Test**: Rodar `maia lock` duas vezes sem mudança e verificar que o
conteúdo é idêntico e que o timestamp de modificação do arquivo não mudou
(Cenário 1 de quickstart.md).

### Tests for User Story 1 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da
> implementação**

- [X] T008 [P] [US1] Criar `tests/cli/lock.test.ts` (novo arquivo, hoje
  inexistente) com os casos: (a) rodar `lockCommand` duas vezes sobre um projeto
  inalterado e verificar que o conteúdo de `maia.lock.json` é byte-a-byte
  idêntico; (b) verificar que o `mtime` do arquivo não mudou entre as duas
  execuções; (c) verificar que o lockfile gerado não contém a chave
  `generatedAt`. Referencia Behavior 1 de
  contracts/lock-verify-context-commands.md. Este teste DEVE falhar antes da T009
  e T010 serem implementadas.

### Implementation for User Story 1

- [X] T009 [US1] Remover o campo `generatedAt` da interface `SourceLock` em
  `src/agent/catalog/types/lock/source-lock.ts` e da construção do objeto em
  `src/agent/catalog/lock/build.ts` (linha `generatedAt: new
  Date().toISOString()`). Manter `lockfileVersion: 1` inalterado — a remoção de um
  campo que nenhum consumidor lê não quebra leitura (Decision 1 em research.md).
- [X] T010 [US1] Modificar `AgentCatalogStore.saveLock` em
  `src/agent/catalog/store/agent-catalog-store.ts` para comparar o conteúdo
  serializado com o arquivo existente em disco e **não escrever** quando forem
  idênticos, preservando o `mtime` (FR-001, Clarification 10). A checagem fica no
  `saveLock` — e não no `lockCommand` — para cobrir também install, remove, ci e
  context, que chamam `buildLock()`. Depende de T009. Faz T008 passar.
- [X] T011 [US1] Atualizar a saída de `src/cli/commands/lock.ts` para informar
  "nenhuma mudança" quando o lockfile não foi reescrito, em vez de alegar
  atualização incondicionalmente. Depende de T010.

**Checkpoint**: US1 funcional e testável isoladamente —
`npm test -- tests/cli/lock.test.ts` deve passar.

---

## Phase 4: User Story 2 - Verificar a integridade do lockfile (Priority: P1)

**Goal**: `maia verify` recusa pacotes sem hash registrado (fechando o furo que
torna SC-002 falso) e reporta todos os problemas de uma vez em vez de parar no
primeiro.

**Independent Test**: Corromper dois artefatos simultaneamente e verificar que
ambos aparecem na saída (Cenário 4 de quickstart.md); construir um lockfile com
pacote materializado sem `artifactHash` e verificar que o verify falha (Cenário
5).

### Tests for User Story 2 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da
> implementação**

- [X] T012 [P] [US2] Criar `tests/cli/verify.test.ts` (novo arquivo, hoje
  inexistente) com os casos: (a) verify contra instalação íntegra tem sucesso;
  (b) verify sem lockfile falha orientando a rodar lock (regressão do baseline);
  (c) **dois** artefatos corrompidos simultaneamente → ambos aparecem na saída,
  não apenas o primeiro; (d) lockfile com `lockfileVersion` incompatível → falha
  reportando ambas as versões, **não** como erro de integridade. Referencia
  Behaviors 2, 4 e 5 de contracts/lock-verify-context-commands.md. Este teste DEVE
  falhar antes da T014 ser implementada.
- [X] T013 [P] [US2] No mesmo `tests/cli/verify.test.ts`, adicionar o caso de
  compatibilidade descrito na nota do topo deste arquivo: um lockfile que registra
  um pacote materializado **sem** `artifactHash` → o verify falha indicando
  lockfile incompleto, em vez de passar por o arquivo ser não-vazio. Referencia
  Behavior 3. Este teste DEVE falhar antes da T015 ser implementada.

### Implementation for User Story 2

- [X] T014 [US2] Atualizar `src/cli/commands/verify.ts` para (a) chamar
  `assertLockfileVersionCompatible` (de T005) antes de qualquer outra validação;
  (b) formatar e imprimir **todos** os problemas do `LockVerificationResult`
  identificando cada pacote e tipo de problema, antes de lançar uma única vez.
  Depende de T005, T006. Faz T012 passar.
- [X] T015 [US2] Em `src/agent/catalog/lock/verify/verify-source-lock.ts`,
  substituir o ramo final que hoje só checa `fingerprint.length === 0` por um que
  registra um problema `missing-artifact-hash` para todo pacote materializado sem
  `artifactHash`, com mensagem orientando a regerar o lockfile. Manter
  `empty-artifact` para o caso de arquivo vazio. Conforme Decision 2 em
  research.md. Depende de T004. Faz T013 passar.

**Checkpoint**: US1 e US2 funcionam isoladamente —
`npm test -- tests/cli/verify.test.ts` deve passar.

---

## Phase 5: User Story 3 - Restaurar um ambiente em CI (Priority: P1)

**Goal**: `maia ci` recusa lockfile desatualizado em relação ao manifesto (sem
regenerá-lo), reverte materializações parciais em caso de interrupção, e
distingue fonte inalcançável de capacidade ausente.

**Independent Test**: Editar o manifesto sem rodar lock e verificar que o `ci`
falha sem tocar no lockfile (Cenário 2 de quickstart.md); simular falha durante a
materialização e verificar que os artefatos criados por aquela execução são
removidos (Cenário 7).

### Tests for User Story 3 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da
> implementação**

- [X] T016 [P] [US3] Escrever teste unitário para `isLockStale` em
  `tests/shared/is-lock-stale.test.ts` (novo arquivo), cobrindo: (a) dois
  lockfiles idênticos → `false`; (b) lockfiles que diferem apenas em
  `artifactHash` e `integrity` → `false` (**caso crítico**: é exatamente o
  cenário de um checkout de CI limpo, e um falso positivo aqui quebraria todo
  pipeline — ver Decision 4 em research.md); (c) lockfiles que diferem em um
  campo derivado do manifesto (ex.: `version`, `allowedLlms`, `path`) → `true`;
  (d) lockfiles com conjuntos de `sources` diferentes → `true`. Este teste DEVE
  falhar antes da T019 ser implementada.
- [X] T017 [P] [US3] Em `tests/cli/ci.test.ts` (arquivo existente, novos casos):
  (a) manifesto editado sem rodar lock → `ci` falha, nenhum artefato
  materializado, e `maia.lock.json` permanece byte-a-byte inalterado; (b)
  lockfile atualizado → `ci` conclui com sucesso (regressão). Referencia Behavior
  1 de contracts/ci-command.md. Este teste DEVE falhar antes da T020 ser
  implementada.
- [X] T018 [P] [US3] Em `tests/cli/ci.test.ts` (mesmo arquivo, novo caso):
  simular falha durante a materialização (ex.: mockar `reinstallFromLock` ou uma
  de suas dependências para lançar após materializar parte) e verificar que os
  artefatos criados por aquela execução são removidos, enquanto artefatos
  preexistentes permanecem intocados. Referencia Behavior 3. Este teste DEVE
  falhar antes da T021 ser implementada.

### Implementation for User Story 3

- [X] T019 [US3] Implementar `lockComparableProjection(lock: SourceLock):
  LockComparableProjection` em
  `src/agent/catalog/lock/staleness/lock-comparable-projection.ts` (retorna
  `{ name, sources, packages }` onde cada package tem `artifactHash` e
  `integrity` **omitidos** — conforme data-model.md) e `isLockStale(lockOnDisk:
  SourceLock, lockFromManifest: SourceLock): boolean` em
  `src/agent/catalog/lock/staleness/is-lock-stale.ts`, comparando as duas
  projeções. Ambas funções puras, sem I/O. Faz T016 passar.
- [X] T020 [US3] Em `src/cli/commands/ci.ts`, adicionar antes de qualquer
  materialização: (a) `assertLockfileVersionCompatible` (de T005); (b) o gate de
  staleness — chamar `buildLockFromManifest(store.loadManifest(), ...)` **em
  memória, sem salvar** e comparar com o lock em disco via `isLockStale`; quando
  desatualizado, lançar com mensagem instruindo a rodar `maia lock` e versionar o
  resultado, mencionando que a divergência também pode vir de um ref de fonte que
  avançou (Decision 4). Depende de T005, T019. Faz T017 passar.
- [X] T021 [US3] Em `src/cli/commands/ci.ts`, envolver a chamada a
  `reinstallFromLock` com `withRollback`
  (`src/cli/shared/rollback/install-rollback.ts`, criado pela feature 003): o
  `undo` remove os caminhos materializados que aquela execução retornou. Depende
  de T020. Faz T018 passar.
- [X] T022 [US3] Em `src/cli/commands/ci.ts`, formatar e imprimir todos os
  problemas das duas chamadas de `verifyLock` antes de falhar (mesmo tratamento de
  T014 aplicado ao `ci`). Depende de T006.
- [X] T023 [P] [US3] Em `src/cli/shared/workspace/materialize-remote-skill.ts`,
  distinguir falha de alcance da fonte (erro de rede lançado pelo `fetch`) de
  resposta bem-sucedida sem a capacidade (markdown `null`), produzindo mensagens
  diferentes conforme FR-011 e Behavior 4 de contracts/ci-command.md. Sem retry
  automático.

**Checkpoint**: US1, US2 e US3 funcionam isoladamente —
`npm test -- tests/cli/ci.test.ts` deve passar.

---

## Phase 6: User Story 4 - Construir e inspecionar contexto (Priority: P3)

**Goal**: `maia context show` orienta o desenvolvedor quando o contexto nunca foi
construído, em vez de lançar um erro cru de arquivo ausente.

**Independent Test**: Apagar os artefatos de contexto e rodar `context show`,
verificando que a mensagem orienta a rodar o build e que nenhum contexto é gerado
(Cenário 6 de quickstart.md).

### Tests for User Story 4 ⚠️

> **NOTE: Escrever este teste PRIMEIRO, garantir que FALHA antes da
> implementação**

- [X] T024 [P] [US4] Criar `tests/cli/context.test.ts` (novo arquivo, hoje
  inexistente) com os casos: (a) `context build` gera os dois artefatos de
  contexto (regressão do baseline); (b) `context show` após o build exibe o
  conteúdo (regressão); (c) `context show` sem contexto construído falha com
  mensagem orientando a rodar o build, **sem** gerar nenhum artefato.
  Referencia Behavior 6 de contracts/lock-verify-context-commands.md. Este teste
  DEVE falhar antes da T025 ser implementada.

### Implementation for User Story 4

- [X] T025 [US4] Em `src/cli/commands/context.ts`, checar a existência do arquivo
  de contexto antes do `readFileSync` e lançar com orientação explícita para rodar
  `maia context build` primeiro, espelhando a mensagem que `verify.ts` já dá para
  lockfile ausente. NÃO construir o contexto automaticamente (Clarification 7).
  Faz T024 passar.

**Checkpoint**: todas as user stories em escopo funcionam isoladamente.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Validação final e conformidade com a Constituição.

- [X] T026 [P] Rodar `npm run typecheck` e confirmar zero erros após todas as
  mudanças das Fases 2–6, conforme Princípio I da Constituição.
- [X] T027 [P] Rodar `npm run check:architecture` e confirmar que todos os
  arquivos novos (T002, T005, T019) têm exatamente um símbolo arquitetural
  documentado por arquivo, conforme Princípio V da Constituição.
- [X] T028 Executar manualmente os Cenários 1, 2, 3, 4 e 6 de quickstart.md em um
  diretório de projeto temporário fora do repositório, confirmando que o
  comportamento observado corresponde aos contratos. (Cenários 5 e 7 dependem de
  estado/falha simulada e já são cobertos pelos testes automatizados — não
  repetir manualmente, conforme a nota em quickstart.md.)
- [X] T029 Rodar `npm test` completo e confirmar que a suíte inteira passa,
  incluindo os testes pré-existentes de `tests/cli/install.test.ts`,
  `tests/cli/remove.test.ts` e `tests/tools/catalog-store.test.ts` — todos
  exercitam `buildLock`/`verifyLock` indiretamente e são a principal rede de
  regressão para as mudanças das Fases 2 e 3. Conforme Princípio I.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências.
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA US2 e US3 (ambas
  consomem o `LockVerificationResult` e o gate de versão).
- **User Story 1 (Phase 3)**: Depende apenas do Setup — **NÃO** depende da
  Foundational (determinismo do lock é independente de verificação). Pode rodar
  em paralelo com a Phase 2.
- **User Story 2 (Phase 4)**: Depende da Foundational.
- **User Story 3 (Phase 5)**: Depende da Foundational. Sem dependência de US2 no
  nível de arquivos, exceto T022 que reaproveita o mesmo padrão de formatação de
  T014 — recomendado fazer T014 antes, mas não é dependência técnica rígida.
- **User Story 4 (Phase 6)**: Depende apenas do Setup — totalmente independente
  das demais (`context.ts` é disjunto de tudo mais).
- **Polish (Final Phase)**: Depende de US1, US2, US3 e US4.

### User Story Dependencies

- **US1 (P1)**: Independente — só depende do Setup.
- **US2 (P1)**: Depende da Foundational.
- **US3 (P1)**: Depende da Foundational.
- **US4 (P3)**: Independente — só depende do Setup.

### Within Each User Story

- Testes DEVEM ser escritos e FALHAR antes da implementação.
- Predicados puros (T005, T019) antes dos pontos de integração que os consomem.
- Integração nos comandos CLI por último.

### Parallel Opportunities

- T002, T003 e T005 (Foundational) podem rodar em paralelo entre si.
- T008 (US1), T012/T013 (US2), T016/T017/T018 (US3) e T024 (US4) são testes em
  arquivos diferentes — todos paralelizáveis.
- **US1 (Phase 3) e US4 (Phase 6) podem rodar em paralelo com a Foundational**,
  já que não dependem dela — útil para começar a entregar valor enquanto a
  Foundational avança.
- Uma vez concluída a Foundational, **US2 e US3 podem rodar em paralelo** —
  tocam arquivos majoritariamente disjuntos (`verify.ts` vs. `ci.ts`), exceto a
  formatação compartilhada notada acima.

---

## Parallel Example: Foundational + US1 + US4

```bash
# Três frentes simultâneas logo após o Setup:
Developer A: T002 → T004 → T006 → T007        (Foundational)
Developer B: T008 → T009 → T010 → T011        (User Story 1)
Developer C: T024 → T025                       (User Story 4)
```

## Parallel Example: US2 vs. US3 (após Foundational)

```bash
Developer A: T012 → T013 → T014 → T015                          (User Story 2)
Developer B: T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023  (User Story 3)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar a Phase 1: Setup.
2. Completar a Phase 3: User Story 1 (não precisa esperar a Foundational).
3. **PARAR e VALIDAR**: rodar `npm test -- tests/cli/lock.test.ts`.
4. Neste ponto SC-003 passa a ser verdadeiro pela primeira vez, e o lockfile
   deixa de gerar diff espúrio a cada execução — valor imediato e isolado.

### Incremental Delivery

1. Setup → baseline confirmada.
2. US1 (independente) → determinismo do lockfile, SC-003 verdadeiro.
3. Foundational → `verifySourceLock` acumula problemas, gate de versão disponível.
4. US2 → SC-002 verdadeiro (verify recusa pacote sem hash) e relato agregado.
5. US3 → CI recusa lock desatualizado, reverte materialização parcial, distingue
   falhas de fonte.
6. US4 (independente, pode ser feita a qualquer momento) → orientação no
   `context show`.
7. Polish → suíte completa e cenários de quickstart.

### Parallel Team Strategy

Com três desenvolvedores/agentes:

1. Todos confirmam o Setup juntos (trivial).
2. Desenvolvedor A: Foundational → US2. Desenvolvedor B: US1 → US3 (US3 espera a
   Foundational de A). Desenvolvedor C: US4, depois apoia a fase de Polish.
3. As stories integram de forma independente — os conjuntos de arquivos tocados
   se sobrepõem pouco.

---

## Notes

- Tarefas `[P]` = arquivos diferentes, sem dependências entre si.
- O rótulo `[Story]` mapeia a tarefa à user story específica; T001–T007 e
  T026–T029 não carregam rótulo por serem Setup/Foundational compartilhados e
  Polish.
- **T013 e T015 formam o par de maior risco desta feature**: mudam o veredito do
  verify sobre lockfiles que hoje passam. Rodar `npm test` completo (T029) é
  especialmente importante depois delas.
- Verificar que os testes falham antes de implementar.
- Fazer commit após cada tarefa ou grupo lógico, conforme Princípio IV.
- Parar em qualquer checkpoint para validar a story isoladamente.
- Evitar: tarefas vagas, conflitos no mesmo arquivo, dependências entre stories
  que quebrem a independência.
