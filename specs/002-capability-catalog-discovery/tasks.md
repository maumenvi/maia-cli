---

description: "Lista de tarefas para a implementação da feature"
---

# Tasks: Catálogo de Capacidades & Descoberta

**Input**: Documentos de design em `/specs/002-capability-catalog-discovery/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/search-catalog.md, contracts/source-command.md,
contracts/list-discovery-commands.md, quickstart.md

**Tests**: Testes são obrigatórios nesta feature — a Constituição do projeto
declara Test-First como Princípio I, NON-NEGOTIABLE. Cada tarefa de correção
abaixo tem uma tarefa de teste correspondente que deve ser escrita e falhar
antes da implementação.

**Organization**: As tarefas são agrupadas pela User Story do spec.md que
exercitam. Os cinco itens do Summary de plan.md mapeiam assim:

- A mudança de assinatura de `searchCatalog` (FR-006, `CatalogSearchOutcome`) é
  **Foundational**: tanto US2 (busca por consulta) quanto US4 (degradação
  graciosa) dependem dela, e ela também tem 4 chamadores fora do escopo direto
  de qualquer user story (`install-command.ts`,
  `discover-mcps-from-store.ts`, `discover-skills-from-store.ts`) que só
  precisam continuar compilando — tratá-la como pré-requisito bloqueante evita
  que US2 e US4 dupliquem a mesma mudança de tipo.
- **US2** (Buscar no catálogo por consulta, P1) ganha a exibição de falhas de
  fonte no modo texto/JSON (consumindo o `CatalogSearchOutcome` da fase
  Foundational) e a deduplicação local-sobre-remoto (FR-008).
- **US3** (Gerenciar fontes Git, P2) ganha a validação de sintaxe de URL
  (FR-005) e sua cobertura de teste, hoje inexistente.
- **US4** (Tratamento gracioso de fontes indisponíveis, P2) reaproveita a
  mudança Foundational e adiciona os testes específicos de "uma fonte cai,
  outra responde" e "todas caem", que são o critério de teste independente
  desta story.
- **US1** (Listar capacidades instaladas, P1) não tem gap identificado pela
  investigação nem pela clarificação — é baseline já implementado e testado;
  nenhuma tarefa nova para ela nesta iteração.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: A qual user story esta tarefa pertence
- Caminhos de arquivo exatos são incluídos nas descrições

## Path Conventions

Projeto único (CLI): `src/`, `tests/` na raiz do repositório — conforme
confirmado em plan.md → Project Structure.

## Phase 1: Setup

**Purpose**: Nenhuma inicialização de projeto nova é necessária — a estrutura
já existe. Esta fase só confirma a baseline de testes antes de qualquer
mudança.

- [X] T001 Rodar `npm test` e `npm run typecheck` para confirmar que a suíte
  está verde antes de qualquer mudança desta feature (baseline de referência
  para comparar depois).

**Checkpoint**: Baseline confirmada — as fases seguintes podem começar.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Mudar a assinatura de retorno de `searchCatalog` para
`CatalogSearchOutcome { results, failures }` (Decision 1 em research.md,
contracts/search-catalog.md) e atualizar todos os 6 chamadores existentes para
não quebrar a build. Esta é a mudança que tanto US2 quanto US4 dependem.

**⚠️ CRITICAL**: Nenhuma tarefa de US2 ou US4 pode começar até esta fase estar
completa. `npm run typecheck` DEVE ficar verde ao final desta fase.

- [X] T002 [P] Escrever teste unitário para `searchCatalog` retornando
  `CatalogSearchOutcome` em `tests/tools/search-catalog.test.ts` (novo
  arquivo), cobrindo com `globalThis.fetch` mockado: (a) todos os provedores
  respondem → `results` populado, `failures` vazio; (b) um provedor rejeita,
  outro responde → `results` tem os itens do provedor que respondeu,
  `failures` tem exatamente uma entrada `{ providerId, kind, message }`; (c)
  todos os provedores rejeitam → `results` vazio, `failures` com uma entrada
  por provedor; (d) nenhum provedor configurado para o kind → `results` e
  `failures` ambos vazios. Este teste DEVE falhar antes da T004 ser
  implementada.
- [X] T003 [P] Criar os tipos `CatalogSearchFailure` (`{ providerId: string;
  kind: CatalogKind; message: string }`) em
  `src/agent/catalog/providers/contracts/catalog-search-failure.ts` e
  `CatalogSearchOutcome` (`{ results: CatalogSearchResult[]; failures:
  CatalogSearchFailure[] }`) em
  `src/agent/catalog/providers/core/catalog-search-outcome.ts`, conforme
  data-model.md.
- [X] T004 Modificar `searchCatalog` em
  `src/agent/catalog/providers/core/search-catalog.ts` para retornar
  `Promise<CatalogSearchOutcome>`: mapear `result.status === 'rejected'` do
  `Promise.allSettled` existente para uma entrada em `failures` (usando
  `provider.id`, o `kind` pedido, e `result.reason` convertido em mensagem),
  em vez de descartar via `flatMap(... : [])`. Depende de T003. Faz T002
  passar.
- [X] T005 Atualizar os 6 chamadores de `searchCatalog` para desestruturar
  `{ results, failures }` em vez de tratar o retorno como array direto,
  preservando o comportamento atual de cada um (nenhum precisa exibir
  `failures` ainda, exceto onde as tarefas de US2/US4 abaixo cuidam disso):
  `src/cli/commands/install/install-command.ts` (duas chamadas),
  `src/cli/commands/mcp/discover-mcps-from-store.ts`,
  `src/cli/commands/skills/discover-skills-from-store.ts`. Depende de T004.
  (Os três comandos `list-*` são atualizados nas tarefas de US2 abaixo, não
  aqui, porque essas tarefas já precisam tocar o mesmo código para exibir
  `failures`.)
- [X] T006 Rodar `npm run typecheck` e confirmar zero erros após T002–T005 —
  todos os chamadores de `searchCatalog` devem compilar com a nova
  assinatura. Depende de T005.

**Checkpoint**: `searchCatalog` retorna `CatalogSearchOutcome`, todos os
chamadores compilam. US2 e US4 podem começar.

---

## Phase 3: User Story 2 - Buscar no catálogo por consulta (Priority: P1) 🎯 MVP

**Goal**: A busca por palavra-chave em `list-skills`/`list-tools`/
`list-capabilities` reporta explicitamente quais fontes falharam (mesmo com
outras fontes respondendo) e omite resultados remotos que duplicam uma
capacidade já instalada localmente.

**Independent Test**: Rodar `list-skills <query> --json` com `globalThis.fetch`
mockado para uma fonte falhar e outra responder, e verificar
`sourceFailures` populado junto de `discovered` não-vazio (Cenário 1 de
quickstart.md); rodar com um resultado remoto cujo nome já está instalado e
verificar que ele não aparece em `discovered` (Cenário 3 de quickstart.md).

### Tests for User Story 2 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da
> implementação**

- [X] T007 [P] [US2] Escrever teste para exibição de falha de fonte em
  `tests/cli/list-skills.test.ts` (arquivo existente, novos casos): com
  `globalThis.fetch` mockado para um provedor rejeitar e outro responder 200,
  verificar que (a) no modo texto, a saída contém uma seção listando a fonte
  que falhou, mesmo com resultados do provedor que respondeu presentes; (b)
  no modo `--json`, o payload contém `sourceFailures` não-vazio com
  `results`/`discovered` também não-vazio. Referencia
  contracts/list-discovery-commands.md Behavior 1. Este teste DEVE falhar
  antes da T009 ser implementada.
- [X] T008 [P] [US2] Escrever teste para deduplicação local-sobre-remoto em
  `tests/cli/list-skills.test.ts` (mesmo arquivo, novo caso): instalar uma
  skill localmente, mockar `globalThis.fetch` para um provedor retornar um
  resultado com o mesmo `name`, e verificar que esse resultado NÃO aparece na
  seção/campo de descoberta remota, tanto no modo texto quanto no `--json`.
  Referencia contracts/list-discovery-commands.md Behavior 2. Este teste DEVE
  falhar antes da T012 ser implementada.

### Implementation for User Story 2

- [X] T009 [US2] Atualizar `list-skills-command.ts`
  (`src/cli/commands/list-skills/list-skills-command.ts`) para desestruturar
  `{ results, failures }` das duas chamadas a `searchCatalog` (linha do modo
  `--json` e linha do modo texto) e passar `failures` para uma nova função de
  exibição. Depende de T004 (Foundational).
- [X] T010 [US2] Criar `sourceFailureLines(failures:
  CatalogSearchFailure[]): string[]` em
  `src/cli/commands/list-skills/source-failure-lines.ts`, formatando cada
  falha como uma linha legível (ex.: `<providerId>: <message>`). Reutilizada
  pelas tarefas T011/T014 abaixo (mesma assinatura, arquivo espelhado por
  comando, seguindo o padrão de duplicação já existente entre
  `list-skills`/`list-tools`/`list-capabilities` seguido pelo restante do
  projeto — ver plan.md Assumptions sobre não refatorar essa duplicação nesta
  iteração).
- [X] T011 [US2] No modo texto de `list-skills-command.ts`, adicionar uma
  seção `Fontes indisponíveis:` via `printSection`/`printLines` sempre que
  `failures.length > 0`, exibida após a seção "Catalog discovery for...". No
  modo `--json`, adicionar o campo `sourceFailures:
  sourceFailureLines(failures)` ao payload, sempre presente (mesmo `[]`
  quando não há falha), conforme contracts/list-discovery-commands.md
  Behavior 1. Depende de T009, T010. Faz T007 passar.
- [X] T012 [US2] Criar `excludeLocallyInstalled(results:
  CatalogSearchResult[], installed: LockPackage[]):
  CatalogSearchResult[]` em
  `src/agent/catalog/providers/core/exclude-locally-installed.ts` como
  função pura, filtrando resultados cujo par `(kind, name)` já existe em
  `installed`, conforme Decision 3 em research.md.
- [X] T013 [US2] Integrar `excludeLocallyInstalled` em
  `list-skills-command.ts`: chamar `store.getInstalledPackages('skill')` e
  filtrar `results` antes de gerar `discoveredLines`, tanto no modo texto
  quanto no `--json`. Depende de T012. Faz T008 passar.
- [X] T014 [US2] [P] Replicar T009, T011, T013 (exibição de falha de fonte +
  deduplicação) em `list-tools-command.ts`
  (`src/cli/commands/list-tools/list-tools-command.ts`), incluindo um
  `source-failure-lines.ts` próprio em `src/cli/commands/list-tools/`
  espelhando T010. Depende de T004 (Foundational), T012.
- [X] T015 [US2] [P] Replicar T009, T011, T013 (exibição de falha de fonte +
  deduplicação) em `list-capabilities-command.ts`
  (`src/cli/commands/list-capabilities/list-capabilities-command.ts`),
  incluindo um `source-failure-lines.ts` próprio em
  `src/cli/commands/list-capabilities/` espelhando T010. Depende de T004
  (Foundational), T012.

**Checkpoint**: Neste ponto, a User Story 2 deve estar totalmente funcional e
testável de forma independente — `npm test -- tests/cli/list-skills.test.ts`
deve passar.

---

## Phase 4: User Story 3 - Gerenciar fontes Git (Priority: P2)

**Goal**: `maia source add` rejeita imediatamente uma URL que não parece um
repositório Git válido, sem alterar o manifesto; `source add`/`source ls`
ganham cobertura de teste, hoje inexistente.

**Independent Test**: Rodar `source add <alias> "not-a-url"` e verificar exit
code diferente de zero, mensagem clara, e `maia.json` inalterado (Cenário 4 de
quickstart.md); rodar `source add <alias> https://github.com/org/repo` e
verificar sucesso (Cenário 5).

### Tests for User Story 3 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da
> implementação**

- [X] T016 [P] [US3] Escrever teste unitário para o predicado
  `isValidGitSourceUrl` em `tests/shared/is-valid-git-source-url.test.ts`,
  cobrindo: (a) URL vazia/só espaços → `false`; (b) URL começando com
  `https://`, `git@`, `ssh://`, ou `git://` → `true`; (c) URL terminando em
  `.git` → `true`; (d) string arbitrária sem protocolo nem sufixo `.git` (ex.:
  `"not-a-url"`) → `false`. Este teste DEVE falhar antes da T018 ser
  implementada.
- [X] T017 [P] [US3] Escrever `tests/cli/source.test.ts` (novo arquivo)
  cobrindo: (a) `source add` com URL válida grava a fonte em
  `manifest.sources` e imprime confirmação; (b) `source add` com URL inválida
  falha com exit code diferente de zero, mensagem clara, e `maia.json`
  byte-a-byte inalterado (ou inexistente, se o projeto não tinha manifesto
  antes); (c) `source ls` exibe a fonte adicionada com `url`, `ref`, e
  `trusted` corretos. Referencia contracts/source-command.md Behaviors 1 e 2.
  Este teste DEVE falhar antes da T018/T019 serem implementadas.

### Implementation for User Story 3

- [X] T018 [US3] Implementar `isValidGitSourceUrl(url: string): boolean` em
  `src/agent/catalog/source/is-valid-git-source-url.ts` como função pura:
  rejeita string vazia/só espaços; aceita URLs começando com `https://`,
  `git@`, `ssh://`, `git://`, ou terminando em `.git`, conforme Decision 4 em
  research.md. Faz T016 passar.
- [X] T019 [US3] Integrar `isValidGitSourceUrl` em `sourceCommand`
  (`src/cli/commands/source.ts`), chamada antes de `store.addSource`:
  quando a URL é inválida, lançar erro explícito sem chamar `addSource` nem
  `buildLock`, conforme contracts/source-command.md Behavior 1. Depende de
  T018. Faz T017 passar.

**Checkpoint**: Neste ponto, a User Story 3 deve estar totalmente funcional e
testável de forma independente — `npm test -- tests/cli/source.test.ts` deve
passar.

---

## Phase 5: User Story 4 - Tratamento gracioso de fontes remotas indisponíveis (Priority: P2)

**Goal**: Confirmar, com testes dedicados ao cenário de degradação, que uma
fonte fora do ar nunca impede resultados de outra fonte configurada, e que
"todas as fontes fora do ar" é distinto de "nenhum resultado".

**Independent Test**: Rodar `list-skills <query>` com uma fonte mockada para
rejeitar e outra para responder, e verificar que os resultados da fonte viva
aparecem (Cenário 1 de quickstart.md); rodar com todas as fontes mockadas para
rejeitar e verificar "nenhum resultado" reportado distintamente de erro
(Cenário 2 de quickstart.md).

### Tests for User Story 4 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da
> implementação**

- [X] T020 [P] [US4] Escrever teste em `tests/cli/list-skills.test.ts`
  (mesmo arquivo de T007/T008, novo caso): com `globalThis.fetch` mockado
  para TODOS os provedores configurados rejeitarem, verificar que (a) a saída
  em modo texto declara explicitamente "nenhum resultado encontrado" (não
  apenas uma lista vazia sem explicação) E lista todas as fontes que
  falharam; (b) no modo `--json`, `results`/`discovered` é `[]` E
  `sourceFailures` tem uma entrada por provedor configurado. Referencia
  contracts/list-discovery-commands.md Behavior 1 (caso "todos falham") e
  quickstart.md Cenário 2. Este teste já deve passar após a Fase 3 (T011) —
  esta tarefa é sobre adicionar a cobertura de teste específica deste caso,
  não nova implementação.

### Implementation for User Story 4

Nenhuma implementação nova é necessária: o comportamento exigido por US4 é
inteiramente produzido pela mudança Foundational (T002–T006) e pela exibição
de falhas implementada em US2 (T009–T011, T014, T015). Esta fase existe para
garantir que o critério de teste independente de US4 — "uma fonte fora do ar
nunca impede resultados de outra" e "todas fora do ar é distinto de zero
resultados" — tem cobertura de teste própria e explícita, não apenas
incidental aos testes de US2.

- [X] T021 [US4] Confirmar (rodando `npm test -- tests/cli/list-skills.test.ts`)
  que o teste de "uma fonte cai, outra responde" já escrito em T007 e o teste
  de "todas caem" em T020 cobrem juntos os dois Acceptance Scenarios da User
  Story 4 em spec.md; se algum aspecto ficar descoberto (ex.: verificação
  explícita de que nenhum crash/travamento ocorre), adicionar o caso faltante
  ao mesmo arquivo. Depende de T011, T020.

**Checkpoint**: Neste ponto, todas as user stories em escopo (US2, US3, US4)
devem funcionar de forma independente e testável.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Validação final cruzando todas as correções e conformidade com a
Constituição do projeto.

- [X] T022 [P] Rodar `npm run typecheck` e confirmar zero erros após todas as
  mudanças das Fases 2–5, conforme Princípio I da Constituição.
- [X] T023 [P] Rodar `npm run check:architecture` e confirmar que todos os
  arquivos novos (T003, T010 e seus espelhos em list-tools/list-capabilities,
  T012, T018) têm exatamente um símbolo arquitetural documentado por arquivo,
  conforme Princípio V da Constituição.
- [X] T024 Executar manualmente os Cenários 4 e 5 de quickstart.md (validação
  de URL de fonte) em um diretório de projeto temporário fora do repositório,
  confirmando que o comportamento observado corresponde exatamente ao
  descrito em contracts/source-command.md. (Cenários 1–3 dependem de mock de
  rede e já são cobertos pelos testes automatizados das Fases 3–5 — não
  repetir manualmente, conforme a nota em quickstart.md.)
- [X] T025 Rodar `npm test` completo e confirmar que a suíte inteira passa,
  incluindo os testes pré-existentes de `tests/cli/list-skills.test.ts` e
  `tests/cli/list-tools.test.ts` (regressão de US1 e do restante de US2/US4
  já implementado), conforme Princípio I da Constituição.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente.
- **Foundational (Phase 2)**: Depende da conclusão do Setup — BLOQUEIA User
  Story 2 e User Story 4 (ambas consomem `CatalogSearchOutcome`).
- **User Story 2 (Phase 3)**: Depende da conclusão da Foundational. Sem
  dependência de US3.
- **User Story 3 (Phase 4)**: Depende apenas da conclusão do Setup — NÃO
  depende da Foundational (validação de URL é isolada de `searchCatalog`).
  Pode rodar em paralelo com a Phase 2+3 se houver capacidade de equipe.
- **User Story 4 (Phase 5)**: Depende da conclusão de US2 (reaproveita a
  exibição de falhas implementada em T011).
- **Polish (Final Phase)**: Depende da conclusão de US2, US3, e US4.

### User Story Dependencies

- **User Story 2 (P1)**: Depende da Foundational. Sem dependência de US3.
- **User Story 3 (P2)**: Independente — só depende do Setup. Pode ser
  implementada antes, durante, ou depois de US2/Foundational sem conflito de
  arquivos (`source.ts` e `agent/catalog/source/` não são tocados por
  nenhuma outra tarefa).
- **User Story 4 (P2)**: Depende de US2 (T011) — não é uma implementação
  nova, é a garantia de cobertura de teste do comportamment que US2 já
  implementa.

### Within Each User Story

- Testes DEVEM ser escritos e FALHAR antes da implementação.
- Tipos/predicados puros (T003, T012, T018) antes dos pontos de integração
  que os consomem.
- Integração nos comandos `list-*`/`source.ts` por último, depois que os
  helpers que eles consomem existem e estão testados.

### Parallel Opportunities

- T002 e T003 (teste + tipos da Foundational) podem rodar em paralelo —
  arquivos diferentes.
- T007 e T008 (testes de US2) podem rodar em paralelo — mesmo arquivo mas
  casos de teste independentes.
- T014 e T015 (replicação em list-tools/list-capabilities) podem rodar em
  paralelo entre si, após T012 (dedup) estar pronta — arquivos totalmente
  distintos de T009–T011 (list-skills).
- T016 e T017 (testes de US3) podem rodar em paralelo — arquivos diferentes.
- **A User Story 3 inteira (Phase 4) pode rodar em paralelo com a
  Foundational + User Story 2 (Phase 2+3)** se houver dois
  desenvolvedores/agentes disponíveis, pois não compartilha nenhum arquivo
  com `searchCatalog`/`list-*`.

---

## Parallel Example: Foundational (Phase 2)

```bash
# Lançar teste e tipos juntos:
Task: "Escrever teste para searchCatalog em tests/tools/search-catalog.test.ts"
Task: "Criar CatalogSearchFailure e CatalogSearchOutcome em providers/contracts e providers/core"
```

## Parallel Example: User Story 2 vs. User Story 3

```bash
# Com dois desenvolvedores/agentes:
Developer A: T002 → T003 → T004 → T005 → T006 → T007 → ... → T015  (Foundational + US2)
Developer B: T016 → T017 → T018 → T019                              (US3, em paralelo total)
```

---

## Implementation Strategy

### MVP First (Foundational + User Story 2 Only)

1. Completar a Phase 1: Setup.
2. Completar a Phase 2: Foundational (CRÍTICO — bloqueia US2 e US4).
3. Completar a Phase 3: User Story 2.
4. **PARAR e VALIDAR**: rodar `npm test -- tests/cli/list-skills.test.ts` e
   confirmar que passa isoladamente.
5. Neste ponto, o gap mais crítico do spec (FR-006, bloqueando SC-002/SC-003)
   já está fechado para `list-skills`, mesmo sem US3/US4/replicação em
   list-tools/list-capabilities.

### Incremental Delivery

1. Completar Setup + Foundational → `searchCatalog` retorna
   `CatalogSearchOutcome`, todos os chamadores compilam.
2. Adicionar User Story 2 → testar independentemente → fecha FR-006 e FR-008
   para `list-skills` (T009–T013) e depois replica para `list-tools`/
   `list-capabilities` (T014–T015).
3. Adicionar User Story 3 (pode ser feito em paralelo, a qualquer momento) →
   testar independentemente → fecha FR-005.
4. Adicionar User Story 4 → confirma cobertura de teste da degradação
   graciosa já implementada por US2.
5. Rodar a fase de Polish → validar toda a suíte e os cenários de
   quickstart.md juntos.

### Parallel Team Strategy

Com dois desenvolvedores/agentes disponíveis:

1. Equipe completa Setup junto (trivial, sem bloqueio real).
2. Desenvolvedor A: Foundational → User Story 2 → User Story 4.
   Desenvolvedor B: User Story 3 (totalmente independente, pode começar
   imediatamente após o Setup).
3. Stories completam e se integram de forma independente — arquivos tocados
   não se sobrepõem entre A e B.

---

## Notes

- Tarefas `[P]` = arquivos diferentes, sem dependências entre si.
- O rótulo `[Story]` mapeia a tarefa à user story específica para
  rastreabilidade; T001–T006 e T022–T025 não carregam rótulo de story por
  serem, respectivamente, Setup/Foundational compartilhados e
  Polish/validação cruzada.
- Cada user story deve ser completável e testável de forma independente,
  exceto US4, que por natureza confirma um comportamento que US2 já
  implementa (ver nota na Phase 5) — isso é intencional e reflete a relação
  real entre as duas stories no spec, não uma quebra de independência
  arbitrária.
- Verificar que os testes falham antes de implementar.
- Fazer commit após cada tarefa ou grupo lógico, conforme Princípio IV da
  Constituição.
- Parar em qualquer checkpoint para validar a story isoladamente.
- Evitar: tarefas vagas, conflitos no mesmo arquivo, dependências entre
  stories que quebrem a independência além do que já é intrínseco ao spec
  (US4 sobre US2).
