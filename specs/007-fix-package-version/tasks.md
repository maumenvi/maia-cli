---

description: "Lista de tarefas para a implementação da feature"
---

# Tasks: Versão do Maia com fonte única

**Input**: Documentos de design em `/specs/007-fix-package-version/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.output.md,
contracts/release.md, quickstart.md

**Tests**: Obrigatórios — Constituição, Princípio I (NON-NEGOTIABLE). **Cada tarefa
contém o seu próprio teste**: escreva o teste primeiro, veja-o falhar localmente,
implemente, e só então faça **um único commit com teste + implementação**. Nunca commite
teste vermelho (Princípio IV: uma tarefa = um commit). Testes em `os.tmpdir()` no estilo de
`tests/cli/ci.test.ts`; nenhum teste depende de rede nem de git remoto.

**Regras de código para toda tarefa** (Constituição V, VIII, IX): um símbolo exportado por
arquivo, com JSDoc descrevendo o propósito; nomes `palavra.palavra.ts`; I/O só nas bordas
(`read.maia.package.version.ts`, comandos do CLI, scripts); processos sempre com argv e
**nunca** `shell: true`. Ao final de cada tarefa: `npm run typecheck && npm test && npm run
check:architecture && npm run check:naming` verdes.

**Organization**: agrupadas pelas User Stories do spec.md. A fonte única da versão (Foundational)
é consumida por US1, US2 e US3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1…US4 do spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: confirmar a linha de base antes de mexer.

- [X] T001 Linha de base: rodar `npm run typecheck && npm test && npm run check:architecture && npm run check:naming` na `master` e registrar que está verde; rodar `rtk grep -n "MAIA_PACKAGE_METADATA\|'1.0.0'\|1\.5\.2" src tests` e confirmar que os usos batem com a tabela de research.md ("Levantamento do estado atual", pontos 1–7, mais `tests/tools/catalog.store.test.ts:19`). Sem commit; se algo divergir, atualizar a tabela em `specs/007-fix-package-version/research.md` antes de seguir.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: fonte única da versão (research D1, D2; data-model "Versão do Maia").

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

- [X] T002 [P] Criar `src/shared/package/resolve.maia.package.json.path.ts` exportando `resolveMaiaPackageJsonPath(here: string, exists: (candidate: string) => boolean): string`, função **pura**: candidatos, nesta ordem, `path.resolve(here, '../../../package.json')` (layout `src/shared/package/`) e `path.resolve(here, '../../../../package.json')` (layout `dist/src/shared/package/`); retorna o primeiro para o qual `exists` é `true`; nenhum → `throw new Error('package.json not found')`. JSDoc. Teste no mesmo commit em `tests/shared/resolve.maia.package.json.path.test.ts`: `here='/r/src/shared/package'` com `exists` só para `/r/package.json` → `/r/package.json`; `here='/p/dist/src/shared/package'` com `exists` só para `/p/package.json` → `/p/package.json`; ambos existem → o primeiro; nenhum → erro `package.json not found`.
- [X] T003 [P] Criar `src/shared/package/parse.maia.package.version.ts` exportando `parseMaiaPackageVersion(content: string): string`, **pura**: `JSON.parse(content)`; se `version` não for `string` não vazia → `throw new Error('package version not found')`; retorna o valor **literal, sem normalizar** (pré-release `1.7.0-beta.1` sai igual). Teste em `tests/shared/parse.maia.package.version.test.ts`: `{"version":"1.6.1"}` → `1.6.1`; `{"version":"1.7.0-beta.1"}` → igual; `{}`, `{"version":""}`, `{"version":1}` → erro `package version not found`.
- [X] T004 Criar `src/shared/package/read.maia.package.version.ts` exportando `readMaiaPackageVersion(): string`, a borda de I/O: `here = path.dirname(fileURLToPath(import.meta.url))`, `resolveMaiaPackageJsonPath(here, existsSync)`, `readFileSync(..., 'utf8')`, `parseMaiaPackageVersion`; guarda o resultado numa variável de módulo (cache, lido uma vez por processo). JSDoc explicando que é a **única** fonte da versão do Maia. Modificar `src/cli/commands/version/version.command.ts` para `console.log(readMaiaPackageVersion())` e **apagar** `src/cli/commands/version/resolve.package.json.path.ts` (movido, Princípio VII). Teste: em `tests/cli/version.test.ts` trocar o `assert.match` por igualdade exata com `JSON.parse(readFileSync(<raiz>/package.json)).version` lido direto pelo teste; adicionar `tests/shared/read.maia.package.version.test.ts` checando que `readMaiaPackageVersion()` é igual à versão do `package.json` da raiz e que duas chamadas retornam o mesmo valor. Depende de T002, T003.

**Checkpoint**: `maia --version` usa a fonte única; nenhum outro ponto mudou ainda.

---

## Phase 3: User Story 1 - Lockfile e manifesto registram a versão real (Priority: P1) 🎯 MVP

**Goal**: projetos novos gravam `sources.local.ref` = versão real; projetos antigos com
`1.5.2` são corrigidos no `maia i` e avisados no `maia ci` (Clarification C, FR-002, FR-003,
FR-010/010a/010b).

**Independent Test**: quickstart.md §2 e §3: `maia init` + `maia i` num diretório temporário
grava `ref` = `maia --version` no manifesto e no lock; `maia ci` passa; um projeto com
`ref: 1.5.2` recebe aviso no `ci` (sem diff) e é corrigido pelo `maia i`.

- [X] T005 [US1] Modificar `src/agent/catalog/manifest/defaults.ts`: `sources.local.ref` passa de `MAIA_PACKAGE_METADATA.version` para `readMaiaPackageVersion()` (de `src/shared/package/read.maia.package.version.ts`); `url` continua `MAIA_PACKAGE_METADATA.source`. Teste: em `tests/tools/catalog.store.test.ts:19` trocar `'1.5.2'` pela versão lida do `package.json` da raiz; no mesmo arquivo, adicionar um caso que adiciona uma dependência de fonte `local`, chama `store.buildLock()` e confere que `provenance.ref` do pacote no lock é igual à mesma versão. Depende de T004.
- [X] T006 [P] [US1] Criar `src/agent/catalog/manifest/migrate/stale.local.source.ref.ts` com `export const STALE_LOCAL_SOURCE_REF = '1.5.2';` e JSDoc ("versão escrita à mão que nunca foi publicada no npm; ver feature 007"). Sem lógica; o `typecheck` é o teste (é exercitado por T007/T008). *Executada no mesmo commit da T007.*
- [X] T007 [US1] Criar `src/agent/catalog/manifest/migrate/has.stale.local.source.ref.ts` exportando `hasStaleLocalSourceRef(manifest: SourcesManifest): boolean`, **pura**: `true` só se `sources.local` existe ∧ `type === 'registry'` ∧ `url === MAIA_PACKAGE_METADATA.source` ∧ `ref === STALE_LOCAL_SOURCE_REF` (data-model "Detecção de `ref` desatualizado"). Teste em `tests/shared/has.stale.local.source.ref.test.ts`: caso positivo; `ref: '1.5.7'` → false; `url` diferente → false; `type: 'git'` → false; sem `local` → false; outra fonte (`skillsHub`) com `ref: '1.5.2'` → false (FR-010b). Depende de T006.
- [X] T008 [US1] Criar `src/agent/catalog/manifest/migrate/migrate.stale.local.source.ref.ts` exportando `migrateStaleLocalSourceRef(manifest: SourcesManifest, version: string): SourcesManifest`, **pura**: retorna **novo** objeto com só `sources.local.ref = version`; se `hasStaleLocalSourceRef(manifest)` for `false`, retorna o próprio `manifest` sem cópia. Teste em `tests/shared/migrate.stale.local.source.ref.test.ts`: manifesto com `1.5.2` → `ref` novo, demais campos de `local` e outras fontes iguais, entrada original **não mutada**; manifesto com `1.5.7` → mesma referência devolvida. Depende de T007.
- [X] T009 [US1] Modificar `src/cli/commands/install/install.command.ts`: no ramo **sem argumentos** (`positional.length === 0`), antes de `store.buildLock()`, carregar o manifesto; se `hasStaleLocalSourceRef(manifest)`, obter `version = readMaiaPackageVersion()`, `store.saveManifest(migrateStaleLocalSourceRef(manifest, version))` e `console.log` exatamente `Updated maia.json source "local" ref from 1.5.2 (never published) to <version>; maia.lock.json regenerated.` (contracts/cli.output.md). O ramo `maia i <nome>` **não muda** (research D4). Teste em `tests/cli/install.test.ts`: projeto temporário com `sources.local.ref` regravado para `'1.5.2'` e `store.buildLock()`; rodar `installCommand([], { store })` com `console.log` capturado → mensagem presente; `maia.json` e `maia.lock.json` (todo `provenance.ref` da fonte `local`) com a versão do `package.json`; em seguida `ciCommand([], { store })` passa. Caso controle: `ref: '1.5.7'` → nenhum arquivo muda e sem mensagem. Caso `maia i <nome>` com `1.5.2` → `ref` continua `1.5.2`. Depende de T005, T008.
- [X] T010 [US1] Modificar `src/cli/commands/ci.ts`: logo após `assertLockfileVersionCompatible`, se `hasStaleLocalSourceRef(store.loadManifest())`, `console.warn` exatamente `warning: maia.json source "local" pins ref 1.5.2, a Maia version that was never published. Run "maia i" and commit maia.json and maia.lock.json to fix it.`; **não grava nada** e não altera o fluxo nem o exit code (FR-010a). Teste em `tests/cli/ci.test.ts`: projeto com `ref: '1.5.2'` e lock consistente (gerado com `store.buildLock()`); capturar `console.warn`; `ciCommand` resolve sem erro, o aviso aparece uma vez, e o conteúdo de `maia.json` e `maia.lock.json` é byte a byte igual ao de antes. Caso controle `1.5.7` → sem aviso. Depende de T007.

**Checkpoint**: US1 completa e testável sozinha (quickstart §2–§3). MVP entregável.

---

## Phase 4: User Story 2 - Identidade MCP consistente (Priority: P2)

**Goal**: servidor e cliente MCP do Maia informam a versão real (FR-004, FR-005; research D3).

**Independent Test**: quickstart.md §4, `initialize` no `maia mcp-server` retorna
`serverInfo.version` = `maia --version`; o cliente envia `clientInfo.version` igual.

- [X] T011 [P] [US2] Servidor MCP: em `src/agent/mcp/server/stdio.ts:36` trocar `options.version ?? '1.0.0'` por `options.version ?? readMaiaPackageVersion()`; em `src/cli/commands/mcp.server.ts` trocar `version: flags.version ?? '1.0.0'` por `version: flags.version` (a sobrescrita `--version` continua valendo; o padrão fica no servidor); em `src/agent/mcp/runtime/protocol/json-rpc/create.modern.result.meta.ts` o padrão do parâmetro `version` passa a ser `readMaiaPackageVersion()`. Teste em `tests/tools/mcp.server.test.ts` (usar o helper `invoke` existente): `new McpStdioServer(store)` **sem** `version` → `initialize` retorna `serverInfo.version` igual à versão do `package.json`, e o `_meta['io.modelcontextprotocol/serverInfo'].version` de uma resposta moderna (`server/discover`) também; `new McpStdioServer(store, { version: '9.9.9' })` → `9.9.9` (sobrescrita preservada). Depende de T004.
- [X] T012 [P] [US2] Cliente MCP: em `src/agent/mcp/runtime/protocol/json-rpc/create.modern.request.meta.ts` e em `src/agent/mcp/runtime/client/json-rpc-client/json.rpc.mcp.client.ts` (initialize legado, ~linha 152) trocar `MAIA_PACKAGE_METADATA.version` por `readMaiaPackageVersion()`; remover o import de `MAIA_PACKAGE_METADATA` se ficar sem uso. Teste em `tests/tools/mcp.protocol.test.ts`: com o `LegacyTransport` existente, capturar `params` do `initialize` (estender o fake para guardar `params`) e afirmar `clientInfo` = `{ name: 'maia', version: <package.json> }`; com o `ModernTransport` existente, afirmar que `options._meta` / `params._meta` de `tools/list` traz `io.modelcontextprotocol/clientInfo.version` = versão do `package.json` (seguir o formato já usado no teste "uses stateless discovery and per-request metadata"). Depende de T004.

**Checkpoint**: US2 completa; os pontos 3–7 da tabela de research.md informam a versão real.

---

## Phase 5: User Story 3 - Divergência barrada antes de publicar (Priority: P2)

**Goal**: impossível voltar a divergir sem um teste ou o build falhar (FR-001, FR-006, FR-007,
FR-008; research D2, D5).

**Independent Test**: quickstart.md §1 e §5; alterar só `version` no `package.json` mantém
tudo verde e expõe o novo valor; uma divergência simulada faz o teste/checagem falhar.

- [X] T013 [US3] Remover o campo `version` de `MAIA_PACKAGE_METADATA` em `src/shared/package.metadata.ts` (fica `{ name, source }`; atualizar o JSDoc para "identidade fixa do pacote; a versão vem de `readMaiaPackageVersion`"). O `typecheck` não pode apontar nenhum uso remanescente (garantido por T005, T011, T012). Teste: criar `tests/shared/maia.version.sync.test.ts`, que lê `version` do `package.json` da raiz **direto do disco** (sem usar o módulo testado) e afirma igualdade com `readMaiaPackageVersion()`; `createDefaultManifest().sources.local.ref`; `createModernResultMeta()['io.modelcontextprotocol/serverInfo'].version`; `createModernRequestMeta()['io.modelcontextprotocol/clientInfo'].version`; `serverInfo.version` do `initialize` de `new McpStdioServer(store)` sem versão; saída de `versionCommand`. E afirma `!('version' in MAIA_PACKAGE_METADATA)`. Cada `assert` com mensagem nomeando o ponto (ex.: `'sources.local.ref diverge do package.json'`). Depende de T005, T011, T012.
- [X] T014 [US3] Criar `scripts/check-dist-version.mjs` (contracts/release.md): lê `version` do `package.json` da raiz; importa dinamicamente de `dist/src/` o `read.maia.package.version.js`, `agent/catalog/manifest/defaults.js` e `agent/mcp/runtime/protocol/json-rpc/create.modern.result.meta.js`; compara os três; divergência → `console.error('Dist version mismatch: <ponto> reports <x>, package.json has <y>')` por ponto e `process.exit(1)`; sucesso → `Dist version check passed: <versão>`. Modificar `scripts/build-publish.mjs` para executar o script no fim (`execSync('node scripts/check-dist-version.mjs', { cwd: rootDir, stdio: 'inherit' })`). O script aceita um argumento opcional `--expected <versão>` que substitui a versão lida do `package.json`, só para o teste negativo. Teste: (a) `npm run build:publish` → `Dist version check passed: <versão>`; (b) `node scripts/check-dist-version.mjs --expected 0.0.0` → três linhas `Dist version mismatch` e exit 1. Nenhum arquivo é editado. Registrar os dois resultados na mensagem do commit (o script fica fora de `npm test` porque exige `dist/`, e o CI o executa via `npm pack` → `prepack`). Depende de T013.

**Checkpoint**: SC-003 e SC-004 verificáveis.

---

## Phase 6: User Story 4 - Tag por versão publicada (Priority: P3)

**Goal**: cada publicação cria e envia `vX.Y.Z` (FR-011; research D6; contracts/release.md).

**Independent Test**: quickstart.md §6: após `npm publish`, `git ls-remote --tags origin vX`
aponta para o mesmo SHA de `npm view …@X gitHead`.

- [X] T015 [US4] Criar `scripts/tag-release.mjs`. As funções puras ficam exportadas para teste: `releaseTagName(version)` → `` `v${version}` ``; `decideTagAction({ dirty, existingSha, headSha })` → `'refuse-dirty' | 'create' | 'already-at-head' | 'refuse-moved'`. Os efeitos rodam só quando o arquivo é o entrypoint e usam `spawnSync('git', [...])`, **sem shell**: `git status --porcelain`, `git rev-parse HEAD`, `git rev-parse -q --verify refs/tags/vX^{commit}`, `git tag -a vX -m "Release X"`, `git push origin vX`. As mensagens e os exit codes seguem exatamente a tabela de contracts/release.md. Nunca usar `-f`/`--force`. Adicionar `"postpublish": "node scripts/tag-release.mjs"` em `package.json`. Teste em `tests/shared/tag.release.test.ts`, que importa as funções puras do script: `releaseTagName('1.6.2')` → `v1.6.2`; árvore suja → `refuse-dirty`; tag inexistente → `create`; tag no HEAD → `already-at-head`; tag em outro SHA → `refuse-moved`. Não executar git real no teste. Para o `typecheck` aceitar o import de `.mjs` a partir do teste em TS (sem `allowJs`), criar `scripts/tag-release.d.mts` declarando as duas funções exportadas. O nome com hífen segue o padrão de `scripts/` (`build-publish.mjs`, `run-tests.mjs`); `check:naming` só cobre `src` e `tests`.
- [X] T016 [P] [US4] Documentar o processo numa nova seção `## Release` em `AGENT.md`, antes de `## Notes for future changes`: (1) subir `version` só no `package.json`; (2) entrada no `CHANGELOG.md`; (3) commit; (4) `npm publish`, que roda `prepack` → `build:publish` → `check-dist-version` e depois `postpublish` → tag `vX.Y.Z` + push; (5) se o `postpublish` falhar (rede), rodar de novo `node scripts/tag-release.mjs`, que é idempotente; (6) os comandos opcionais de tags retroativas apontam para `specs/007-fix-package-version/quickstart.md#tags-retroativas-opcional-manual-uma-vez`. Só documentação; validação: os links resolvem e os nomes de script batem com T014/T015.

**Checkpoint**: US4 completa; vale a partir da próxima publicação.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T017 Release 1.6.2: em `package.json`, `"version": "1.6.2"`. Em `CHANGELOG.md`, remover o cabeçalho vazio duplicado `## [1.6.0]` do topo e adicionar `## [1.6.2] - <data>`, com `### Fixed` contendo: a versão `1.5.2` fixa (nunca publicada) que aparecia em `sources.local.ref` de `maia.json`/`maia.lock.json`, e o `1.5.2`/`1.0.0` nas identidades MCP de servidor e cliente; `maia i` corrige projetos existentes automaticamente e `maia ci` só avisa (FR-012); e `### Added` com a checagem de versão no build e a tag `vX.Y.Z` no `postpublish`. O teste é a suíte inteira verde, incluindo `maia.version.sync.test.ts`, que passa a esperar 1.6.2 sem nenhuma outra edição (SC-003).
- [X] T018 Atualizar `README.md` e `README.pt-BR.md` **só se** algum deles citar `1.5.2`, o `ref` da fonte `local` ou a versão do servidor MCP (`rtk grep -n "1\.5\.2\|mcp-server.*version" README*.md`); se não houver ocorrência, registrar "sem mudança" no commit da T017 e não criar commit. *Resultado: sem ocorrência; registrado no commit da T017.*
- [X] T019 Validação final: executar o quickstart.md §1–§5 de ponta a ponta (código-fonte + `npm pack` + instalação do tarball num diretório temporário) e marcar o resultado de cada passo no `specs/007-fix-package-version/checklists/requirements.md`, na seção Notes. O §6 (tag) só é validado após o `npm publish` real, que é feito pela pessoa mantenedora fora desta lista.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)** → **Foundational (T002–T004)** → bloqueia todas as user stories.
- **US1 (T005–T010)** e **US2 (T011–T012)** dependem só da Foundational e podem andar em
  paralelo.
- **US3 (T013–T014)** depende de US1 (T005) **e** US2 (T011, T012): o campo `version` só pode
  sair depois que todos os usos migraram.
- **US4 (T015–T016)** é independente das demais (só scripts e docs); pode rodar a qualquer
  momento depois do Setup. A checagem de dist citada em T016 vem de T014.
- **Polish (T017–T019)** depois de tudo.

### Dentro das stories

- T006 → T007 → T008 → T009; T007 → T010.
- T002 ∥ T003 → T004.

### Grafo

```text
T001 → T002 ┐
       T003 ┴→ T004 ─┬→ T005 ────────────────┐
                     │   T006→T007→T008→T009 │ (T009 também ← T005)
                     │          └→T010       │
                     ├→ T011 ────────────────┤
                     └→ T012 ────────────────┴→ T013 → T014
T001 → T015, T016 (independentes)
tudo → T017 → T018 → T019
```

## Parallel Example

```text
# Foundational
T002 resolve.maia.package.json.path.ts   ∥   T003 parse.maia.package.version.ts

# Depois de T004 — US1 e US2 em paralelo
T005 defaults.ts            ∥ T011 servidor MCP (stdio.ts, mcp.server.ts, result meta)
T006 stale.local.source.ref ∥ T012 cliente MCP (request meta, json.rpc.mcp.client.ts)

# US4 a qualquer momento
T015 tag-release.mjs  ∥  T016 AGENT.md
```

## Implementation Strategy

### MVP (só US1)

1. T001–T004 (fonte única).
2. T005–T010: projetos novos corretos, antigos corrigidos no `maia i`.
3. **Parar e validar** com quickstart §2–§3. Já resolve o problema reportado na issue.

### Entrega incremental

1. MVP (US1) → release possível.
2. US2 (identidade MCP) → mais uma fatia independente.
3. US3 (guarda) → depende de US1+US2; fecha a porta para a regressão.
4. US4 (tags) → rastreabilidade.
5. Polish → 1.6.2 + CHANGELOG + validação.

Cada tarefa = um commit com teste + implementação, suíte verde (Princípios I e IV).
