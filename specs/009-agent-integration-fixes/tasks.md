---

description: "Lista de tarefas para a implementação da feature"
---

# Tasks: Integração com o Claude Code, skills completas, instalação segura e variáveis globais

**Input**: Documentos de design em `/specs/009-agent-integration-fixes/`

**Prerequisites**: plan.md, spec.md, research.md (D1–D12), data-model.md,
contracts/agent.registration.md, contracts/cli.install.md, contracts/skill.directory.md,
contracts/env.global.md, quickstart.md

**Tests**: Obrigatórios (Constituição, Princípio I). Em cada tarefa: escreva o teste primeiro,
veja-o falhar, implemente e faça **um único commit com teste e implementação** (Princípio IV).
Nenhum teste usa rede, a home real ou TTY real:

- `fetch`: substituir `globalThis.fetch`, no estilo de `tests/cli/skills.test.ts`;
- git: repositório git local temporário;
- TTY e confirmação: injetáveis;
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

- [ ] T001 Linha de base: na branch `009-agent-integration-fixes`, rodar os gates acima e registrar que estão verdes (358 testes). Rodar `rtk grep -rn "SKILL.md'" tests` e `rtk grep -rn "runSkillsCli(\['add'\|mcpCommand(\['add'" tests` e anotar, no fim deste arquivo (seção "Notas de execução"), os testes que dependem de (a) `path` de skill terminando em `SKILL.md` no lock/manifesto e (b) `add <termo não exato>` sem TTY. Eles serão ajustados em T011, T012 e T029. Sem commit de código.

---

## Phase 2: Foundational

**⚠️** US3 e US5 dependem desta fase.

- [ ] T002 Criar `src/cli/shared/terminal/is.interactive.terminal.ts` exportando `isInteractiveTerminal(stdin = process.stdin, stdout = process.stdout): boolean` → `Boolean(stdin.isTTY && stdout.isTTY)` (JSDoc: "única definição de 'interativo' do CLI"). Trocar a checagem local em `src/cli/install/mcp-credentials/configure.mcp.credentials.from.result.ts` por essa função. Teste em `tests/shared/is.interactive.terminal.test.ts` com objetos `{ isTTY: true|false|undefined }` nas quatro combinações.

---

## Phase 3: User Story 2 - `--help` nunca instala nada (Priority: P1) 🎯 MVP

**Goal**: `--help`/`-h` em qualquer posição mostra a ajuda do comando e sai com 0, sem ler o
projeto, sem catálogo e sem rede (FR-006; research D5; contracts/cli.install.md "Ajuda").

**Independent Test**: quickstart §3, com todos os comandos com `--help`/`-h`: exit 0 e
nenhum arquivo alterado.

- [ ] T003 [P] [US2] Criar `src/cli/help/command.help.ts` exportando `COMMAND_HELP: Readonly<Record<string, readonly string[]>>`, que mapeia cada comando de `commandHandlers` (`src/cli/commands/command.handlers.ts`), incluindo os aliases (`i`, `install`, `rm`, `remove`, `ls`, `add`, …), para as linhas de uso que hoje estão em `src/cli/commands/help.ts`. Atualizar a linha de MCP para `maia mcp find <query> [--env-g]`, `maia mcp i|add|install <name> [--env-g] [--all-llms | --llms <ids>]` e a de skills para `maia skills add <skill-name|owner/repo@skill> [--as <name>] [--all-llms | --llms <ids>]`. Reescrever `help.ts` para imprimir a união ordenada sem duplicatas de `COMMAND_HELP` (fonte única). Teste em `tests/shared/command.help.test.ts`: todo id de `commandHandlers` tem entrada; `COMMAND_HELP.skills` contém a linha de `skills add` com `--as`; `helpCommand` imprime todas as linhas sem duplicata.
- [ ] T004 [P] [US2] Criar `src/cli/help/wants.help.ts` exportando a função pura `wantsHelp(args: readonly string[]): boolean`, que é `true` se `--help` ou `-h` aparece em qualquer posição. Teste em `tests/shared/wants.help.test.ts`: `['add','--help']`, `['-h']`, `['add','foo','--help']` → true; `['add','foo']`, `['add','--helper']`, `[]` → false.
- [ ] T005 [US2] Em `src/cli/index.ts`, antes de criar o `AgentCatalogStore`: se `wantsHelp(args)` (ou se `command` for `--help`/`-h`), imprimir `(COMMAND_HELP[effectiveCommand] ?? <ajuda geral>).join('\n')`, definir `process.exitCode = 0` e retornar, sem chamar nenhum handler. Teste em `tests/cli/help.flag.test.ts`, rodando `spawnSync(process.execPath, [cliEntry, ...args], { cwd: <tmp vazio>, env: { ...process.env, MAIA_CONFIG_HOME: <tmp> } })` para `skills add --help`, `skills add -h`, `skills find --help`, `mcp add --help`, `mcp i -h`, `toolkit i --help`, `i --help`, `--help`. Cada um dá status 0 e stdout com `maia `, e o diretório continua vazio (sem `maia.json` nem `.maia/`). Depende de T003, T004.

**Checkpoint**: a brecha do relato (item 3) está fechada.

---

## Phase 4: User Story 3 - Instalação por busca pede confirmação (Priority: P1)

**Goal**: termo ambíguo pede escolha com TTY e falha sem TTY. Identificador exato instala
direto. Fonte não confiável só é autorizada com consentimento (FR-007 a FR-010; research D6,
D7; contracts/cli.install.md).

**Independent Test**: quickstart §4, com catálogo simulado por `fetch` falso.

- [ ] T006 [P] [US3] Criar `src/cli/install/external/is.exact.catalog.identifier.ts` com a função pura `isExactCatalogIdentifier(query: string, results: CatalogSearchResult[]): CatalogSearchResult | null`. Retorna o resultado quando há **exatamente um** com `name.toLowerCase() === query.trim().toLowerCase()`; senão `null`. Teste em `tests/shared/is.exact.catalog.identifier.test.ts`: um exato → ele; dois com o mesmo nome → null; nenhum → null; caixa diferente → exato; MCP canônico `io.github.upstash/context7` → exato.
- [ ] T007 [P] [US3] Criar `src/cli/install/external/resolve.effective.trust.ts` com a função pura `resolveEffectiveTrust(manifest: SourcesManifest, sourceAlias: string, resolvedTrusted: boolean): boolean`, que usa o `trusted` de `manifest.sources[sourceAlias]` quando existe e `resolvedTrusted` caso contrário. Teste em `tests/shared/resolve.effective.trust.test.ts`: fonte existente `trusted: true` + resolvido false → true; inexistente + false → false; existente `trusted: false` + resolvido true → false.
- [ ] T008 [P] [US3] Criar `src/cli/install/external/decide.allowed.llms.ts` com a função pura `decideAllowedLlms({ trusted, flags, interactive }): { allowedLlms: string[] } | { ask: true }`. Regras da tabela "Autorização" de contracts/cli.install.md: `flags['all-llms']==='true'` ou `flags.allLlms==='true'` → `['*']`; `flags.llms` → lista separada por vírgula; confiável → `['*']`; não confiável com TTY → `{ ask: true }`; não confiável sem TTY → `[]`. Teste em `tests/shared/decide.allowed.llms.test.ts`, um caso por linha da tabela.
- [ ] T009 [US3] Em `src/cli/shared/select/select.catalog.result.ts`, aceitar `trustOf?: (result) => boolean` e acrescentar ` [trusted]`/` [untrusted]` à linha `n) <displayName> (<source>)`. Tornar a entrada injetável (`questionFn` opcional) para teste. Teste em `tests/cli/select.test.ts`: as linhas mostram os rótulos; `0` devolve `null`; `2` devolve o segundo.
- [ ] T010 [US3] Em `src/cli/install/external/install.catalog.result.ts`, trocar o parâmetro `allowedLlms = ['*']` por `options: { flags?: Record<string,string>; interactive?: boolean; confirm?: ConfirmFn }`. Depois do `provider.resolve`, calcular `trusted = resolveEffectiveTrust(manifest, resolved.sourceAlias, resolved.source.trusted ?? false)`, **antes** do `store.addSource`, e chamar `decideAllowedLlms`. Em `{ ask: true }`, usar `confirm(\`Authorize ${kind}:${name} from an untrusted source for all configured agents? [y/N]\`)`: sim → `['*']`, não → `[]`. Com `[]` vindo de não confiável sem TTY, imprimir `Installed <kind>:<name> without agent access (untrusted source). Run "maia <skills|mcp> add <id> --all-llms" to authorize it.`. **Não** sobrescrever o `trusted` de uma fonte já existente no manifesto ao chamar `addSource`. Teste em `tests/cli/install.catalog.trust.test.ts`, com `fetch` falso de skill do GitHub (não confiável): sem TTY → dependência com `allowedLlms: []` e a mensagem; `confirm` → true dá `['*']`; `flags['all-llms']` dá `['*']`; MCP do registry (confiável) dá `['*']` sem perguntar. Depende de T002, T007, T008.
- [ ] T011 [US3] Em `src/cli/commands/skills/run.skills.cli.ts` (`add`/`install`): usar `parseFlags(rest)`. O alvo vem de `positional[0]`. Se `directGitHubResult` casar, instalar direto. Senão, buscar e aplicar `isExactCatalogIdentifier`: se for exato, instalar; se não for exato e for interativo, chamar `selectCatalogResult(results, { trustOf })` e cancelar não instala; se não for exato e não for interativo, lançar o erro `"<termo>" matches several catalog entries; rerun with an exact identifier:` seguido de uma linha `  <owner/repo@skill>` por candidato (montada de `result.install.repository` + `@` + `name`, ou `result.id`). **Remover** o laço que tenta o próximo candidato (research D6). Repassar `flags` e `interactive` para `installCatalogResult`. `find` também passa `flags`. Atualizar `tests/cli/skills.test.ts`: o caso "falls back to the next catalog entry when the best match is stale" vira "fails without TTY on an ambiguous query and lists exact identifiers" (sem instalação), e os casos que usavam termo não exato passam a usar o identificador exato ou um único resultado exato (ver Notas de execução da T001). Novo caso: identificador exato não confiável sem TTY → instalado com `allowedLlms: []`. Depende de T006, T009, T010.
- [ ] T012 [US3] Em `src/cli/commands/mcp/mcp.command.ts` (`add`/`install`): usar `parseFlags(args.slice(1))`. A query vem de `positional.join(' ')`. Aplicar `isExactCatalogIdentifier` no lugar de `bestCatalogMatch` com o mesmo fluxo da T011 (TTY → seletor; sem TTY → erro com os nomes canônicos). `find` repassa `flags` para `installCatalogResult`. Atualizar os testes de `tests/cli/mcp.registry.test.ts` e `tests/cli/mcp.propagates.to.agents.test.ts` que usam termo não exato. Novo teste em `tests/cli/mcp.add.ambiguous.test.ts`: dois resultados `context7` e `context7fork` com query `context` sem TTY → erro com os dois nomes, nada instalado; query `context7` exata → instala. Remover `src/cli/install/external/best.catalog.match.ts` e `src/cli/commands/skills/ordered.by.best.match.ts` se ficarem sem uso (Princípio VII). Depende de T006, T010.

**Checkpoint**: US2 + US3 fecham os riscos de segurança do relato.

---

## Phase 5: User Story 1 - Claude Code enxerga os MCPs do Maia (Priority: P1)

**Goal**: o proxy fica em `.mcp.json`, a entrada `maia` sai do arquivo legado, não há `cwd`
absoluto no Claude e no Copilot, e o bloco das instruções reflete o registro (FR-001 a FR-005;
research D1 a D4; contracts/agent.registration.md).

**Independent Test**: quickstart §2.

- [ ] T013 [US1] Em `src/agent/agents/contracts/agent.target.ts`, adicionar os campos opcionais com JSDoc: `legacyConfigPaths?(cwd): string[]` ("só para migrar a entrada `maia`; nunca é destino"), `projectDir?: 'omit' | 'workspace-variable' | 'absolute'` (padrão `'absolute'`) e `nativeCommands?: readonly string[]`. Criar `src/agent/agents/contracts/agent.registration.ts` com `type AgentRegistration = { status: 'registered'; configPath: string } | { status: 'skipped'; reason: string }`. Atualizar o JSDoc de `configPaths` e `skillsDir` (a skill agora é pasta). Só tipos; o `typecheck` é o teste.
- [ ] T014 [US1] Em `src/agent/agents/registry/mcp.entry.ts`, `mcpEntry(cwd, agentId, projectDir = 'absolute')`: `'omit'` → sem chave `cwd`; `'workspace-variable'` → `cwd: '${workspaceFolder}'`; `'absolute'` → `cwd` (como hoje). Em `src/agent/agents/registry/claude.ts`: `projectDir: 'omit'`, `configPaths → [join(cwd,'.mcp.json')]`, `legacyConfigPaths → [join(cwd,'.claude','claude_desktop_config.json')]`, e `buildEntry: (cwd,id) => mcpEntry(cwd,id,'omit')`. Em `copilot.ts`: `projectDir: 'workspace-variable'`. Em `src/agent/agents/profiles/write.agent.capability.profile.ts`: gravar `mcpServer` **sem** `cwd` (remover a chave do objeto). Testes: em `tests/tools/collect.agent.mcp.entries.test.ts`, claude sem `cwd`, copilot com `${workspaceFolder}` e cursor com o caminho absoluto; em `tests/cli/agent.test.ts`, `capabilities.json` sem `cwd`. Depende de T013.
- [ ] T015 [US1] Em `src/cli/commands/agent/configure.agents.ts`, depois de `injectAgentConfig`: para cada `target.legacyConfigPaths?.(cwd)` existente cujo `mcpServers` tenha `maia`, chamar `removeAgentMcpEntry(target, legacy, 'maia')` e imprimir `Moved the "maia" proxy from <relativo do legado> to <relativo do destino>.`. Nunca apagar o arquivo legado. Envolver `readJson` (em `src/agent/agents/inject/read.json.ts`) para que um JSON inválido lance `Cannot update <arquivo>: invalid JSON (<mensagem>). Fix or remove it and run "maia i".`, sem escrever nada. Para o `claude`, depois de `Created Claude config`, imprimir `Claude Code asks you to approve project MCP servers from .mcp.json the first time; approve "maia".` (research D2). Testes em `tests/cli/agent.claude.config.test.ts`: (a) projeto vazio → `.mcp.json` com `maia` sem `cwd` e nenhum `.claude/claude_desktop_config.json` criado; (b) legado com `maia` e `other` → `.mcp.json` com `maia`, legado só com `other` e a mensagem "Moved"; (c) `.mcp.json` com outra entrada → preservada; (d) `.mcp.json` = `{` → erro "invalid JSON" e o conteúdo intacto. Depende de T014.
- [ ] T016 [US1] `renderAgentCapabilityBlock(store, target, registration: AgentRegistration)` em `src/cli/commands/agent/render.agent.capability.block.ts` e `writeAgentInstructions(store, target, registration)` em `write.agent.instructions.ts`, com as frases exatas da tabela "Bloco gerenciado" de contracts/agent.registration.md (caminho relativo à raiz). Em `configure.agents.ts`, passar `{ status: 'registered', configPath: finalPath }` após o registro. No ramo "local-only", em vez de `continue` antes das instruções, chamar `writeAgentInstructions(..., { status: 'skipped', reason: 'this project is local-only' })`. Testes em `tests/cli/agent.test.ts`: o bloco de um claude registrado cita `.mcp.json`; com registro `skipped`, ele contém "No MCP server is registered" e "_not registered_" e não contém "registered for this agent". Depende de T015.

**Checkpoint**: o item 1 do relato está resolvido para projetos novos e legados.

---

## Phase 6: User Story 5 - Variáveis de MCP globais (Priority: P2)

**Goal**: `--env-g` grava no arquivo global, com a precedência processo > projeto > global, sem
placeholder que mascare o valor global, e `maia mcp i` funciona (FR-016 a FR-020; research D9,
D11; contracts/env.global.md).

**Independent Test**: quickstart §6, com `MAIA_CONFIG_HOME` temporário.

- [ ] T017 [P] [US5] Criar `src/config/core/resolve.global.config.dir.ts` com a função pura `resolveGlobalConfigDir(env: NodeJS.ProcessEnv, platform: NodeJS.Platform, home: string): string`, que devolve `env.MAIA_CONFIG_HOME` se definido; no win32, `path.join(env.APPDATA ?? path.join(home,'AppData','Roaming'), 'maia')`; senão `path.join(env.XDG_CONFIG_HOME || path.join(home,'.config'), 'maia')`. **Nunca** `~/.maia` (research D9). Criar `src/config/core/global.mcp.env.path.ts` com `globalMcpEnvPath(): string` (borda: `process.env`, `process.platform`, `os.homedir()`). Teste em `tests/shared/resolve.global.config.dir.test.ts`: os quatro ramos e um assert de que o resultado nunca termina em `/.maia`.
- [ ] T018 [P] [US5] Criar `src/config/core/merge.env.layers.ts` com a função pura `mergeEnvLayers(processEnv: Record<string,string|undefined>, project: Map<string,string>, global: Map<string,string>): Record<string,string>`. Ela devolve só as chaves a definir: o projeto contribui só valores **não vazios**, o global só chaves ainda sem valor não vazio, e nada sobrescreve um valor não vazio do processo. Teste em `tests/shared/merge.env.layers.test.ts`: processo vence; projeto vence o global; `X=` no projeto não mascara o global; vazio no processo é preenchido pelos arquivos.
- [ ] T019 [US5] Em `src/config/core/load.mcp.env.from.current.project.ts`: ler o projeto (se houver) e `globalMcpEnvPath()` com `parseEnvFile` (`src/cli/install/mcp-credentials/parse.env.file.ts`) e aplicar `mergeEnvLayers` em `process.env`. Ele roda mesmo fora de projeto, carregando só o global. Remover o uso de `loadDotEnvFromFile` aqui, se ficar sem uso noutro lugar. Teste em `tests/cli/mcp.env.resolution.test.ts`: global com `X_TOKEN=g`, projeto com `X_TOKEN=` → `process.env.X_TOKEN === 'g'`; projeto `X_TOKEN=p` → `'p'`. Restaurar o `process.env` no `finally`. Depende de T017, T018.
- [ ] T020 [US5] Criar `src/cli/install/mcp-credentials/ensure.global.env.file.ts` com `ensureGlobalEnvFile(filePath): void`, que cria o diretório com `{ recursive: true, mode: 0o700 }` e o arquivo com `mode 0o600` se ausente. Em POSIX, se o arquivo existir com `(mode & 0o077) !== 0`, emitir `console.warn("warning: <arquivo> is readable by other users; run \"chmod 600 <arquivo>\".")` sem alterar nada. Teste em `tests/shared/ensure.global.env.file.test.ts` (pular a checagem de modo no win32): cria com 600/700; arquivo 644 existente gera o aviso e mantém 644.
- [ ] T021 [US5] Em `configure.mcp.credentials.from.result.ts`, aceitar `scope: 'project' | 'global' = 'project'`. O destino é `store.getPaths().mcpEnv` ou `globalMcpEnvPath()` (este depois de `ensureGlobalEnvFile`). A mensagem é a de contracts/env.global.md. Pular requisitos que tenham valor não vazio no global (FR-019). Com `scope:'global'` e sem requisitos, imprimir `--env-g: <nome> requires no credentials; nothing was written.`. Em `ensure.env.file.entries.ts`, aceitar `skipNames` e, em `ensure.mcp.env.file.entries.ts` e `ensure.lock.mcp.env.file.entries.ts`, passar as chaves com valor no global, para que nenhum placeholder `X=` seja criado no projeto. `installCatalogResult` repassa `options.envScope`. Testes em `tests/cli/mcp.credentials.global.test.ts` com `MAIA_CONFIG_HOME` temporário: `scope:'global'` grava no global e não cria a chave no projeto; uma segunda instalação noutro projeto com o global preenchido não pede nem cria o placeholder; `maia i` (`reinstallFromLock`) não cria `X_TOKEN=` no projeto. Depende de T019, T020, T010.
- [ ] T022 [US5] Em `src/cli/commands/mcp/mcp.command.ts`: aceitar `i` como `add`/`install`. Criar `src/cli/shared/flags/normalize.legacy.flags.ts` com a função pura `normalizeLegacyFlags(args)` (`-env-g` → `--env-g`; `--env-global` → `--env-g`) e aplicá-la antes de `parseFlags`. `add|i|install|find` repassam `envScope: flags['env-g']==='true' ? 'global' : 'project'`, e a query não inclui flags. Testes: `tests/shared/normalize.legacy.flags.test.ts`; `tests/cli/mcp.env.global.flag.test.ts` com `mcp i <exato> -env-g` → credenciais no global, e `mcp find <termo> --env-g` com seletor injetado → idem. Depende de T012, T021.

**Checkpoint**: a funcionalidade nova está pronta.

---

## Phase 7: User Story 4 - Skill instalada com todos os arquivos (Priority: P2)

**Goal**: a skill é uma pasta da fonte até o agente, com integridade por arquivo e lock v3
(FR-011 a FR-015; research D8; contracts/skill.directory.md).

**Independent Test**: quickstart §5, com fixtures de GitHub (tree e raw), git local e
well-known.

- [ ] T023 [P] [US4] Criar `src/cli/shared/remote-skill/skill.files.ts` (`type SkillFiles = Array<{ path: string; content: Buffer }>`) e `validate.skill.files.ts` com a função pura `validateSkillFiles(name, files)`. Ela lança `Skill "<nome>" contains an unsafe path: <p>` para caminho absoluto, `..`, `\` ou vazio; `Skill "<nome>" was not found in …` se faltar `SKILL.md` (o chamador passa a url); e `Skill "<nome>" exceeds the size limit (<n> files, <m> MB)` com mais de **200** arquivos ou mais de **5 MB** no total. Devolve a lista ordenada por `path`. Teste em `tests/shared/validate.skill.files.test.ts`, um caso por regra mais o caso válido.
- [ ] T024 [P] [US4] Criar `src/agent/catalog/lock/hash.skill.files.ts` com as funções puras `hashSkillFiles(files: Array<{path; content}>): { files: Record<string,string>; artifactHash: string }` (cada arquivo `sha256:<hex>`; `artifactHash = "sha256:" + sha256(sorted.map(p => p + "\0" + hash + "\n").join(""))`) e `hashSkillDirectory(dir): …` (borda: lê recursivamente com caminhos POSIX e ignora symlinks). Teste em `tests/shared/hash.skill.files.test.ts`: ordem de entrada não altera o resultado; mudar um byte muda o hash daquele arquivo e o `artifactHash`; diretório e lista em memória dão o mesmo resultado.
- [ ] T025 [US4] Backend GitHub: `fetchGitHubSkill(source, name)` em `src/cli/shared/remote-skill/fetch.github.skill.ts` passa a devolver `SkillFiles | null`. Ele busca a árvore `git/trees/<ref>?recursive=1` uma vez, escolhe a pasta do `SKILL.md` (padrão `skills/<nome>/`, senão `selectSkillPath`), filtra os `blob` com o prefixo `<pasta>/`, rejeita `mode === '120000'` (symlink) com o erro de caminho inseguro e baixa cada blob por raw no `ref`. Se `truncated === true` e a pasta não estiver completa, lança `GitHub returned a truncated tree for <repo>; cannot install "<nome>" completely`. Ajustar `discover.github.skill.path.ts`/`github.tree.entry.ts` para expor `mode` e `truncated`. Teste em `tests/cli/remote.skill.test.ts`, com `fetch` falso de árvore contendo `skills/x/SKILL.md`, `skills/x/references/a.md`, `skills/x/scripts/b.sh` e `skills/y/SKILL.md` → só os três de `x`, com caminhos relativos; symlink → erro. Depende de T023.
- [ ] T026 [P] [US4] Backend git: `fetchGitSkill` em `fetch.git.skill.ts` devolve `SkillFiles | null` com `git ls-tree -r FETCH_HEAD -- <pasta>` (com modo, para rejeitar `120000`) e `git show FETCH_HEAD:<arquivo>` (Buffer) por arquivo, no mesmo clone temporário. Teste em `tests/cli/remote.skill.git.test.ts` com um repositório bare local criado no teste (`git init`, `commit`) contendo a pasta com subpasta → três arquivos. Depende de T023.
- [ ] T027 [P] [US4] Backend well-known: `fetchWellKnownSkill` em `fetch.well.known.skill.ts` tenta `<base>/.well-known/skills/index.json`. Se a entrada da skill tiver `files: string[]`, baixa cada um de `<base>/.well-known/skills/<nome>/<arquivo>`; senão, baixa só `SKILL.md` e emite `console.warn('warning: Only SKILL.md is available from <base>; supporting files were not published.')`. Mantém o fallback `agent-skills`. Teste em `tests/cli/remote.skill.well.known.test.ts`: com o `files` listado → todos; sem `index.json` → só `SKILL.md` + o aviso. Depende de T023.
- [ ] T028 [US4] Em `fetch.remote.skill.markdown.ts` (renomear para `fetch.remote.skill.files.ts`, atualizando os imports), devolver `SkillFiles | null` e chamar `validateSkillFiles`. Em `src/cli/shared/workspace/materialize.remote.skill.ts`, gravar a árvore em `skills/<nome>/` com `assertMaterializedPath` + `writeMaterializedFile` (Buffer) para cada arquivo e, antes, remover os arquivos dessa pasta que não estão na nova lista (espelho limitado a `skills/<nome>/`). A função devolve o caminho da pasta. Em `src/cli/install/skill/install.skill.ts`, o `path` da dependência passa a ser `skills/<nome>` e o undo da rollback remove a pasta. Teste em `tests/cli/skills.test.ts`: instalação de skill com três arquivos → `.maia/skills/<nome>/` com os três e `maia.json` com `path: "skills/<nome>"`. Depende de T025, T026, T027.
- [ ] T029 [US4] Lock: em `src/agent/catalog/lock/package.descriptor.ts`, quando `path` for diretório, usar `hashSkillDirectory` e preencher `files` e `artifactHash`. Adicionar `files?: Record<string,string>` e `sourceName?: string` em `src/agent/catalog/types/lock/lock.package.ts`. Em `integrity/create.lock.integrity.payload.ts`, incluir `files` e `sourceName` **só quando presentes**, o que deixa o payload dos locks antigos idêntico. Em `build.ts`, `lockfileVersion = hasDirectorySkills ? 3 : hasToolkits ? 2 : 1`. Em `src/cli/commands/assert.lockfile.version.compatible.ts`, `SUPPORTED_LOCKFILE_VERSIONS = [1, 2, 3]`, com o JSDoc atualizado. Testes: em `tests/cli/lock.test.ts`, skill de pasta → `files` com 3 entradas e `lockfileVersion 3`; um lock antigo de skill de arquivo continua com o mesmo `integrity` de antes (snapshot do valor calculado antes da mudança); em `tests/shared/is.lockfile.version.compatible.test.ts`, 3 aceito. Atualizar os testes listados nas Notas de execução (a). Depende de T024, T028.
- [ ] T030 [US4] Verify: em `src/agent/catalog/lock/verify/lock.verification.problem.ts`, adicionar os kinds `'missing-file' | 'changed-file' | 'unexpected-file'`. Em `verify.source.lock.ts`, para `path` diretório com `files`, comparar com `hashSkillDirectory` e gerar uma entrada por arquivo, com as mensagens de contracts/skill.directory.md (`File missing for skill:<n>: <p>`, `File changed …`, `Unexpected file …`). Pasta inteira ausente continua `missing-artifact`. Teste em `tests/cli/verify.test.ts`: remover, alterar e adicionar um arquivo → os três problemas com caminho. Depende de T029.
- [ ] T031 [US4] Em `src/cli/shared/workspace/reinstall.from.lock.ts`, uma skill remota com `path` de pasta (sem terminar em `SKILL.md`) é rematerializada com `materializeRemoteSkill(store, pkg.sourceName ?? pkg.name, source, pkg.path)`. O caso antigo de `SKILL.md` continua igual. Teste em `tests/cli/ci.test.ts`: clone sem `.maia/skills` com lock v3 → `maia ci` restaura os três arquivos e o verify passa; lock v1 antigo continua passando. Depende de T029.
- [ ] T032 [US4] Em `src/cli/commands/agent/materialize.agent.skills.ts`, para `pkg.path` diretório, espelhar a pasta inteira em `<skillsDir>/<nome>/`: copiar todos os arquivos e remover os que não existem na origem, só dentro dessa pasta. Para `path` de arquivo, manter o comportamento atual. Teste em `tests/cli/agent.test.ts`: `.claude/skills/<nome>/` com os três arquivos; remover um arquivo da origem e reconfigurar → ele some do destino. Depende de T028.
- [ ] T033 [US4] Migração (FR-014): em `src/cli/commands/install/install.command.ts` (só no `maia i` sem argumentos, antes do `buildLock`), para cada dependência de skill **remota** cujo `path` termine em `SKILL.md`: rematerializar com a fonte travada, atualizar `path` para `skills/<nome>` e imprimir `Upgraded skill:<nome> to include its supporting files.`. Funções puras novas: `src/agent/catalog/manifest/migrate/list.single.file.skills.ts` e `migrate.skill.path.to.directory.ts`. Teste em `tests/cli/skill.directory.migration.test.ts`: manifesto e lock antigos + `fetch` falso com três arquivos → depois de `maia i`, a pasta completa, `path` atualizado, `lockfileVersion 3` e a mensagem; skill local (registry) não migra. Depende de T029, T031.

**Checkpoint**: o item 2 do relato está resolvido.

---

## Phase 8: User Story 6 - Aviso de colisão e `--as` (Priority: P3)

**Goal**: avisar colisão com comandos nativos e instalar com outro nome (FR-021, FR-022;
research D10; contracts/cli.install.md).

**Independent Test**: quickstart §5, com `security-review` com e sem `--as`.

- [ ] T034 [US6] Em `src/agent/agents/registry/claude.ts`, adicionar `nativeCommands` com a lista do research D10. Criar `src/cli/commands/skills/find.native.command.collisions.ts` com a função pura `(name, targets) => Array<{ agentName }>`. Em `run.skills.cli.ts`, depois de instalar, para cada agente configurado com colisão, `console.warn('warning: skill "<n>" has the same name as the built-in /<n> command of <Agente>; install it under another name with --as <name>.')`. Testes: `tests/shared/find.native.command.collisions.test.ts`; em `tests/cli/skills.test.ts`, `security-review` com claude configurado → aviso, e sem agente → sem aviso. Depende de T011, T013.
- [ ] T035 [US6] `--as <nome>` em `skills add`: validar com `^[A-Za-z0-9._-]+$` (erro `Invalid skill name "<nome>"`). Adicionar `sourceName?: string` na dependência de skill (`src/agent/catalog/types/dependencies/…`). `installSkill` recebe `{ name: <alias>, sourceName: <original> }`, busca a fonte pelo `sourceName` e grava em `skills/<alias>/`. O lock propaga `sourceName` (T029 já o inclui no payload quando presente), e `reinstallFromLock` usa `pkg.sourceName ?? pkg.name`. A saída é `Installed skill:<alias> (from <original>)`. Teste em `tests/cli/skills.as.alias.test.ts`: `getsentry/skills@security-review --as sentry-security-review --all-llms` com `fetch` falso → `.maia/skills/sentry-security-review/`, `maia.json.skills['sentry-security-review'].sourceName === 'security-review'`, `.claude/skills/sentry-security-review/` e nenhum aviso de colisão; `maia ci` em clone limpo restaura pelo `sourceName`. Depende de T034, T031.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T036 [P] Documentação: em `README.md` e `README.pt-BR.md`:
  - **Claude:** `.mcp.json`, migração do legado e aprovação na primeira sessão;
  - **Skills:** pasta completa, `--as` e aviso de colisão;
  - **Instalação por busca:** identificador exato, seletor, falha sem TTY e autorização de fonte não confiável;
  - **MCP:** `--env-g`, local do arquivo global, precedência e `maia mcp i`;
  - **`--help`** em qualquer subcomando.

  Em `SECURITY.md`, a nova política de confiança e consentimento e o arquivo global `0600`. Em `AGENT.md`, remover o follow-up "native skill materialization copies only `SKILL.md`" e adicionar "o `cwd` do proxy continua absoluto para cline/codex/continue/cursor/zed (research D3)". Só documentação.
- [ ] T037 Release 1.7.0: `npm version 1.7.0 --no-git-tag-version`. Entrada `## [1.7.0] - <data>` no `CHANGELOG.md`:
  - `### Fixed`: Claude `.mcp.json`; `--help` instalava; skills sem arquivos de apoio; bloco do `CLAUDE.md` afirmava registro inexistente;
  - `### Security`: busca ambígua não instala sem escolha; fonte não confiável sem autorização automática;
  - `### Added`: `--env-g`, arquivo global, `maia mcp i`, `--as`, aviso de colisão;
  - `### Changed`: `maia.lock.json` v3 com skills de pasta, e um Maia antigo recusa esse lock.

  O teste é a suíte inteira, incluindo `maia.version.sync.test.ts`.
- [ ] T038 Validação final: executar `specs/009-agent-integration-fixes/quickstart.md` §1–§7 (com `MAIA_CONFIG_HOME` temporário e `fetch`/fixtures onde houver rede; a parte manual do Claude Code fica anotada como pendente para a pessoa mantenedora). Registrar o resultado em `checklists/requirements.md` (Notes) e marcar `[X]` nesta lista. Commitar `specs/009-agent-integration-fixes/`.

---

## Dependencies & Execution Order

### Entre fases e stories

```text
T001 → T002 ─┬─────────────────────────────── US3 (T006–T012)
             │
US2 (T003–T005) independente de T002
US1 (T013–T016) independente de US2/US3
US5 (T017–T022): T021 ← T010 (US3); T022 ← T012 (US3)
US4 (T023–T033) independente de US1/US2/US3/US5
US6 (T034–T035) ← T011 (US3), T013 (US1), T031 (US4)
Polish (T036–T038) ← tudo
```

### Dentro das stories

- US2: T003 ∥ T004 → T005.
- US3: T006 ∥ T007 ∥ T008 → T009 → T010 → T011 → T012.
- US1: T013 → T014 → T015 → T016.
- US5: T017 ∥ T018 → T019; T020; (T019, T020, T010) → T021 → T022.
- US4: T023 ∥ T024; T023 → (T025, T026 ∥ T027) → T028 → T029 → (T030, T031, T032) → T033.
- US6: T034 → T035.

### Arquivos compartilhados (rodar em sequência)

- `run.skills.cli.ts`: T011 → T034 → T035
- `mcp.command.ts`: T012 → T022
- `install.catalog.result.ts`: T010 → T021
- `configure.agents.ts`: T015 → T016
- `claude.ts`: T014 → T034
- `install.command.ts`: T033

## Parallel Example

```text
# Depois de T002
US2: T003 ∥ T004          US3: T006 ∥ T007 ∥ T008          US1: T013
US5: T017 ∥ T018 ∥ T020    US4: T023 ∥ T024

# US4, depois de T023
T026 (git) ∥ T027 (well-known)   # T025 (GitHub) mexe em discover.github.skill.path.ts
```

## Implementation Strategy

- **MVP (segurança)**: T001–T005 (US2). Já impede que `--help` instale qualquer coisa.
- **Incremento 1**: US3 (T006–T012), que fecha a instalação implícita e a autorização
  automática.
- **Incremento 2**: US1 (T013–T016), com o Claude Code voltando a ver os MCPs. Dá para lançar
  como 1.6.x se for urgente.
- **Incremento 3**: US5 (T017–T022), a funcionalidade nova.
- **Incremento 4**: US4 (T023–T033), skills completas (lock v3).
- **Incremento 5**: US6 (T034–T035).
- **Fechamento**: T036–T038 (docs, 1.7.0, validação).

Total: 38 tarefas (37 com commit; a T001 não gera commit).

## Notas de execução

*(preenchido na T001)*
