---

description: "Lista de tarefas para a implementação da feature"
---

# Tasks: Integração com o Claude Code, skills completas, instalação segura e variáveis globais

**Input**: Documentos de design em `/specs/009-agent-integration-fixes/`

**Prerequisites**: plan.md, spec.md, research.md (D1–D12), data-model.md,
contracts/agent.registration.md, contracts/cli.install.md, contracts/skill.directory.md,
contracts/env.global.md, quickstart.md

**Revisão 2026-10-02** (pós-`/speckit-analyze`):
- FR-004 vale para todos os agentes (I1) e o FR-004a é novo (T015, T016).
- F1: `files` fica fora da comparação de lock desatualizado e a v3 vem do manifesto (T031,
  T032).
- U1: um só mecanismo para o `cwd` (T014).
- U2: interação injetável no `CliContext` (T002).
- U3: pasta sem `files` é `missing-artifact-hash` (T033).
- C1: arquivo global ilegível (T021).
- A2, A3 e K1: tarefas ajustadas.

**Tests**: Obrigatórios (Constituição, Princípio I). Em cada tarefa: escreva o teste primeiro,
veja-o falhar, implemente e faça **um único commit com teste e implementação** (Princípio IV).
Nenhum teste usa rede, a home real ou TTY real:

- `fetch`: substituir `globalThis.fetch`, no estilo de `tests/cli/skills.test.ts`;
- git: repositório git local temporário;
- TTY, seletor e confirmação: `context.interaction`, da T002;
- `MAIA_CONFIG_HOME`: apontar para um diretório de `os.tmpdir()`.

**Regras de código para toda tarefa** (Constituição V, VIII, IX):

- um símbolo exportado por arquivo, com JSDoc;
- nomes `palavra.palavra.ts`;
- decisões em funções puras e I/O só nas bordas;
- processos com argv, **nunca** `shell: true`;
- o Maia nunca apaga arquivo que não criou.

Ao final de cada tarefa: `npm run typecheck && npm test && npm run check:architecture && npm
run check:naming` verdes.

**Branch**: `009-agent-integration-fixes`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1…US6 do spec.md

---

## Phase 1: Setup

- [X] T001 Linha de base: na branch `009-agent-integration-fixes`, rodar os gates acima e registrar que estão verdes (358 testes). Rodar `rtk grep -rn "SKILL.md'" tests` e `rtk grep -rn "runSkillsCli(\['add'\|mcpCommand(\['add'" tests` e anotar, na seção "Notas de execução" no fim deste arquivo, os testes que dependem de (a) `path` de skill terminando em `SKILL.md` no lock/manifesto e (b) `add <termo não exato>` sem TTY. Eles serão ajustados em T011, T012 e T031. Sem commit de código.

---

## Phase 2: Foundational

**⚠️** US3 e US5 dependem desta fase.

- [X] T002 Interação injetável (research D6, "Pontos de injeção para teste"):
  - criar `src/cli/shared/terminal/is.interactive.terminal.ts` com `isInteractiveTerminal(stdin = process.stdin, stdout = process.stdout): boolean` → `Boolean(stdin.isTTY && stdout.isTTY)` (JSDoc: "única definição de 'interativo' do CLI");
  - criar `src/cli/contracts/cli.interaction.ts` com `interface CliInteraction { isInteractive(): boolean; select(results: CatalogSearchResult[], options?: { trustOf?: (r: CatalogSearchResult) => boolean }): Promise<CatalogSearchResult | null>; confirm: ConfirmFn }`;
  - criar `src/cli/shared/terminal/default.interaction.ts` com `DEFAULT_INTERACTION: CliInteraction` (`isInteractiveTerminal`, `selectCatalogResult`, `promptConfirm` de `src/cli/commands/toolkit/prompt.confirm.ts`);
  - em `src/cli/contracts/cli.context.ts`, adicionar `interaction?: CliInteraction`;
  - trocar a checagem local de TTY em `src/cli/install/mcp-credentials/configure.mcp.credentials.from.result.ts` por `isInteractiveTerminal()`.

  Teste em `tests/shared/is.interactive.terminal.test.ts`, com objetos `{ isTTY: true|false|undefined }` nas quatro combinações.

---

## Phase 3: User Story 2 - `--help` nunca instala nada (Priority: P1) 🎯 MVP

**Goal**: `--help`/`-h` em qualquer posição mostra a ajuda do comando e sai com 0, sem ler o
projeto, sem catálogo e sem rede (FR-006; research D5; contracts/cli.install.md "Ajuda").

**Independent Test**: quickstart §3, com todos os comandos com `--help`/`-h`: exit 0 e
nenhum arquivo alterado.

- [X] T003 [P] [US2] Criar `src/cli/help/command.help.ts` exportando `COMMAND_HELP: Readonly<Record<string, readonly string[]>>`, que mapeia cada comando de `src/cli/commands/command.handlers.ts`, incluindo os aliases (`i`, `install`, `rm`, `remove`, `ls`, `add`, …), para as linhas de uso que hoje estão em `src/cli/commands/help.ts`. Atualizar a linha de MCP para `maia mcp find <query> [--env-g]`, `maia mcp i|add|install <name> [--env-g] [--all-llms | --llms <ids>]` e a de skills para `maia skills add <skill-name|owner/repo@skill> [--as <name>] [--all-llms | --llms <ids>]`. Reescrever `help.ts` para imprimir as linhas **na ordem atual**, sem duplicatas, a partir de `COMMAND_HELP` (fonte única). Teste em `tests/shared/command.help.test.ts`: todo id de `commandHandlers` tem entrada; `COMMAND_HELP.skills` contém a linha com `--as`; `helpCommand` imprime as linhas na ordem atual, sem duplicata.
- [X] T004 [P] [US2] Criar `src/cli/help/wants.help.ts` com a função pura `wantsHelp(args: readonly string[]): boolean`, que é `true` se `--help` ou `-h` aparece em qualquer posição. Teste em `tests/shared/wants.help.test.ts`: `['add','--help']`, `['-h']`, `['add','foo','--help']` → true; `['add','foo']`, `['add','--helper']`, `[]` → false.
- [X] T005 [US2] Em `src/cli/index.ts`, antes de criar o `AgentCatalogStore`: se `wantsHelp(args)` (ou se `command` for `--help`/`-h`), imprimir `(COMMAND_HELP[effectiveCommand] ?? <ajuda geral>).join('\n')`, definir `process.exitCode = 0` e retornar, sem chamar nenhum handler. Teste em `tests/cli/help.flag.test.ts`, rodando `spawnSync(process.execPath, [cliEntry, ...args], { cwd: <tmp vazio>, env: { ...process.env, MAIA_CONFIG_HOME: <tmp> } })` para `skills add --help`, `skills add -h`, `skills find --help`, `mcp add --help`, `mcp i -h`, `toolkit i --help`, `i --help`, `--help`. Cada um dá status 0 e stdout com `maia `, e o diretório continua vazio (sem `maia.json` nem `.maia/`). Depende de T003, T004.

**Checkpoint**: a brecha do relato (item 3) está fechada.

---

## Phase 4: User Story 3 - Instalação por busca pede confirmação (Priority: P1)

**Goal**: termo ambíguo pede escolha com TTY e falha sem TTY. Identificador exato instala
direto. Fonte não confiável só é autorizada com consentimento (FR-007 a FR-010; research D6,
D7; contracts/cli.install.md).

**Independent Test**: quickstart §4, com catálogo simulado por `fetch` falso e
`context.interaction` falso.

- [X] T006 [P] [US3] Criar `src/cli/install/external/is.exact.catalog.identifier.ts` com a função pura `isExactCatalogIdentifier(query: string, results: CatalogSearchResult[]): CatalogSearchResult | null`. Retorna o resultado quando há **exatamente um** com `name.toLowerCase() === query.trim().toLowerCase()`; senão `null`. Teste em `tests/shared/is.exact.catalog.identifier.test.ts`: um exato → ele; dois com o mesmo nome → null; nenhum → null; caixa diferente → exato; MCP canônico `io.github.upstash/context7` → exato.
- [X] T007 [P] [US3] Criar `src/cli/install/external/resolve.effective.trust.ts` com a função pura `resolveEffectiveTrust(manifest: SourcesManifest, sourceAlias: string, resolvedTrusted: boolean): boolean`, que usa o `trusted` de `manifest.sources[sourceAlias]` quando existe e `resolvedTrusted` caso contrário. Teste em `tests/shared/resolve.effective.trust.test.ts`: fonte existente `trusted: true` + resolvido false → true; inexistente + false → false; existente `trusted: false` + resolvido true → false.
- [X] T008 [P] [US3] Criar `src/cli/install/external/decide.allowed.llms.ts` com a função pura `decideAllowedLlms({ trusted, flags, interactive }): { allowedLlms: string[] } | { ask: true }`. Regras da tabela "Autorização" de contracts/cli.install.md: `flags['all-llms']==='true'` ou `flags.allLlms==='true'` → `['*']`; `flags.llms` → lista separada por vírgula; confiável → `['*']`; não confiável com TTY → `{ ask: true }`; não confiável sem TTY → `[]`. Teste em `tests/shared/decide.allowed.llms.test.ts`, um caso por linha da tabela.
- [X] T009 [US3] Em `src/cli/shared/select/select.catalog.result.ts`, aceitar `options?: { trustOf?; questionFn? }` (assinatura compatível com `CliInteraction.select` da T002) e acrescentar ` [trusted]`/` [untrusted]` à linha `n) <displayName> (<source>)`. Teste em `tests/cli/select.test.ts` com `questionFn` falso: as linhas mostram os rótulos; `0` devolve `null`; `2` devolve o segundo. Depende de T002.
- [X] T010 [US3] Em `src/cli/install/external/install.catalog.result.ts`, trocar o parâmetro `allowedLlms = ['*']` por `options: { flags?: Record<string,string>; interaction?: CliInteraction; envScope?: 'project' | 'global' }` (o `envScope` só é usado na T023). Depois do `provider.resolve`, calcular `trusted = resolveEffectiveTrust(manifest, resolved.sourceAlias, resolved.source.trusted ?? false)`, **antes** do `store.addSource`, e chamar `decideAllowedLlms` com `interactive = interaction.isInteractive()`. Em `{ ask: true }`, usar `interaction.confirm(\`Authorize ${kind}:${name} from an untrusted source for all configured agents? [y/N]\`)`: sim → `['*']`, não → `[]`. Com `[]` vindo de não confiável sem TTY, imprimir `Installed <kind>:<name> without agent access (untrusted source). Run "maia <skills|mcp> add <id> --all-llms" to authorize it.`. **Não** sobrescrever o `trusted` de uma fonte já existente no manifesto ao chamar `addSource`. Teste em `tests/cli/install.catalog.trust.test.ts`, com `fetch` falso de skill do GitHub (não confiável) e interação falsa: sem TTY → dependência com `allowedLlms: []` e a mensagem; `confirm` → true dá `['*']`; `flags['all-llms']` dá `['*']`; MCP do registry (confiável) dá `['*']` sem perguntar. Depende de T002, T007, T008.
- [X] T011 [US3] Em `src/cli/commands/skills/run.skills.cli.ts` (`add`/`install`):
  - usar `parseFlags(rest)` e pegar o alvo de `positional[0]`;
  - usar `interaction = context?.interaction ?? DEFAULT_INTERACTION`;
  - se `directGitHubResult` casar, instalar direto;
  - senão, buscar e aplicar `isExactCatalogIdentifier`:
    - exato → instalar;
    - não exato e `interaction.isInteractive()` → `interaction.select(results, { trustOf })`; cancelar não instala;
    - não exato e não interativo → lançar o erro `"<termo>" matches several catalog entries; rerun with an exact identifier:` seguido de uma linha `  <owner/repo@skill>` por candidato (montada de `result.install.repository` + `@` + `name`, ou `result.id`);
  - **remover** o laço que tenta o próximo candidato (research D6);
  - repassar `flags` e `interaction` para `installCatalogResult`; `find` usa `interaction.select` e também passa `flags`.

  Atualizar `tests/cli/skills.test.ts`:
  - o caso "falls back to the next catalog entry when the best match is stale" vira "fails without TTY on an ambiguous query and lists exact identifiers" (sem instalação);
  - os casos que usavam termo não exato passam a usar o identificador exato ou um único resultado exato (ver Notas de execução da T001);
  - caso novo: identificador exato não confiável sem TTY → instalado com `allowedLlms: []`.

  Depende de T006, T009, T010.
- [X] T012 [US3] Em `src/cli/commands/mcp/mcp.command.ts` (`add`/`install`): usar `parseFlags(args.slice(1))` e pegar a query de `positional.join(' ')`. Usar `context.interaction ?? DEFAULT_INTERACTION` e aplicar `isExactCatalogIdentifier` no lugar de `bestCatalogMatch`, com o mesmo fluxo da T011 (interativo → `interaction.select`; senão → erro com os nomes canônicos). `find` usa `interaction.select` e repassa `flags`. Atualizar os testes de `tests/cli/mcp.registry.test.ts` e `tests/cli/mcp.propagates.to.agents.test.ts` que usam termo não exato. Novo teste em `tests/cli/mcp.add.ambiguous.test.ts`: resultados `context7` e `context7fork` com query `context` sem TTY → erro com os dois nomes, nada instalado; query `context7` → instala. Remover `src/cli/install/external/best.catalog.match.ts` e `src/cli/commands/skills/ordered.by.best.match.ts` se ficarem sem uso (Princípio VII). Depende de T006, T010.

**Checkpoint**: US2 + US3 fecham os riscos de segurança do relato.

---

## Phase 5: User Story 1 - Claude Code (e todos os agentes) enxergam os MCPs do Maia (Priority: P1)

**Goal**: o proxy fica em `.mcp.json` no Claude, a entrada `maia` sai do arquivo legado,
**nenhum** agente recebe `cwd` absoluto, o `maia mcp-server` descobre a raiz sozinho e o bloco
das instruções reflete o registro (FR-001 a FR-005, FR-004a; research D1 a D4;
contracts/agent.registration.md).

**Independent Test**: quickstart §2.

- [X] T013 [US1] Em `src/agent/agents/contracts/agent.target.ts`:
  - adicionar `legacyConfigPaths?(cwd): string[]` ("só para migrar a entrada `maia`; nunca é destino");
  - adicionar `projectDir: 'omit' | 'workspace-variable'` (**obrigatório**; data-model: "sem caminho absoluto");
  - adicionar `nativeCommands?: readonly string[]`;
  - **remover** `buildEntry` (U1: um só mecanismo, ver T014);
  - atualizar o JSDoc de `configPaths` e `skillsDir`, porque a skill agora é pasta.

  Criar `src/agent/agents/contracts/agent.registration.ts` com `type AgentRegistration = { status: 'registered'; configPath: string } | { status: 'skipped'; reason: string }`. Esta tarefa só compila depois da T014, então **as duas vão no mesmo commit**.
- [X] T014 [US1] Em `src/agent/agents/registry/mcp.entry.ts`, `mcpEntry(agentId, projectDir)`: `'omit'` → sem chave `cwd`; `'workspace-variable'` → `cwd: '${workspaceFolder}'`. Nos 7 alvos de `src/agent/agents/registry/`, remover `buildEntry` e definir `projectDir` conforme research D3: `copilot` e `cursor` → `'workspace-variable'`; `claude`, `zed`, `codex`, `continue.agent` e `cline` → `'omit'`. No `claude.ts`: `configPaths → [join(cwd,'.mcp.json')]` e `legacyConfigPaths → [join(cwd,'.claude','claude_desktop_config.json')]`. `src/agent/agents/inject/collect.agent.mcp.entries.ts` e `src/agent/agents/profiles/write.agent.capability.profile.ts` passam a usar `mcpEntry(target.id, target.projectDir)`; o perfil grava `mcpServer` **sem** `cwd` (usa `'omit'`). Testes:
  - em `tests/tools/collect.agent.mcp.entries.test.ts`, para **cada um dos 7 agentes**, a entrada não contém o caminho do projeto nem nenhum caminho absoluto, e copilot/cursor têm `${workspaceFolder}`;
  - em `tests/cli/agent.test.ts`, `capabilities.json` sem `cwd`;
  - na config TOML do codex (`inject.toml.mcp.servers.ts`), a ausência de `cwd` não gera chave vazia.

  Commit único com a T013.
- [X] T015 [P] [US1] Criar `src/config/core/resolve.mcp.server.project.root.ts` com a função pura `resolveMcpServerProjectRoot({ env, cwd, find }): string | undefined`, que tenta (1) `env.CLAUDE_PROJECT_DIR` e depois (2) `cwd`, ambos via `find` (injetado; na borda é `findProjectRoot`). Teste em `tests/shared/resolve.mcp.server.project.root.test.ts`: variável apontando para um projeto vence `cwd`; variável fora de projeto cai para `cwd`; nenhum dos dois → `undefined`.
- [X] T016 [US1] Em `src/cli/index.ts`, quando `effectiveCommand === 'mcp-server'`, criar o store com `resolveMcpServerProjectRoot({ env: process.env, cwd: process.cwd(), find: findProjectRoot })`. Se o resultado for `undefined`, escrever no stderr `maia: no Maia project found from <cwd> (set the agent's working directory to the project or run "maia init <agent>" there).`, definir `process.exitCode = 1` e retornar, **sem** criar o `AgentCatalogStore`. Os outros comandos ficam como hoje. Teste em `tests/cli/mcp.server.project.root.test.ts` com `spawnSync`: (a) `cwd` numa subpasta de um projeto, com stdin `initialize` → resposta com `serverInfo`; (b) `cwd` fora de projeto e `CLAUDE_PROJECT_DIR=<projeto>` → responde; (c) fora de projeto, sem variável → exit 1, a mensagem, e o diretório continua sem `.maia/`. Depende de T015.
- [X] T017 [US1] Em `src/cli/commands/agent/configure.agents.ts`, depois de `injectAgentConfig`: para cada `target.legacyConfigPaths?.(cwd)` existente cujo `mcpServers` tenha `maia`, chamar `removeAgentMcpEntry(target, legacy, 'maia')` e imprimir `Moved the "maia" proxy from <relativo do legado> to <relativo do destino>.`. Nunca apagar o arquivo legado. Em `src/agent/agents/inject/read.json.ts`, um JSON inválido passa a lançar `Cannot update <arquivo>: invalid JSON (<mensagem>). Fix or remove it and run "maia i".`, sem escrever nada. Para o `claude`, depois de `Created Claude config`, imprimir `Claude Code asks you to approve project MCP servers from .mcp.json the first time; approve "maia".` (research D2). Testes em `tests/cli/agent.claude.config.test.ts`: (a) projeto vazio → `.mcp.json` com `maia` sem `cwd` e nenhum `.claude/claude_desktop_config.json` criado; (b) legado com `maia` e `other` → `.mcp.json` com `maia`, legado só com `other` e a mensagem "Moved"; (c) `.mcp.json` com outra entrada → preservada; (d) `.mcp.json` = `{` → erro "invalid JSON" e o conteúdo intacto. Depende de T014.
- [X] T018 [US1] Mudar as assinaturas para `renderAgentCapabilityBlock(store, target, registration: AgentRegistration)` em `src/cli/commands/agent/render.agent.capability.block.ts` e `writeAgentInstructions(store, target, registration)` em `write.agent.instructions.ts`, com as frases exatas da tabela "Bloco gerenciado" de contracts/agent.registration.md (caminho relativo à raiz). Em `configure.agents.ts`, passar `{ status: 'registered', configPath: finalPath }` após o registro. No ramo "local-only", em vez de `continue` antes das instruções, chamar `writeAgentInstructions(..., { status: 'skipped', reason: 'this project is local-only' })`. Testes em `tests/cli/agent.test.ts`: o bloco de um claude registrado cita `.mcp.json`; com `skipped`, ele contém "No MCP server is registered" e "_not registered_" e não contém "registered for this agent". Depende de T017.

**Checkpoint**: o item 1 do relato está resolvido para projetos novos e legados, em todos os
agentes.

---

## Phase 6: User Story 5 - Variáveis de MCP globais (Priority: P2)

**Goal**: `--env-g` grava no arquivo global, com a precedência processo > projeto > global, sem
placeholder que mascare o valor global, e `maia mcp i` funciona (FR-016 a FR-020; research D9,
D11; contracts/env.global.md).

**Independent Test**: quickstart §6, com `MAIA_CONFIG_HOME` temporário.

- [ ] T019 [P] [US5] Criar `src/config/core/resolve.global.config.dir.ts` com a função pura `resolveGlobalConfigDir(env: NodeJS.ProcessEnv, platform: NodeJS.Platform, home: string): string`, que devolve `env.MAIA_CONFIG_HOME` se definido; no win32, `path.join(env.APPDATA ?? path.join(home,'AppData','Roaming'), 'maia')`; senão `path.join(env.XDG_CONFIG_HOME || path.join(home,'.config'), 'maia')`. **Nunca** `~/.maia` (research D9). Criar `src/config/core/global.mcp.env.path.ts` com `globalMcpEnvPath(): string` (borda: `process.env`, `process.platform`, `os.homedir()`). Teste em `tests/shared/resolve.global.config.dir.test.ts`: os quatro ramos e um assert de que o resultado nunca termina em `/.maia`.
- [ ] T020 [P] [US5] Criar `src/config/core/merge.env.layers.ts` com a função pura `mergeEnvLayers(processEnv: Record<string,string|undefined>, project: Map<string,string>, global: Map<string,string>): Record<string,string>`. Ela devolve só as chaves a definir: o projeto contribui só valores **não vazios**, o global só chaves ainda sem valor não vazio, e nada sobrescreve um valor não vazio do processo. Teste em `tests/shared/merge.env.layers.test.ts`: processo vence; projeto vence o global; `X=` no projeto não mascara o global; vazio no processo é preenchido pelos arquivos.
- [ ] T021 [US5] Em `src/config/core/load.mcp.env.from.current.project.ts`: ler o projeto (se houver) e `globalMcpEnvPath()` com `parseEnvFile` (`src/cli/install/mcp-credentials/parse.env.file.ts`) e aplicar `mergeEnvLayers` em `process.env`. Se a leitura do global falhar (`EACCES` etc.), emitir `warning: cannot read <arquivo> (<código>); using project values only.` e seguir (achado C1). Remover o uso de `loadDotEnvFromFile` aqui, se ficar sem uso noutro lugar. Teste em `tests/cli/mcp.env.resolution.test.ts`: global com `X_TOKEN=g` e projeto com `X_TOKEN=` → `process.env.X_TOKEN === 'g'`; projeto `X_TOKEN=p` → `'p'`; global como **diretório** (força erro de leitura) → aviso e valor do projeto. Restaurar o `process.env` no `finally`. Depende de T019, T020.
- [ ] T022 [US5] Criar `src/cli/install/mcp-credentials/ensure.global.env.file.ts` com `ensureGlobalEnvFile(filePath): void`, que cria o diretório com `{ recursive: true, mode: 0o700 }` e o arquivo com `mode 0o600` se ausente. Em POSIX, se o arquivo existir com `(mode & 0o077) !== 0`, emitir `console.warn("warning: <arquivo> is readable by other users; run \"chmod 600 <arquivo>\".")` sem alterar nada. Teste em `tests/shared/ensure.global.env.file.test.ts` (pular a checagem de modo no win32): cria com 600/700; arquivo 644 existente gera o aviso e mantém 644.
- [ ] T023 [US5] Em `configure.mcp.credentials.from.result.ts`, aceitar `scope: 'project' | 'global' = 'project'`:
  - destino: `store.getPaths().mcpEnv` ou `globalMcpEnvPath()` (este depois de `ensureGlobalEnvFile`);
  - mensagem: a de contracts/env.global.md;
  - pular requisitos que tenham valor não vazio no global (FR-019);
  - com `scope:'global'` e sem requisitos, imprimir `--env-g: <nome> requires no credentials; nothing was written.`.

  Em `ensure.env.file.entries.ts`, aceitar `skipNames`. Em `ensure.mcp.env.file.entries.ts` e `ensure.lock.mcp.env.file.entries.ts`, passar as chaves com valor no global, para que nenhum placeholder `X=` seja criado no projeto. `installCatalogResult` repassa `options.envScope`.

  Testes em `tests/cli/mcp.credentials.global.test.ts`, com `MAIA_CONFIG_HOME` temporário:
  - `scope:'global'` grava no global e não cria a chave no projeto;
  - uma segunda instalação noutro projeto, com o global preenchido, não pede nem cria o placeholder;
  - `maia i` (`reinstallFromLock`) não cria `X_TOKEN=` no projeto.

  Depende de T010, T021, T022.
- [ ] T024 [US5] Em `src/cli/commands/mcp/mcp.command.ts`: aceitar `i` como `add`/`install`. Criar `src/cli/shared/flags/normalize.legacy.flags.ts` com a função pura `normalizeLegacyFlags(args)` (`-env-g` → `--env-g`; `--env-global` → `--env-g`) e aplicá-la antes de `parseFlags`. `add|i|install|find` repassam `envScope: flags['env-g']==='true' ? 'global' : 'project'`, e a query não inclui flags. Testes: `tests/shared/normalize.legacy.flags.test.ts`; `tests/cli/mcp.env.global.flag.test.ts` com `mcp i <exato> -env-g` → credenciais no global, e `mcp find <termo> --env-g` com `interaction.select` falso → idem. Depende de T012, T023.

**Checkpoint**: a funcionalidade nova está pronta.

---

## Phase 7: User Story 4 - Skill instalada com todos os arquivos (Priority: P2)

**Goal**: a skill é uma pasta da fonte até o agente, com integridade por arquivo e lock v3
(FR-011 a FR-015; research D8; contracts/skill.directory.md).

**Independent Test**: quickstart §5, com fixtures de GitHub (tree e raw), git local e
well-known.

- [ ] T025 [P] [US4] Criar `src/cli/shared/remote-skill/skill.files.ts` (`type SkillFiles = Array<{ path: string; content: Buffer }>`) e `validate.skill.files.ts` com a função pura `validateSkillFiles(name, files)`. Ela lança `Skill "<nome>" contains an unsafe path: <p>` para caminho absoluto, `..`, `\` ou vazio; `Skill "<nome>" was not found in …` se faltar `SKILL.md` (o chamador passa a url); e `Skill "<nome>" exceeds the size limit (<n> files, <m> MB)` com mais de **200** arquivos ou mais de **5 MB** no total. Devolve a lista ordenada por `path`. Teste em `tests/shared/validate.skill.files.test.ts`, um caso por regra mais o caso válido.
- [ ] T026 [P] [US4] Criar `src/agent/catalog/lock/hash.skill.files.ts` com as funções puras `hashSkillFiles(files: Array<{path; content}>): { files: Record<string,string>; artifactHash: string }` (cada arquivo `sha256:<hex>`; `artifactHash = "sha256:" + sha256(sorted.map(p => p + "\0" + hash + "\n").join(""))`) e `hashSkillDirectory(dir): …` (borda: lê recursivamente com caminhos POSIX e ignora symlinks). Teste em `tests/shared/hash.skill.files.test.ts`: ordem de entrada não altera o resultado; mudar um byte muda o hash daquele arquivo e o `artifactHash`; diretório e lista em memória dão o mesmo resultado.
- [ ] T027 [US4] Backend GitHub: `fetchGitHubSkill(source, name)` em `src/cli/shared/remote-skill/fetch.github.skill.ts` passa a devolver `SkillFiles | null`. Ele busca a árvore `git/trees/<ref>?recursive=1` uma vez, escolhe a pasta do `SKILL.md` (padrão `skills/<nome>/`, senão `selectSkillPath`), filtra os `blob` com o prefixo `<pasta>/`, rejeita `mode === '120000'` (symlink) com o erro de caminho inseguro e baixa cada blob por raw no `ref`. Se `truncated === true` e a pasta não estiver completa, lança `GitHub returned a truncated tree for <repo>; cannot install "<nome>" completely`. Ajustar `discover.github.skill.path.ts`/`github.tree.entry.ts` para expor `mode` e `truncated`. Teste em `tests/cli/remote.skill.test.ts`, com `fetch` falso de árvore contendo `skills/x/SKILL.md`, `skills/x/references/a.md`, `skills/x/scripts/b.sh` e `skills/y/SKILL.md` → só os três de `x`, com caminhos relativos; symlink → erro. Depende de T025.
- [ ] T028 [P] [US4] Backend git: `fetchGitSkill` em `fetch.git.skill.ts` devolve `SkillFiles | null` com `git ls-tree -r FETCH_HEAD -- <pasta>` (com modo, para rejeitar `120000`) e `git show FETCH_HEAD:<arquivo>` (Buffer) por arquivo, no mesmo clone temporário. Teste em `tests/cli/remote.skill.git.test.ts` com um repositório bare local criado no teste (`git init`, `commit`) contendo a pasta com subpasta → três arquivos. Depende de T025.
- [ ] T029 [P] [US4] Backend well-known: `fetchWellKnownSkill` em `fetch.well.known.skill.ts` tenta `<base>/.well-known/skills/index.json`. Se a entrada da skill tiver `files: string[]`, baixa cada um de `<base>/.well-known/skills/<nome>/<arquivo>`; senão, baixa só `SKILL.md` e emite `console.warn('warning: Only SKILL.md is available from <base>; supporting files were not published.')`. Mantém o fallback `agent-skills`. Teste em `tests/cli/remote.skill.well.known.test.ts`: com o `files` listado → todos; sem `index.json` → só `SKILL.md` + o aviso. Depende de T025.
- [ ] T030 [US4] Renomear `fetch.remote.skill.markdown.ts` para `fetch.remote.skill.files.ts`, atualizando os imports. A função devolve `SkillFiles | null` e chama `validateSkillFiles`. Em `src/cli/shared/workspace/materialize.remote.skill.ts`, gravar a árvore em `skills/<nome>/` com `assertMaterializedPath` + `writeMaterializedFile` (Buffer) para cada arquivo e, antes, remover os arquivos dessa pasta que não estão na nova lista (espelho limitado a `skills/<nome>/`). A função devolve o caminho da pasta. Em `src/cli/install/skill/install.skill.ts`, o `path` da dependência passa a ser `skills/<nome>` e o undo da rollback remove a pasta. Teste em `tests/cli/skills.test.ts`: instalação de skill com três arquivos → `.maia/skills/<nome>/` com os três e `maia.json` com `path: "skills/<nome>"`. Depende de T027, T028, T029.
- [ ] T031 [US4] Lock, parte 1 (descriptor e staleness):
  - em `src/agent/catalog/lock/package.descriptor.ts`, quando `path` for diretório, usar `hashSkillDirectory` e preencher `files` e `artifactHash`;
  - adicionar `files?: Record<string,string>` e `sourceName?: string` em `src/agent/catalog/types/lock/lock.package.ts`;
  - em `integrity/create.lock.integrity.payload.ts`, incluir `files` e `sourceName` **só quando presentes**, o que deixa o payload dos locks antigos idêntico;
  - **achado F1**: em `src/agent/catalog/lock/staleness/lock.comparable.projection.ts` (e no tipo `lock.comparable.projection.type.ts`), descartar também `files`, junto com `artifactHash`/`integrity`, atualizando o JSDoc.

  Testes:
  - em `tests/cli/lock.test.ts`, skill de pasta → `files` com 3 entradas, e um lock antigo de skill de arquivo continua com o mesmo `integrity` de antes (snapshot calculado antes da mudança);
  - em `tests/shared/is.lock.stale.test.ts`, dois locks que só diferem em `files` **não** são considerados desatualizados.

  Atualizar os testes listados nas Notas de execução (a). Depende de T026, T030.
- [ ] T032 [US4] Lock, parte 2 (versão): em `src/agent/catalog/lock/build.ts`, `lockfileVersion = manifestHasDirectorySkills ? 3 : hasToolkits ? 2 : 1`, onde `manifestHasDirectorySkills` é uma função pura nova em `src/agent/catalog/lock/schema/manifest.has.directory.skills.ts` (alguma dependência de skill com `path` que não termina em `SKILL.md`). A decisão **não** depende do disco (achado F1). Em `src/cli/commands/assert.lockfile.version.compatible.ts`, `SUPPORTED_LOCKFILE_VERSIONS = [1, 2, 3]`, com o JSDoc atualizado. Testes: `tests/shared/manifest.has.directory.skills.test.ts`; em `tests/shared/is.lockfile.version.compatible.test.ts`, 3 aceito; em `tests/cli/lock.test.ts`, `maia lock` num clone **sem** `.maia/skills` mantém `lockfileVersion 3`. Depende de T031.
- [ ] T033 [US4] Verify: em `src/agent/catalog/lock/verify/lock.verification.problem.ts`, adicionar os kinds `'missing-file' | 'changed-file' | 'unexpected-file'`. Em `verify.source.lock.ts`, para `path` diretório com `files`, comparar com `hashSkillDirectory` e gerar uma entrada por arquivo, com as mensagens de contracts/skill.directory.md (`File missing for skill:<n>: <p>`, `File changed …`, `Unexpected file …`). Pasta **sem** `files` no lock gera o `missing-artifact-hash` que já existe (achado U3). Pasta inteira ausente continua `missing-artifact`. Teste em `tests/cli/verify.test.ts`: remover, alterar e adicionar um arquivo → os três problemas com caminho; lock com pasta sem `files` → `missing-artifact-hash`. Depende de T031.
- [ ] T034 [US4] Em `src/cli/shared/workspace/reinstall.from.lock.ts`, uma skill remota com `path` de pasta (sem terminar em `SKILL.md`) é rematerializada com `materializeRemoteSkill(store, pkg.sourceName ?? pkg.name, source, pkg.path)`. O caso antigo de `SKILL.md` continua igual. Teste em `tests/cli/ci.test.ts`: num **clone limpo** (sem `.maia/skills`) com lock v3, `maia ci` **não** acusa lock desatualizado (cobre F1), restaura os três arquivos e o verify passa; lock v1 antigo continua passando. Depende de T032, T033.
- [ ] T035 [US4] Em `src/cli/commands/agent/materialize.agent.skills.ts`, para `pkg.path` diretório, espelhar a pasta inteira em `<skillsDir>/<nome>/`: copiar todos os arquivos e remover os que não existem na origem, só dentro dessa pasta. Para `path` de arquivo, manter o comportamento atual. Teste em `tests/cli/agent.test.ts`: `.claude/skills/<nome>/` com os três arquivos; remover um arquivo da origem e reconfigurar → ele some do destino. Depende de T030.
- [ ] T036 [US4] Migração (FR-014): em `src/cli/commands/install/install.command.ts` (só no `maia i` sem argumentos, antes do `buildLock`), para cada dependência de skill **remota** cujo `path` termine em `SKILL.md`: rematerializar com a fonte travada, atualizar `path` para `skills/<nome>` e imprimir `Upgraded skill:<nome> to include its supporting files.`. Funções puras novas: `src/agent/catalog/manifest/migrate/list.single.file.skills.ts` e `migrate.skill.path.to.directory.ts`. Teste em `tests/cli/skill.directory.migration.test.ts`: manifesto e lock antigos + `fetch` falso com três arquivos → depois de `maia i`, a pasta completa, `path` atualizado, `lockfileVersion 3` e a mensagem; skill local (registry) não migra. Depende de T032, T034.

**Checkpoint**: o item 2 do relato está resolvido.

---

## Phase 8: User Story 6 - Aviso de colisão e `--as` (Priority: P3)

**Goal**: avisar colisão com comandos nativos e instalar com outro nome (FR-021, FR-022;
research D10; contracts/cli.install.md).

**Independent Test**: quickstart §5, com `security-review` com e sem `--as`.

- [ ] T037 [US6] Em `src/agent/agents/registry/claude.ts`, adicionar `nativeCommands` com a lista do research D10. Criar `src/cli/commands/skills/find.native.command.collisions.ts` com a função pura `(name, targets) => Array<{ agentName }>`. Em `run.skills.cli.ts`, depois de instalar, para cada agente configurado com colisão, `console.warn('warning: skill "<n>" has the same name as the built-in /<n> command of <Agente>; install it under another name with --as <name>.')`. Testes: `tests/shared/find.native.command.collisions.test.ts`; em `tests/cli/skills.test.ts`, `security-review` com claude configurado → aviso, e sem agente → sem aviso. Depende de T011, T014.
- [ ] T038 [US6] `--as <nome>` em `skills add`:
  - validar com `^[A-Za-z0-9._-]+$` (erro `Invalid skill name "<nome>"`);
  - adicionar `sourceName?: string` em `src/agent/catalog/types/dependencies/skill.dependency.ts`;
  - `installSkill` recebe `{ name: <alias>, sourceName: <original> }`, busca a fonte pelo `sourceName` e grava em `skills/<alias>/`;
  - o lock propaga `sourceName` (a T031 já o inclui no payload quando presente), e `reinstallFromLock` usa `pkg.sourceName ?? pkg.name`;
  - a saída é `Installed skill:<alias> (from <original>)`.

  Teste em `tests/cli/skills.as.alias.test.ts`: `getsentry/skills@security-review --as sentry-security-review --all-llms` com `fetch` falso →
  - `.maia/skills/sentry-security-review/`;
  - `maia.json.skills['sentry-security-review'].sourceName === 'security-review'`;
  - `.claude/skills/sentry-security-review/`;
  - nenhum aviso de colisão;
  - `maia ci` em clone limpo restaura pelo `sourceName`.

  Depende de T037, T034.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T039 [P] Documentação: em `README.md` e `README.pt-BR.md`:
  - **Claude:** `.mcp.json`, migração do legado e aprovação na primeira sessão;
  - **Todos os agentes:** sem caminho absoluto, tabela de `cwd` por agente e descoberta da raiz pelo `maia mcp-server` (`CLAUDE_PROJECT_DIR` ou a pasta atual);
  - **Skills:** pasta completa, `--as` e aviso de colisão;
  - **Instalação por busca:** identificador exato, seletor, falha sem TTY e autorização de fonte não confiável;
  - **MCP:** `--env-g` (e `--env-global`), local do arquivo global, precedência e `maia mcp i`;
  - **`--help`** em qualquer subcomando.

  Em `SECURITY.md`, a nova política de confiança e consentimento e o arquivo global `0600`. Em `AGENT.md`, remover o follow-up "native skill materialization copies only `SKILL.md`" e adicionar os follow-ups do research D3 (o Cline lê só o arquivo global; o Continue atual prefere `.continue/mcpServers/*.yaml`). Só documentação.
- [ ] T040 Release 1.7.0: `npm version 1.7.0 --no-git-tag-version`. Entrada `## [1.7.0] - <data>` no `CHANGELOG.md`:
  - `### Fixed`: Claude `.mcp.json`; nenhum `cwd` absoluto em nenhum agente; `--help` instalava; skills sem arquivos de apoio; bloco do `CLAUDE.md` afirmava registro inexistente;
  - `### Security`: busca ambígua não instala sem escolha; fonte não confiável sem autorização automática; `mcp-server` fora de projeto falha em vez de criar `.maia/`;
  - `### Added`: `--env-g`, arquivo global, `maia mcp i`, `--as`, aviso de colisão;
  - `### Changed`: `maia.lock.json` v3 com skills de pasta, e um Maia antigo recusa esse lock.

  O teste é a suíte inteira, incluindo `maia.version.sync.test.ts`.
- [ ] T041 Validação final: executar `specs/009-agent-integration-fixes/quickstart.md` §1–§7 (com `MAIA_CONFIG_HOME` temporário e `fetch`/fixtures onde houver rede; a parte manual do Claude Code fica anotada como pendente para a pessoa mantenedora). Registrar o resultado em `checklists/requirements.md` (Notes) e marcar `[X]` nesta lista. Commitar `specs/009-agent-integration-fixes/`.

---

## Dependencies & Execution Order

### Entre fases e stories

```text
T001 → T002 ─┬──────────────────────────────── US3 (T006–T012)
             │
US2 (T003–T005) independente de T002
US1 (T013–T018) independente de US2/US3
US5 (T019–T024): T023 ← T010 (US3); T024 ← T012 (US3)
US4 (T025–T036) independente de US1/US2/US3/US5
US6 (T037–T038) ← T011 (US3), T014 (US1), T034 (US4)
Polish (T039–T041) ← tudo
```

### Dentro das stories

- US2: T003 ∥ T004 → T005.
- US3: T006 ∥ T007 ∥ T008; T002 → T009; (T002, T007, T008) → T010 → T011 → T012.
- US1: T013 + T014 (um commit) → T017 → T018; T015 → T016.
- US5: T019 ∥ T020 → T021; T022; (T010, T021, T022) → T023 → T024.
- US4: T025 ∥ T026; T025 → (T027, T028 ∥ T029) → T030 → T031 → T032 → (T033, T035) ; (T032, T033) → T034 → T036.
- US6: T037 → T038.

### Arquivos compartilhados (rodar em sequência)

- `run.skills.cli.ts`: T011 → T037 → T038
- `mcp.command.ts`: T012 → T024
- `install.catalog.result.ts`: T010 → T023
- `configure.agents.ts`: T017 → T018
- `claude.ts`: T014 → T037
- `src/cli/index.ts`: T005 → T016
- `lock.test.ts`: T031 → T032
- `install.command.ts`: T036

## Parallel Example

```text
# Depois de T002
US2: T003 ∥ T004        US3: T006 ∥ T007 ∥ T008        US1: T013+T014, T015
US5: T019 ∥ T020 ∥ T022  US4: T025 ∥ T026

# US4, depois de T025
T028 (git) ∥ T029 (well-known)   # T027 (GitHub) mexe em discover.github.skill.path.ts
```

## Implementation Strategy

- **MVP (segurança)**: T001–T005 (US2). Já impede que `--help` instale qualquer coisa.
- **Incremento 1**: US3 (T006–T012), que fecha a instalação implícita e a autorização
  automática.
- **Incremento 2**: US1 (T013–T018), com todos os agentes sem `cwd` absoluto e o Claude Code
  vendo os MCPs. Dá para lançar como 1.6.x se for urgente.
- **Incremento 3**: US5 (T019–T024), a funcionalidade nova.
- **Incremento 4**: US4 (T025–T036), skills completas (lock v3).
- **Incremento 5**: US6 (T037–T038).
- **Fechamento**: T039–T041 (docs, 1.7.0, validação).

Total: 41 tarefas (39 commits; a T001 não gera commit, e T013 e T014 compartilham um).

## Notas de execução

**T001 (2026-10-02)**: linha de base verde (358 testes; typecheck, architecture e naming OK).

- (a) Dependem de `path` de skill `…/SKILL.md` no manifesto/lock: `tests/cli/remote.skill.test.ts:51`,
  `tests/cli/install.test.ts:87`, `tests/cli/skills.test.ts:67`, `tests/cli/agent.test.ts:208-233`
  (manifesto manual com `path: skills/<n>/SKILL.md`, que continua válido como formato antigo).
  Asserções de existência de `skills/<n>/SKILL.md` continuam válidas com a pasta.
- (b) `add <termo não exato>` sem TTY: `tests/cli/skills.test.ts:155` e `:199` (`add sqlite`).
  `:118` (`add find-skills`) é exato se o catálogo falso devolver um único `find-skills`.
- **Achado extra**: `maia i skill <nome>` e `maia i mcp <nome>`
  (`src/cli/commands/install/install.named.capability.ts:44,97`) também usam `bestCatalogMatch`
  e instalam o primeiro resultado. Para cumprir o FR-007/SC-004, a escolha exato/ambíguo vira
  uma função compartilhada (`src/cli/install/external/choose.catalog.result.ts`), usada por
  `skills add`, `mcp add` e `maia i <skill|mcp> <nome>` (T011/T012). `installCatalogResult`
  recebe `flags`, e não mais o `allowedLlms` já resolvido.
