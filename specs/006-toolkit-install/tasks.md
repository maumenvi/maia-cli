---

description: "Lista de tarefas para a implementação da feature"
---

# Tasks: Instalação de Toolkits

**Input**: Documentos de design em `/specs/006-toolkit-install/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/toolkit-command.md, contracts/manifest-lock-toolkits.md,
contracts/mcp-toolkits-tool.md, quickstart.md

**Tests**: Obrigatórios — Constituição, Princípio I (NON-NEGOTIABLE). **Cada tarefa
contém o seu próprio teste**: escreva o teste primeiro, veja-o falhar localmente,
implemente, e só então faça **um único commit com teste + implementação**. Nunca
commite teste vermelho (Princípio I: "Typecheck and the test suite MUST be green at
all times"; Princípio IV: uma tarefa = um commit). Nenhum teste pode depender de
`uv`, `uvx`, `specify` ou rede: use `NativeRunner`, `ConfirmFn` e `fetch` falsos
(research D8, D9) e diretórios em `os.tmpdir()`, no estilo de
`tests/cli/remove.test.ts`.

**Regras de código para toda tarefa** (Constituição V, VIII, IX): um símbolo exportado
por arquivo, com JSDoc descrevendo o propósito; nomes `palavra.palavra.ts`; núcleo em
`src/agent/toolkits/` sem I/O; processos sempre com argv e **nunca** `shell: true`;
qualquer processo nativo que apague ou sobrescreva arquivos só roda depois do
guardrail sobre os caminhos declarados (FR-027, research D11/D14). Ao final de cada
tarefa: `npm run typecheck && npm test && npm run check:architecture && npm run
check:naming` verdes.

**Organization**: agrupadas pelas User Stories do spec.md. Foundational concentra o
que US1–US5 consomem.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1…US5 do spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: flags curtas `-g`/`-y` (research D7) e levantamento dos caminhos reais
do Spec Kit (research D3, "Verificação pendente").

- [X] T001 [P] Flags curtas: criar `src/cli/shared/flags/short.flag.aliases.ts` (`SHORT_FLAG_ALIASES = { g: 'global', y: 'yes' }`) e modificar `src/cli/shared/flags/parse.flags.ts` para que argumento `^-[a-zA-Z]$` vire flag booleana `'true'` com nome resolvido pelo mapa (fallback: a própria letra), sem consumir o próximo argumento. Teste no mesmo commit em `tests/shared/parse.flags.test.ts`: `['speckit','-g']` → `positional ['speckit']`, `flags.global 'true'`; `-y` → `flags.yes`; `--global`/`--yes` equivalentes; `['--version','1.0.11','-g']`; regressão `['skill','x','--version','^1']` inalterado; `-z` → `flags.z`.
- [X] T002 [P] Levantar caminhos reais do Spec Kit: num diretório temporário, executar `uvx --from git+https://github.com/github/spec-kit.git@v1.0.11 specify init --here --force --non-interactive --ignore-agent-tools --script sh --integration copilot` e depois `specify integration install <k>` para `claude`, `cursor-agent`, `codex`, `cline` e (em outro diretório, como primária) `zed`; registrar com `find . -newer <marcador>` todos os caminhos criados por integração, confirmar que `copilot` primária + extras multi-install safe funciona, e que uma segunda não multi-install safe é recusada. Gravar o resultado como tabela nova "Caminhos verificados" em `specs/006-toolkit-install/research.md` (Decision 3). Sem código. É insumo obrigatório de T008.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

### Tipos e contratos (data-model §1–§6)

- [X] T003 [P] Criar em `src/agent/toolkits/contracts/`: `toolkit.scope.ts` (`type ToolkitScope = 'project' | 'global'`), `toolkit.command.ts` (`interface ToolkitCommand { command: string; args: string[] }`), `toolkit.prerequisite.ts` (`{ command: string; args: string[]; hint: string }`), `toolkit.integration.ts` (`{ key: string; multiInstallSafe: boolean }`), `toolkit.install.context.ts` (`{ version: string; scope: ToolkitScope; integrations: string[]; platform: NodeJS.Platform; repository: string }`), `toolkit.install.state.ts` (`'absent' | 'installed' | 'mismatch' | 'global-tool-missing'`), `toolkit.view.ts` (campos de data-model §6). Só tipos; `typecheck` é o teste.
- [X] T004 Criar `src/agent/toolkits/contracts/toolkit.definition.ts` (`ToolkitDefinition`, data-model §1): `name` (regra "`^[a-z0-9-]+$`"), `title`, `description`, `docsUrl`, `repository`, `supportsGlobal`, `prerequisites`, `integrations: Partial<Record<string, ToolkitIntegration>>` (chave = id de agente Maia), `projectPaths: string[]`, `integrationPaths: Record<string, string[]>`, `commands` (`installGlobalTool(ctx)`, `initProject(ctx, primaryKey?)`, `addIntegration(ctx, key)`, `removeIntegration(ctx, key)`, `globalToolVersion()`, `uninstallGlobalToolHint(): string`), `parseGlobalToolVersion(stdout): string | null`, `projectVersionFile: string`, `parseProjectVersion(content): string | null`. Depende de T003.
- [X] T005 [P] Criar `src/agent/catalog/types/dependencies/toolkit.dependency.ts` (`{ version: string; scope: ToolkitScope }`, JSDoc "`version` exata `^\d+\.\d+\.\d+$`") e `src/agent/catalog/types/lock/lock.toolkit.ts` (`{ name; version; scope; source; ref; integrations: string[]; paths: string[] }`). Depende de T003.

### Catálogo com Spec Kit (research D2, D3)

- [X] T006 Criar `src/agent/toolkits/catalog/speckit.ts` (`SPECKIT_TOOLKIT`) com teste no mesmo commit em `tests/toolkits/speckit.definition.test.ts`: `name 'speckit'`, `title 'GitHub Spec Kit'`, descrição "Spec-driven development: specify → plan → tasks → implement", `docsUrl 'https://github.github.com/spec-kit/installation.html'`, `repository 'https://github.com/github/spec-kit'`, `supportsGlobal true`, pré-requisitos `uv --version` (hint "Install uv: https://docs.astral.sh/uv/") e `git --version`, `projectPaths ['.specify']`, `integrationPaths` **exatamente como levantado em T002**, `projectVersionFile '.specify/init-options.json'`, integrações `claude→claude(safe)`, `copilot→copilot(não safe)`, `cursor→cursor-agent(safe)`, `zed→zed(não safe)`, `cline→cline(safe)`, `codex→codex(safe)`, sem `continue`. O teste fixa os argv: projeto → `uvx --from git+https://github.com/github/spec-kit.git@v1.0.11 specify init --here --force --non-interactive --ignore-agent-tools --script sh --integration claude`; `win32` → `--script ps`; sem primária → sem `--integration`; global → `uv tool install specify-cli --force --from git+…@v1.0.11` e `initProject` iniciando em `specify init`; `addIntegration`/`removeIntegration` → `[uvx --from …] specify integration install|uninstall <k>`; `parseGlobalToolVersion('specify 1.0.11\n') === '1.0.11'`; `parseProjectVersion('{"speckit_version":"1.0.9.dev0"}') === '1.0.9.dev0'`; `uninstallGlobalToolHint() === 'uv tool uninstall specify-cli'`. Depende de T002, T004.
- [X] T007 [P] Criar `src/agent/toolkits/catalog/toolkit.catalog.ts` (`TOOLKIT_CATALOG = [SPECKIT_TOOLKIT]`), `find.toolkit.ts` (`findToolkit(name, catalog = TOOLKIT_CATALOG)`) e `list.toolkit.names.ts` (ordenado), com `tests/toolkits/find.toolkit.test.ts` no mesmo commit. Depende de T006.

### Núcleo puro

- [X] T008 [P] `src/agent/toolkits/plan/parse.requested.version.ts` + `tests/toolkits/parse.requested.version.test.ts`: `1.0.11`/`v1.0.11` → `'1.0.11'`; fora de `^v?\d+\.\d+\.\d+$` lança `Invalid version "<v>"`.
- [X] T009 [P] `src/agent/toolkits/plan/normalize.toolkit.version.ts` + teste: `'v1.0.11'→'1.0.11'`, `'1.0.9.dev0'→'1.0.9'`, `'1.0.11+abc'→'1.0.11'`, `'1.0.11-rc.1'→'1.0.11'`, lixo → `null`.
- [X] T010 [P] `src/agent/toolkits/plan/resolve.effective.scope.ts` + teste: `(definition, requestedGlobal) → { scope, warning? }`; `-g` sem suporte → `project` + warning exato `"<name> does not support global installation; installing in the project"`.
- [X] T011 [P] `src/agent/toolkits/plan/resolve.toolkit.integrations.ts` + teste — `(definition, agentIds) → { integrations, warnings }` pela regra de research D3 (revisada com o levantamento de T002): se houver alguma integração multi-install safe, todas as safe na ordem de `agentIds` (primeira = primária) e cada não safe pulada com warning `integration "<k>" cannot be combined with other integrations; skipped`; se só houver não safe, a primeira e as demais puladas com o mesmo warning; agente sem mapeamento → `agent "<a>" is not supported by <toolkit>`; sem agentes → `[]` + `no agent configured; <toolkit> installed with its default integration`; sem duplicatas (`codex` e `zed` distintos). Casos obrigatórios: `['claude','copilot'] → ['claude']` + warning de `copilot`; `['copilot','zed'] → ['copilot']` + warning de `zed`; `['cursor','claude','codex'] → ['cursor-agent','claude','codex']`; `['continue'] → []` + warning. Depende de T006.
- [X] T012 [P] `src/agent/toolkits/plan/collect.toolkit.path.patterns.ts` + teste: `(definition, integrations) → string[]` = `projectPaths` + `integrationPaths[k]` na ordem de `integrations`, sem duplicatas. Depende de T006.
- [X] T013 [P] `src/agent/toolkits/plan/build.toolkit.install.commands.ts` + teste: `(definition, ctx, state) → ToolkitCommand[]` — `absent` em `project`: `[initProject(ctx, integrations[0]), ...addIntegration(extras)]`; `absent` em `global`: `[installGlobalTool, initProject, ...extras]`; `global-tool-missing`: só `[installGlobalTool]`; `absent` global com ferramenta já presente na versão: sem `installGlobalTool` (flag `globalToolReady` no ctx). Depende de T006.
- [X] T014 [P] `src/agent/toolkits/plan/classify.toolkit.state.ts` + teste: `({ expectedVersion, scope, projectVersion, globalToolVersion }) → ToolkitInstallState` via `normalizeToolkitVersion`: projeto `null` → `absent`; diferente → `mismatch`; global com ferramenta ausente/diferente (projeto ok) → `global-tool-missing`; senão `installed`. Depende de T009.
- [X] T015 `src/agent/toolkits/lock/build.toolkit.lock.entries.ts` + `tests/toolkits/build.toolkit.lock.entries.test.ts`: `(toolkits, agentIds, catalog = TOOLKIT_CATALOG) → Record<string, LockToolkit>` — `ref = 'v' + version`, `source = repository`, `integrations` via T011, `paths` via T012; nome fora do catálogo lança `Unknown toolkit "<n>" in maia.json (not in Maia's built-in catalog)`; `scope 'global'` sem `supportsGlobal` lança `Toolkit "<n>" does not support global scope`; versão inválida lança (T008); chaves ordenadas. Depende de T005, T007, T008, T011, T012.

### Manifesto, lockfile e store (contracts/manifest-lock-toolkits.md)

- [X] T016 Manifesto: `toolkits: Record<string, ToolkitDependency>` em `src/agent/catalog/types/manifest/sources.manifest.ts`, `toolkits: {}` em `src/agent/catalog/manifest/defaults.ts`, `toolkits: { ...(parsed.toolkits ?? {}) }` em `src/agent/catalog/manifest/normalize/normalize.manifest.ts` (+ opcional em `legacy.sources.manifest.ts`); `toolkitCatalog?: readonly ToolkitDefinition[]` em `src/agent/catalog/types/store/catalog.store.options.ts` (research D17); métodos `setToolkit(name, dep)`/`removeToolkit(name)` em `src/agent/catalog/store/agent.catalog.store.ts`. Testes no mesmo commit em `tests/tools/catalog.store.test.ts`: manifesto sem `toolkits` carrega `{}`; `setToolkit`/`removeToolkit` persistem sem perder outros campos. Depende de T005.
- [X] T017 Lock: `toolkits?: Record<string, LockToolkit>` em `src/agent/catalog/types/lock/source.lock.ts`; `buildLockFromManifest(manifest, workspaceRoot, toolkitCatalog = TOOLKIT_CATALOG)` em `src/agent/catalog/lock/build.ts` preenche `toolkits` com agentes habilitados de `manifest.agents` na ordem, omite o campo quando vazio e grava `lockfileVersion: toolkits ? 2 : 1`; `store.buildLock()` repassa `options.toolkitCatalog`; `SUPPORTED_LOCKFILE_VERSIONS = [1, 2]` em `src/cli/commands/assert.lockfile.version.compatible.ts`, `isLockfileVersionCompatible(v, supported: readonly number[])` e mensagem em `lockfile.version.compatibility.error.ts`; `lockComparableProjection` (+ tipo) inclui `toolkits: lock.toolkits ?? {}`. Testes no mesmo commit: `tests/cli/lock.test.ts` (sem toolkits → lock idêntico ao atual, v1; com `speckit` → v2 e entrada de data-model §4; desconhecido → erro; catálogo fake via store), `tests/shared/is.lockfile.version.compatible.test.ts` (1, 2 ok; 0, 3 falham), `tests/shared/is.lock.stale.test.ts` (versão de toolkit divergente → stale; ausente ≡ `{}`). Depende de T015, T016.

### Bordas de I/O injetáveis (research D8, D9)

- [X] T018 [P] `src/cli/commands/toolkit/native.runner.ts` (`type NativeRunner = (cmd: ToolkitCommand, options: { cwd: string; interactive: boolean }) => { status: number; stdout: string; stderr: string }`) e `run.native.command.ts` (`spawnSync(command, args, { cwd, shell: false, stdio: interactive ? 'inherit' : 'pipe', encoding: 'utf8' })`; `ENOENT` → `status 127`) + `tests/cli/run.native.command.test.ts` (`process.execPath -e "process.stdout.write('ok')"`; comando inexistente → 127).
- [X] T019 [P] `src/cli/commands/toolkit/confirm.fn.ts` (`type ConfirmFn = (question: string) => Promise<boolean>`) e `prompt.confirm.ts` (sem `process.stdin.isTTY` → `false` sem ler; `y`/`yes`/`s`/`sim` → `true`) + `tests/cli/prompt.confirm.test.ts` (caminho sem TTY).
- [X] T020 `src/cli/commands/toolkit/toolkit.io.ts` (`interface ToolkitIo { runner; confirm; fetch: typeof fetch; platform: NodeJS.Platform; catalog: readonly ToolkitDefinition[] }`) e `default.toolkit.io.ts` (implementações reais, `catalog: TOOLKIT_CATALOG`). Depende de T018, T019.
- [X] T021 `src/cli/commands/toolkit/detect.toolkit.state.ts` + `tests/cli/detect.toolkit.state.test.ts`: `(definition, { version, scope }, projectRoot, io) → { state, projectVersion, globalToolVersion }` — lê `projectVersionFile` (ausente → `null`), roda `globalToolVersion()` com `interactive: false` só em escopo global, delega a `classifyToolkitState`. Depende de T014, T020.
- [X] T022 [P] `src/cli/commands/toolkit/check.toolkit.prerequisites.ts` + teste: primeiro pré-requisito com `status !== 0` lança `Missing prerequisite "<command>" for <toolkit>. <hint> See <docsUrl>`. Depende de T020.
- [X] T023 [P] `src/cli/commands/toolkit/snapshot.toolkit.paths.ts` + `tests/cli/snapshot.toolkit.paths.test.ts`: `(projectRoot, patterns) → Set<string>` expandindo `*` no último segmento com `readdirSync` e retornando relativos existentes.
- [X] T024 [P] `src/cli/commands/toolkit/assert.toolkit.paths.allowed.ts` + `tests/cli/assert.toolkit.paths.allowed.test.ts`: `(store, relativePaths, kind: DestructiveActionKind, reason) → { allowed: string[]; blocked: string[] }` chamando `assertPathAllowed(projectRoot, projectRoot, abs, kind, reason)` por caminho e capturando `GuardrailBlockedError`; config malformada (exit 2) é **relançada**, nunca tratada como bloqueio parcial. Teste com `.maia/guardrails.json` `{"version":1,"denyPatterns":[".specify/**",".specify"]}`. Depende de T023.

**Checkpoint**: fundação pronta; `maia lock` já grava toolkits de manifesto editado à mão.

---

## Phase 3: User Story 1 - Instalar um toolkit no projeto (Priority: P1) 🎯 MVP

**Goal**: `maia toolkit i|install <nome> [--version] [-y]` instala no projeto via
instalador nativo, com confirmação, rollback e registro.

**Independent Test**: tmpdir com `maia.json` e agentes `claude`,`codex`; `createToolkitCommand(ioFalso)(['i','speckit','-y'], ctx)` com runner falso que cria `.specify/init-options.json` → argv de T006 com `--integration claude` seguido de `integration install codex`; `maia.json.toolkits.speckit = { version: '1.0.11', scope: 'project' }`; lock v2.

- [X] T025 [P] [US1] `src/cli/commands/toolkit/resolve.toolkit.release.ts` + `tests/cli/resolve.toolkit.release.test.ts`: sem versão → `GET https://api.github.com/repos/github/spec-kit/releases/latest` com `createGitHubHeaders()`, retorna `normalizeToolkitVersion(tag_name)`; com versão → `parseRequestedVersion` + `GET …/releases/tags/v<x>`; 404 → `Toolkit speckit has no release v<x>`; outro erro → `Unable to resolve speckit release: <status|mensagem>`; owner/repo derivados de `repository`. Depende de T008, T009, T020.
- [X] T026 [P] [US1] `src/cli/commands/toolkit/rollback.new.toolkit.paths.ts` + teste: `(store, before: Set<string>, patterns) → { removed; kept }` — apaga (`rmSync recursive`) só caminhos atuais ausentes de `before`, filtrados por `assertToolkitPathsAllowed(..., 'file-delete', 'maia toolkit rollback')`; bloqueados vão para `kept`. Depende de T023, T024.
- [X] T027 [P] [US1] `src/cli/commands/toolkit/format.toolkit.command.ts` + teste: renderiza `ToolkitCommand` para `Will run:` (argumentos com espaço entre aspas).
- [X] T028 [US1] `src/cli/commands/toolkit/install.toolkit.ts` + `src/cli/commands/toolkit/toolkit.command.ts` (`createToolkitCommand(io)`, `toolkitCommand` padrão, `ensureInitialized`, subcomandos `i`/`install`, usages de contracts/toolkit-command.md) + registro `toolkit` em `src/cli/commands/command.handlers.ts`, **com** `tests/cli/toolkit.install.test.ts` no mesmo commit. Fluxo (data-model §5): `findToolkit(name, io.catalog)` (erro `Unknown toolkit "<n>". Available: <lista>`) → `resolveEffectiveScope` → `resolveToolkitRelease` → `checkToolkitPrerequisites` → `detectToolkitState` → (`installed` + registrado → `speckit@<v> is already installed`; presente sem registro e mesma versão → `Adopted existing speckit@<v>`, grava sem executar; `mismatch` → `assertToolkitPathsAllowed(caminhos existentes, 'file-overwrite', 'maia toolkit i --version')`, qualquer bloqueio lança `GuardrailBlockedError` sem executar nada, e a confirmação inclui `Existing speckit files will be overwritten (edits will be lost).`) → `resolveToolkitIntegrations` com agentes habilitados (imprimir `warning:`) → `buildToolkitInstallCommands` → imprimir `Will run:` por comando e `Source: <repository>@v<v>` → `io.confirm('Proceed? [y/N]')` salvo `-y` (false → `Aborted`, exit 1) → `snapshotToolkitPaths` → executar em ordem com `interactive: true`; status ≠ 0 → `rollbackNewToolkitPaths` e lançar `Toolkit <n> failed to install (exit <c>)` (+ `Global tool kept; to uninstall: <hint>` se a ferramenta global já foi instalada) → `withRollback([setToolkit/removeToolkit anterior, buildLock/saveLock anterior])` → `restoreConfiguredAgents` → `Installed toolkit:<n>@<v> (<scope>)`. Casos do teste: sucesso sem `--version`; `install ≡ i`; nome desconhecido sem efeitos; `--version 9.9.9` (404) e `--version abc` sem efeitos; pré-requisito ausente (runner `uv` → 127) sem chamar `specify`; confirmação negada → `Aborted`; `-y` não chama confirm; falha do instalador remove `.specify/` novo e preserva `.specify/` pré-existente, manifesto/lock intactos; já instalado; adoção; troca de versão com guardrail bloqueando `.specify` → erro e runner não chamado; troca liberada → mensagem de sobrescrita; `['claude','continue']` → warning; sem agentes → warning e init sem `--integration`; saída contém `Will run:` e `Source:`. Depende de T001, T010, T011, T013, T017, T021, T022, T024–T027.

**Checkpoint**: US1 entregável como MVP.

---

## Phase 4: User Story 2 - Restaurar toolkits com `maia i` e `maia ci` (Priority: P1)

**Goal**: `maia i`/`ci` instalam toolkits ausentes sem perguntar, falham em versão
divergente (Clarification 6) e `verify` checa presença/versão.

**Independent Test**: lock com `speckit@1.0.11` e sem `.specify/` → `createCiCommand(ioFalso)` executa `specify init … --non-interactive` na tag `v1.0.11`; segunda execução não chama runner; edição em `.specify/memory/constitution.md` preservada; `init-options.json` com `1.0.10` → erro sem runner.

- [X] T029 [US2] `src/cli/commands/toolkit/restore.toolkits.ts` + `tests/cli/restore.toolkits.test.ts`: `restoreToolkits(store, lock, mode: 'install' | 'ci', io) → { installed: string[]; undo: () => void }` — por toolkit: `detectToolkitState`; `installed` → nada (runner não chamado, SC-006); `absent`/`global-tool-missing` → pré-requisitos + `buildToolkitInstallCommands` com o contexto do lock + runner `interactive: false`; `mismatch` → lança `Toolkit <n> is at <x> but <maia.json|maia.lock.json> requires <y>. Run "maia toolkit i <n> --version <y>" to switch versions.` sem executar nada; status ≠ 0 → `rollbackNewToolkitPaths` e lança `Toolkit <n> failed during <mode>: exit <c>`; nunca chama `confirm` (FR-010b); `undo` remove caminhos novos de toolkits instalados nesta execução. Depende de T028.
- [X] T030 [US2] `src/cli/commands/toolkit/verify.toolkits.ts` + teste: `(store, lock, io) → LockVerificationProblem[]` (tipo de `src/agent/catalog/lock/verify/lock.verification.problem.ts`): `absent` → `toolkit:<n> is not installed`; `mismatch` → mensagem com as duas versões; `global-tool-missing` → `toolkit:<n> global tool is missing or at another version`; sem hash (FR-019). Depende de T021.
- [X] T031 [US2] Modificar `src/cli/commands/install/install.command.ts` (ramo sem argumentos) com `createInstallCommand(io)` preservando `installCommand`: após `reinstallFromLock`, `await restoreToolkits(store, lock, 'install', io)` antes de `restoreConfiguredAgents`; imprimir `Installed N toolkits`. Casos novos no mesmo commit em `tests/cli/install.test.ts`: ausente instalado sem `confirm`; `installed` não chama runner e preserva arquivo editado; `mismatch` → erro de T029 e runner não chamado; toolkit fora do catálogo → erro FR-003a; falha do instalador → erro nomeando o toolkit. Depende de T029.
- [X] T032 [US2] Modificar `src/cli/commands/ci.ts` com `createCiCommand(io)`: `restoreToolkits(..., 'ci', io)` como **segundo passo do mesmo `withRollback`** que materializa skills/tools (undo = `result.undo`), antes do `postflight`; depois `verifyToolkits` somado aos problemas do `postflight` (research D15). Casos novos no mesmo commit em `tests/cli/ci.test.ts`: ausente → instalado na versão do lock, `--non-interactive`, sem `confirm`; já instalado → runner não chamado; manifesto divergente do lock → erro de staleness antes do runner (US2.3); `mismatch` no disco → erro de T029 citando `maia.lock.json`; instalador falha → `Toolkit speckit failed during ci`, exit ≠ 0, sem mensagem de sucesso **e** skills materializadas nesta execução removidas; lock v2 aceito, v3 rejeitado. Depende de T029, T030.
- [X] T033 [US2] Modificar `src/cli/commands/verify.ts` com `createVerifyCommand(io)`: concatenar `verifyToolkits` aos problemas de `store.verifyLock(lock)`. Casos novos no mesmo commit em `tests/cli/verify.test.ts`: presente na versão → OK; ausente e divergente → problemas agregados com os de pacotes; nenhum hash exigido. Depende de T030.

**Checkpoint**: US1 + US2 = fluxo reprodutível completo.

---

## Phase 5: User Story 3 - Instalação global com `-g` (Priority: P2)

**Goal**: `-g` instala a ferramenta global **e** inicializa o projeto; toolkit sem
suporte ignora `-g` com aviso.

**Independent Test**: `['i','speckit','-g','-y']` → runner recebe `uv tool install specify-cli --force --from …@v1.0.11` e depois `specify init …` (sem `uvx`); manifesto `scope: 'global'`.

- [X] T034 [US3] Ajustar `src/cli/commands/toolkit/install.toolkit.ts` para escopo global: detectar `globalToolReady` (ferramenta já na versão) e repassar a `buildToolkitInstallCommands`. Casos novos no mesmo commit em `tests/cli/toolkit.install.test.ts`: `-g` → ordem dos argv e `scope 'global'` em manifesto/lock, stdout `(global)`; toolkit fake `supportsGlobal: false` via `io.catalog` e `new AgentCatalogStore({ cwd, toolkitCatalog })` → warning exato e argv idêntico ao sem `-g`, `scope 'project'` (SC-003); `--global ≡ -g`; ferramenta global já presente → só `specify init`; falha no init após instalar a ferramenta → mensagem com `uv tool uninstall specify-cli`. Depende de T028.
- [X] T035 [US3] Ajustar `src/cli/commands/toolkit/restore.toolkits.ts` para `global-tool-missing` (só `installGlobalTool`) e `absent` com ferramenta pronta (só init + integrações). Casos novos no mesmo commit em `tests/cli/ci.test.ts`. Depende de T029, T034.

---

## Phase 6: User Story 4 - Consultar toolkits pelo MCP e pelo CLI (Priority: P2)

**Goal**: `maia toolkit ls [--json]`, ferramenta MCP somente leitura `maia_toolkits`
(nome reservado) e seção `### Toolkits` nas instruções dos agentes.

**Independent Test**: com lock contendo `speckit`, `tools/call maia_toolkits` retorna o JSON de contracts/mcp-toolkits-tool.md; `tools/list` não tem ferramenta de instalação.

- [X] T036 [P] [US4] `src/agent/toolkits/view/to.toolkit.view.ts` + `tests/toolkits/to.toolkit.view.test.ts`: sem lock `installed: false` sem `version/scope/integrations/paths`; com lock copia; `installCommand 'maia toolkit i <name>'`.
- [X] T037 [US4] `src/cli/commands/toolkit/list.toolkits.ts` ligado a `ls`/`list` em `toolkit.command.ts` + `tests/cli/toolkit.list.test.ts`: texto `speckit  GitHub Spec Kit  global:yes  not installed` / `installed 1.0.11 (global)`; `--json` → array de `ToolkitView`. Depende de T028, T036.
- [X] T038 [US4] MCP: `src/agent/mcp/server/collect/collect.toolkit.entries.ts` (entrada `maia_toolkits`, `origin 'toolkit:catalog'`, schema do contrato); em `collect.all.tools.ts` ela vem primeiro e sem política de acesso; `collect.local.entries.ts` ignora skill/tool chamada `maia_toolkits` (aviso em stderr); `router.ts` trata `origin === 'toolkit:catalog'` retornando `{ toolkits, note: "Maia MCP does not install toolkits. Use the CLI command shown or the toolkit docs." }` e `isError` para nome desconhecido; JSDoc de `mcp.tool.entry.ts` cita `toolkit:<id>`; `installCommand` recusa `maia i skill|tool maia_toolkits` com `"maia_toolkits" is a reserved name`. Casos novos no mesmo commit em `tests/tools/mcp.server.test.ts` e `tests/cli/install.test.ts`: presente para qualquer `--agent`; filtro por `name`; desconhecido → erro; nenhuma ferramenta de instalação de toolkit (SC-005); nome reservado. Depende de T036.
- [X] T039 [US4] `src/cli/commands/agent/render.agent.capability.block.ts`: seção `### Toolkits` após `### Tools` com `` - `speckit` 1.0.11 (project) — docs: <docsUrl>; details via the `maia_toolkits` MCP tool `` ou `- _none installed_` (FR-022). Caso novo no mesmo commit em `tests/cli/agent.test.ts`. Depende de T036.

---

## Phase 7: User Story 5 - Remover um toolkit do projeto (Priority: P3)

**Goal**: `maia toolkit rm|remove <nome> [-y]` remove do manifesto/lock e pergunta se
apaga arquivos (padrão "não"); uninstall nativo só após guardrail; ferramenta global
nunca desinstalada.

**Independent Test**: com fixture instalada, `rm` + confirm false mantém `.specify/`; confirm true roda `specify integration uninstall` por integração liberada e apaga `.specify/`.

- [X] T040 [P] [US5] `src/cli/commands/toolkit/delete.toolkit.paths.ts` + teste: `(store, relativePaths) → { deleted; blocked }` usando `assertToolkitPathsAllowed(..., 'file-delete', 'maia toolkit rm')` e `rmSync(recursive, force)` só nos liberados. Depende de T024.
- [X] T041 [US5] `src/cli/commands/toolkit/remove.toolkit.ts` ligado a `rm`/`remove` em `toolkit.command.ts` + `tests/cli/toolkit.remove.test.ts` no mesmo commit. Fluxo: exige registro (`Toolkit "<n>" is not installed`, exit 1); guarda a entrada do lock; `withRollback([removeToolkit/setToolkit, buildLock/saveLock anterior])`; lista caminhos existentes de `lockEntry.paths`; `yes || await io.confirm('Delete these files? Edits will be lost. [y/N]')`; "não" → `Kept: …`; "sim" → **para cada integração**, expande `integrationPaths[k]` e chama `assertToolkitPathsAllowed(..., 'file-delete')` **antes** de `removeIntegration`; se algum caminho estiver bloqueado, não executa o uninstall daquela integração e reporta `Blocked by guardrail, kept: <path>`; falha do uninstall vira warning; depois `deleteToolkitPaths(projectPaths)`; `scope 'global'` → sempre `Global tool kept. To uninstall: <hint>`; por fim `restoreConfiguredAgents`. Casos: não registrado; "não"; sem TTY; "sim" com uninstall por integração e `.specify` apagado; `-y` sem confirm; guardrail bloqueando `.claude/skills/**` → uninstall de `claude` **não** executado (runner não recebe `integration uninstall claude`) e caminho mantido; guardrail em `.specify` → mantido, exit 0; global → hint e runner nunca recebe `uv tool uninstall`; pergunta contém `Edits will be lost`; lock volta a v1 quando era o único toolkit. Depende de T028, T040.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T042 [P] `src/cli/commands/help.ts`: três linhas de contracts/toolkit-command.md §Sintaxe (teste de snapshot existente, se houver, atualizado no mesmo commit).
- [X] T043 [P] `README.md` e `README.pt-BR.md`: seção "Toolkits" (conceito, `maia toolkit i|ls|rm`, `-g`, `--version`, `-y`, `maia i`/`ci`/`verify` incluindo a falha em versão divergente, `maia_toolkits`, requisito `uv`) e referência de comandos.
- [X] T044 [P] `CHANGELOG.md`: toolkits; `lockfileVersion` 2 apenas com toolkits; flags `-g`/`-y`.
- [X] T045 [P] `SECURITY.md`: instaladores de terceiros com permissões do usuário; confirmação; guardrail antes de sobrescrita/uninstall nativos; `ci` com versão/origem travadas.
- [X] T046 Executar manualmente os cenários 1–5 de `specs/006-toolkit-install/quickstart.md` numa máquina com `uv` e registrar desvios como tarefas novas neste arquivo.
- [X] T047 `npm run typecheck && npm test && npm run check:architecture && npm run check:naming && npm run guardrails:check` verdes.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: sem dependências; T002 bloqueia T006.
- **Foundational (Phase 2)**: depende de Setup; bloqueia todas as histórias.
- **US1**: depende de Foundational. MVP.
- **US2**: depende de US1 (reutiliza pipeline de instalação).
- **US3**: depende de US1 e US2.
- **US4**: depende de Foundational + T028; paralela a US2/US3.
- **US5**: depende de T028 e T024; independente de US2–US4.
- **Polish**: após as histórias desejadas.

```text
Setup → Foundational → US1 ─┬─→ US2 → US3
                            ├─→ US4
                            └─→ US5
                                    → Polish
```

## Parallel Examples

```text
Setup:        T001 || T002
Foundational: T003 → (T004 || T005) → T006 → (T007 || T008 || T009 || T010 || T011 || T012 || T013)
              → T014 → T015 → T016 → T017;   T018 || T019 → T020 → (T021 || T022);  T023 → T024
US1:          T025 || T026 || T027 → T028
US2:          T029 → T030 → (T031 || T032 || T033)
US4:          T036 → (T037 || T038 || T039)
US5:          T040 → T041
```

## Implementation Strategy

1. Setup + Foundational → US1 → validar cenário 1 do quickstart → **parar e revisar**
   (Constituição III).
2. + US2 (fecha o valor P1) → + US3 → + US4 → + US5 → Polish.

### Notes

- Cada tarefa = teste + implementação num único commit, com todos os gates verdes.
- Nenhum teste chama `uv`, `uvx`, `specify` ou rede real (exceto T002 e T046,
  que são levantamentos/validações manuais sem código).
