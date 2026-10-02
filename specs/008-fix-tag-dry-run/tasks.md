---

description: "Lista de tarefas para a implementação da feature"
---

# Tasks: Tag de release só para publicação real

**Input**: Documentos de design em `/specs/008-fix-tag-dry-run/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/release.md,
quickstart.md

**Tests**: Obrigatórios (Constituição, Princípio I). Em cada tarefa, escreva o teste primeiro,
veja-o falhar, implemente e faça **um único commit com teste e implementação** (Princípio IV).
Nenhum teste executa git ou npm reais; as funções puras são importadas de
`scripts/tag-release.mjs`.

**Regras de código**: JSDoc em toda função; git sempre com argv e **nunca** `shell: true`;
nunca apagar, mover ou forçar tags. Ao final de cada tarefa: `npm run typecheck && npm test &&
npm run check:architecture && npm run check:naming` verdes.

**Branch**: commits na `007-fix-package-version`, que ainda não foi mesclada.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1…US3 do spec.md

---

## Phase 1: Setup

- [X] T001 Linha de base: na branch `007-fix-package-version`, rodar os gates acima e confirmar que estão verdes e que `tests/shared/tag.release.test.ts` passa. Sem commit.

---

## Phase 2: Foundational

Nenhuma. A mudança é local a `scripts/tag-release.mjs`, e a US1 cria a função que a US2
estende.

---

## Phase 3: User Story 1 - Prévia da publicação não cria tag (Priority: P1) 🎯 MVP

**Goal**: `npm publish --dry-run` (e `npm stage publish --dry-run`) não executa nenhum comando
git, termina com exit 0 e explica o motivo (FR-001, FR-003, FR-004).

**Independent Test**: quickstart.md §2, linhas de `--dry-run`: nenhuma tag local ou remota,
mensagem de prévia, árvore suja não atrapalha.

- [X] T002 [US1] Em `scripts/tag-release.mjs`, criar e exportar a função pura `decidePublishSkip(env)` (JSDoc), que retorna `'dry-run'` **somente** se `env.npm_config_dry_run === 'true'` (data-model: "prévia **somente** se `=== 'true'`") e `null` caso contrário. Em `main()`, **antes** de qualquer chamada a `git(...)` (FR-004) e logo após calcular `tag`, chamar `decidePublishSkip(process.env)`; se o retorno for `'dry-run'`, `console.log` exatamente `Skipping release tag ${tag}: npm --dry-run does not publish the package` e `return` (exit 0). Atualizar `scripts/tag-release.d.mts` com `export type PublishSkip = 'dry-run' | 'staged';` e `export declare function decidePublishSkip(env: { npm_config_dry_run?: string; npm_command?: string }): PublishSkip | null;` (o tipo já prevê `'staged'`, que a T003 usa). Teste no mesmo commit em `tests/shared/tag.release.test.ts`: `{ npm_config_dry_run: 'true' }` → `'dry-run'`; `{ npm_config_dry_run: 'true', npm_command: 'publish' }` → `'dry-run'`; `{ npm_config_dry_run: 'false' }`, `{ npm_config_dry_run: '' }` e `{}` → `null`.

**Checkpoint**: o defeito do code review está corrigido; a quickstart §2 (linhas de dry-run)
já passa.

---

## Phase 4: User Story 2 - Publicação em stage não cria tag antes da aprovação (Priority: P2)

**Goal**: `npm stage publish` sem dry-run não cria tag e orienta rodar o script depois de
`npm stage approve` (FR-002, FR-003).

**Independent Test**: quickstart.md §2, `npm_command=stage node scripts/tag-release.mjs`: a
mensagem de stage aparece, o exit é 0 e nenhuma tag é criada.

- [X] T003 [US2] Em `scripts/tag-release.mjs`, estender `decidePublishSkip` para retornar `'staged'` quando `env.npm_command === 'stage'` e **não** for dry-run (a prévia tem prioridade). Em `main()`, para `'staged'`, `console.log` exatamente `Skipping release tag ${tag}: the version is only staged. After "npm stage approve", run "node scripts/tag-release.mjs".` e `return`. Teste em `tests/shared/tag.release.test.ts`: `{ npm_command: 'stage' }` → `'staged'`; `{ npm_command: 'stage', npm_config_dry_run: 'true' }` → `'dry-run'`. Depende de T002.

**Checkpoint**: US1 e US2 completas.

---

## Phase 5: User Story 3 - Publicação real continua criando a tag (Priority: P1)

**Goal**: fora de prévia e stage, o comportamento é idêntico ao da feature 007 (FR-005,
SC-004).

**Independent Test**: quickstart.md §3, os quatro casos da 007 com
`node scripts/tag-release.mjs`.

- [X] T004 [US3] Em `tests/shared/tag.release.test.ts`, adicionar os casos de regressão de `decidePublishSkip` que devem retornar `null`: `{ npm_command: 'publish' }`, `{ npm_command: 'run' }` (o `npm run postpublish` da sonda do research) e `{ npm_command: 'publish', npm_config_dry_run: 'false' }`. Confirmar que os testes de `decideTagAction` e `releaseTagName` da 007 seguem intactos. Sem mudança em `scripts/`; se algum caso falhar, corrigir `decidePublishSkip` no mesmo commit. Depende de T003.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T005 [P] Documentação: em `AGENT.md`, seção `## Release`, adicionar um passo explicando que `npm publish --dry-run` e `npm stage publish` não criam tag (o script imprime "Skipping release tag …") e que, depois de `npm stage approve`, a tag é criada com `node scripts/tag-release.mjs`. Em `CHANGELOG.md`, na entrada `## [1.6.2]` (ainda não publicada), item `### Added` da tag: acrescentar "skipped on `npm publish --dry-run` and `npm stage publish`". Só documentação. Depende de T003.
- [X] T006 Validação ponta a ponta: executar `specs/008-fix-tag-dry-run/quickstart.md` §1–§3 num diretório de `mktemp` (pacote de sonda com nome inexistente; **só** `--dry-run`, nada é enviado ao registro), e registrar os resultados na seção Notes de `specs/008-fix-tag-dry-run/checklists/requirements.md`. Commitar os artefatos de `specs/008-fix-tag-dry-run/` junto com as marcações `[X]` deste arquivo. Depende de T004, T005.

---

## Dependencies & Execution Order

```text
T001 → T002 (US1) → T003 (US2) → T004 (US3) → T006
                         └──────→ T005 [P] ──┘
```

- T002 e T003 alteram a mesma função e o mesmo teste, então rodam em sequência.
- T005 (docs) pode rodar em paralelo com T004.

## Parallel Example

```text
# Depois da T003
T004 testes de regressão (tests/shared/tag.release.test.ts)  ∥  T005 AGENT.md + CHANGELOG.md
```

## Implementation Strategy

- **MVP**: T001–T002. Só isso já corrige o achado do code review (dry-run).
- **Incremental**: T003 (stage), T004 (regressão), T005 (docs), T006 (validação e commit
  da spec).
- Total: 4 commits de código e docs (T002–T005) e 1 de spec (T006); a T001 não gera commit.
