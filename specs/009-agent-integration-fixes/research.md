# Research: Integração com o Claude Code, skills completas, instalação segura e variáveis globais

**Feature**: 009-agent-integration-fixes | **Date**: 2026-10-02

## Causas confirmadas no código

| # | Sintoma do relato | Causa no código |
|---|-------------------|-----------------|
| 1 | Proxy gravado em `.claude/claude_desktop_config.json` | `resolveConfigPath` (`src/agent/agents/inject/resolve.config.path.ts`) escolhe o **primeiro arquivo existente** entre `[.mcp.json, .claude/claude_desktop_config.json]`. Até o commit `8534ba5`, o alvo `claude` só conhecia `.claude/claude_desktop_config.json`, então projetos daquela época já têm esse arquivo. Com isso o Maia continua escrevendo nele e nunca cria o `.mcp.json`. |
| 1b | `cwd` absoluto | `mcpEntry(cwd, agentId)` (`src/agent/agents/registry/mcp.entry.ts`) é compartilhado pelos 7 agentes e sempre grava `cwd`. O perfil `.maia/agents/<id>/capabilities.json` grava o mesmo objeto (`write.agent.capability.profile.ts`). Esse perfil não é lido por nenhum código. |
| 1c | `CLAUDE.md` afirma "registered natively" | `renderAgentCapabilityBlock` escreve o texto fixo, sem receber o resultado do registro. Quando o projeto é "local-only", `configureAgents` dá `continue` antes de reescrever o bloco, e um bloco antigo fica desatualizado. |
| 2 | Só `SKILL.md` | Os três backends (`fetch.github.skill.ts`, `fetch.git.skill.ts`, `fetch.well.known.skill.ts`) devolvem **uma string** com o markdown. `materializeRemoteSkill` grava `skills/<nome>/SKILL.md`, e `materializeAgentSkills` copia só esse arquivo. O lock calcula `artifactHash` só quando `path` é arquivo (`package.descriptor.ts:80`), e `verifySourceLock` ignora diretórios (`if (!fileInfo.isFile()) continue`). |
| 3 | `--help` instala | `src/cli/index.ts` repassa `args` direto ao handler. `runSkillsCli` usa `rest[0]` como alvo e `orderedByBestMatch`, que tenta instalar os resultados em ordem. `mcpCommand` faz `args.slice(1).join(' ')`, e `bestCatalogMatch` devolve `results[0]` quando não há nome exato. Nenhum comando reconhece `--help`/`-h`. |
| 3b | `allowedLlms: ["*"]` em fonte não confiável | `installCatalogResult(store, result, allowedLlms = ['*'])`. Skills de `skills.sh`/GitHub/well-known sempre resolvem com `trusted: false`, e o MCP Registry com `trusted: true`. |
| 5 | Sem env global | Credenciais só em `<projeto>/.maia/mcp.env` (`resolve.catalog.paths.ts`). `loadDotEnvFromFile` só define chaves que **ainda não existem** em `process.env`, inclusive valores vazios. Um `X=` vazio no projeto mascara qualquer outra camada. |
| 5b | `maia mcp i` | `mcpCommand` só aceita `add`/`install`. |

## D1 — Claude Code: `.mcp.json` como único destino, com migração do legado

**Decision**:
- O alvo `claude` passa a ter `configPaths = [.mcp.json]` e um novo campo opcional
  `legacyConfigPaths = [.claude/claude_desktop_config.json]` em `AgentTarget`.
- Em `configureAgents`, depois de injetar no destino, para cada caminho legado em que exista a
  entrada `maia`: chamar `removeAgentMcpEntry(target, legacy, 'maia')`, que já existe, e
  imprimir `Moved the "maia" proxy from <legado> to <destino>.`. O arquivo legado nunca é
  apagado, mesmo que fique vazio (Edge Case).
- `.mcp.json` com JSON inválido: `readJson` hoje lança erro de parse. O plano garante uma
  mensagem `Cannot update <arquivo>: invalid JSON (<erro>). Fix or remove it and run "maia i".`
  e nenhuma escrita.

**Rationale**: o Claude Code lê `.mcp.json` do projeto. A pessoa usuária confirmou isso com o
contorno manual, e é o que o README já documenta. Manter o legado como candidato a destino é
justamente o defeito.

**Alternatives considered**: registrar nos dois arquivos. Rejeitado porque deixa lixo num
arquivo que nenhum agente do projeto lê. O Claude Desktop lê um arquivo global da máquina, e
o Maia não mexe em configs globais.

## D2 — Primeira execução de servidores de projeto no Claude Code

**Decision**: documentar no quickstart e na mensagem do `maia init claude` que o Claude Code
pede aprovação dos servidores de `.mcp.json` na primeira sessão. O Maia **não** altera
`~/.claude.json` nem configurações do usuário para pré-aprovar.

**Rationale**: a aprovação é uma salvaguarda do próprio agente. Pular essa etapa contrariaria o
princípio II e a política "não altera configs globais de agentes".

## D3 — Nenhum caminho absoluto, em todos os agentes (decisão de 2026-10-02)

A pessoa usuária decidiu que o FR-004 vale para **todos** os agentes. Pesquisa sobre como cada
agente inicia um servidor stdio do arquivo de projeto:

| Agente | Arquivo que o Maia escreve | Como o agente resolve a pasta | `cwd` gravado |
|--------|----------------------------|-------------------------------|---------------|
| `claude` | `.mcp.json` | Inicia na pasta de lançamento e define `CLAUDE_PROJECT_DIR` no ambiente do servidor ([docs Claude Code MCP](https://code.claude.com/docs/en/mcp)). `${CLAUDE_PROJECT_DIR}` **não** é expandido no próprio `.mcp.json` | omitido |
| `copilot` | `.vscode/mcp.json` | O VS Code expande `${workspaceFolder}` | `${workspaceFolder}` |
| `cursor` | `.cursor/mcp.json` | Expande `${workspaceFolder}` (pasta que contém `.cursor/mcp.json`) em command/args/env/cwd ([docs Cursor MCP](https://cursor.com/docs/mcp)) | `${workspaceFolder}` |
| `zed` | `.zed/settings.json` | Sempre inicia servidores de contexto na raiz do projeto ([zed#35354](https://github.com/zed-industries/zed/issues/35354)) | omitido |
| `codex` | `.codex/config.toml` | Config de projeto só vale em projeto confiável; o Codex sobe a partir da pasta atual até a raiz ([docs Codex MCP](https://developers.openai.com/codex/mcp)). O servidor herda a pasta atual da sessão, que fica dentro do projeto | omitido |
| `continue` | `.continue/config.json` | Sem expansão documentada; o servidor herda a pasta do workspace aberto | omitido |
| `cline` | `.cline/mcp.json` | O Cline lê **só** o global `cline_mcp_settings.json`; a PR que expandiria `${workspaceFolder}` foi fechada sem merge ([cline#2990](https://github.com/cline/cline/pull/2990)) | omitido |

**Decision**:
- `AgentTarget.projectDir: 'omit' | 'workspace-variable'` (**obrigatório** em todo alvo, sem
  valor padrão absoluto). `mcpEntry` deixa de receber `cwd` absoluto. `collectAgentMcpEntries`
  e `writeAgentCapabilityProfile` passam `target.projectDir`, e só existe esse mecanismo (achado
  U1 do analyze).
- **Descoberta da raiz no `maia mcp-server` (FR-004a)**: função pura
  `resolveMcpServerProjectRoot({ env, cwd, exists })`, nesta ordem:
  1. `env.CLAUDE_PROJECT_DIR`, se apontar para um projeto (raiz encontrada subindo dali);
  2. subir a partir de `cwd` (`findProjectRoot`, que já existe).

  Sem resultado, o comando `mcp-server` escreve no stderr `maia: no Maia project found from
  <cwd> (set the agent's working directory to the project or run "maia init <agent>" there).` e
  sai com 1, **sem** criar o `AgentCatalogStore` numa pasta qualquer. Hoje o `index.ts` usa
  `process.cwd()` como fallback, e para o `mcp-server` isso passa a ser erro.
- O perfil `capabilities.json` grava `mcpServer` sem `cwd`.
- **Limitações documentadas** (não bloqueiam o FR-004, só a eficácia do registro): o Cline não
  lê o arquivo de projeto; o Continue atual prefere `.continue/mcpServers/*.yaml` a
  `.continue/config.json`. Os dois ficam como follow-up no `AGENT.md`.

**Rationale**: o arquivo do projeto fica versionável em todos os agentes. Para os que expandem
variável de pasta, a pasta é explícita. Para os demais, a pasta de lançamento, ou a variável do
Claude, junto com a busca para cima já existente, encontram o projeto. E, se nada der certo, o
erro é explícito em vez de silencioso.

**Alternatives considered**:
- *MCP roots (`roots/list`)*: obsoleto a partir do protocolo 2026-07-28 ("new implementations
  should not adopt it"), e o servidor do Maia já fala a era moderna. Descartado.
- *`args: ["--project", "${CLAUDE_PROJECT_DIR}"]`*: o Claude Code não expande essa variável no
  `.mcp.json`. Descartado.
- *Manter `cwd` absoluto nos agentes não confirmados*: era o plano anterior, rejeitado pela
  pessoa usuária.

## D4 — Bloco de capacidades fiel ao registro

**Decision**:
- `writeAgentInstructions(store, target, registration)` recebe
  `{ status: 'registered', configPath } | { status: 'skipped', reason }`.
- `registered`: o texto passa a dizer "registered for this agent in `<caminho relativo>`".
- `skipped`, quando o projeto é local-only ou a escrita falhou: o bloco é reescrito dizendo
  que **nenhum** servidor foi registrado para o agente, com o motivo e o comando para resolver.
  O Maia não deixa mais um bloco antigo com afirmação falsa.

## D5 — `--help`/`-h` interceptado antes de qualquer handler

**Decision**:
- `src/cli/help/wants.help.ts` (puro): `args.includes('--help') || args.includes('-h')`.
- `src/cli/help/command.help.ts`: um mapa de comando para linhas de ajuda, derivado das linhas
  de `help.ts`. `help.ts` passa a usar esse mapa (fonte única).
- Em `src/cli/index.ts`, se `wantsHelp(args)` for verdadeiro, imprime `commandHelp(command)` e
  sai com exit 0, **antes** de instanciar o handler. A checagem fica antes da construção do
  `AgentCatalogStore`, então nenhuma leitura de projeto acontece.

**Rationale**: um único ponto cobre todos os subcomandos (FR-006) e funciona até para os
comandos que não usam `parseFlags`.

**Alternatives considered**: tratar `--help` em cada comando. Rejeitado porque cobertura
espalhada é exatamente o que falhou.

## D6 — Instalação por busca: exato instala, ambíguo pergunta, sem TTY falha

**Decision**:
- `isExactCatalogIdentifier(query, results)` (puro):
  - skill: casa `^owner/repo@skill$` (já tratado por `directGitHubResult`), **ou** existe
    exatamente um resultado cujo `name`, em minúsculas, é igual ao termo;
  - MCP: existe exatamente um resultado cujo `name` (nome canônico do registry, ex.
    `io.github.upstash/context7`) é igual ao termo.
- Não exato e interativo (`stdin.isTTY && stdout.isTTY`): `selectCatalogResult`, que já
  existe, passa a mostrar `[trusted]`/`[untrusted]` em cada linha. Cancelar (0) não instala.
- Não exato e sem TTY: erro `"<termo>" matches several catalog entries; rerun with an exact
  identifier:` seguido da lista `owner/repo@skill` ou nome canônico. Exit 1, nada instalado.
- `skills add` deixa de percorrer candidatos em sequência. Se o escolhido não estiver
  disponível na fonte, mostra o erro em vez de cair para o próximo.

- **Pontos de injeção para teste (achado U2)**: `CliContext` ganha o campo opcional
  `interaction?: { isInteractive(): boolean; select(results, opts): Promise<CatalogSearchResult |
  null>; confirm: ConfirmFn }`. O padrão vem de `src/cli/shared/terminal/default.interaction.ts`
  (`isInteractiveTerminal`, `selectCatalogResult`, `promptConfirm`). `runSkillsCli` e
  `mcpCommand` leem `context.interaction ?? defaultInteraction` e repassam a
  `installCatalogResult`.

**Rationale**: FR-007 a FR-009. Reaproveita o seletor interativo e o padrão de TTY dos
toolkits (`promptConfirm`).

## D7 — Autorização de fonte não confiável (Clarification B)

**Decision**:
- Confiança efetiva = `trusted` da fonte já existente no manifesto com o mesmo alias (escolha
  da pessoa via `maia source add --trusted true`), senão o `trusted` resolvido pelo provider.
- `--all-llms` ou `--llms a,b` em `skills add`/`mcp add`/`find`: usa o valor dado
  (`resolveAllowedLlms`, que já existe).
- Sem flag, fonte confiável: `['*']`, como hoje.
- Sem flag, fonte não confiável, com TTY: `promptConfirm("Authorize <kind>:<name> from an
  untrusted source for all configured agents? [y/N]")`. "Sim" vira `['*']`, "não" vira `[]`.
- Sem flag, fonte não confiável, sem TTY: `[]` e a mensagem `Installed <kind>:<name> without
  agent access (untrusted source). Run "maia <skills|mcp> add <id> --all-llms" to authorize
  it.`.
- Rodar `add` de novo com o mesmo identificador e `--all-llms` atualiza `allowedLlms` da
  dependência já instalada (é reinstalação idempotente).

**Verificado**: `[]` nega o acesso. `resolveAllowedLlms([])` devolve `[]` e
`canLlmAccessResource` exige que o agente esteja na lista. O payload de integridade normaliza
`[]` para `['*']` (`normalizeAccessList`), então `[]` e `['*']` geram o mesmo hash de
integridade. Isso é aceitável porque o campo `allowedLlms` em si é comparado pela staleness,
mas fica registrado como risco a avaliar no review.

## D8 — Skill como diretório

**Decision**:
- **Busca**: cada backend passa a devolver `SkillFiles = Array<{ path: string; content:
  Buffer }>`, com caminhos relativos à pasta do `SKILL.md`:
  - **GitHub**: a árvore recursiva (`git/trees/<commit>?recursive=1`) já é consultada na
    descoberta. Filtrar os `blob` com prefixo `<pasta>/` e baixar cada um por
    `raw.githubusercontent.com/<owner>/<repo>/<commit>/<arquivo>`. O caminho padrão
    `skills/<nome>/` também passa pela árvore para listar os irmãos.
  - **git genérico**: `git ls-tree -r --name-only FETCH_HEAD -- <pasta>` e `git show` de cada
    arquivo, no mesmo clone temporário.
  - **well-known**: o padrão de descoberta publica `/.well-known/skills/index.json`. Quando a
    entrada da skill lista `files`, baixar cada um; senão, só `SKILL.md`, com o aviso `Only
    SKILL.md is available from <url>; supporting files were not published.`. A verificação do
    formato exato do `index.json` fica para a implementação, com fixture.
- **Limites (FR-015)**: no máximo **200 arquivos** e **5 MB** no total por skill. Acima disso,
  falha com `Skill "<nome>" exceeds the size limit (<n> files, <m> MB)`. Caminhos com `..`,
  absolutos ou symlinks (`mode 120000` no git) são rejeitados.
- **Materialização**: grava em `.maia/skills/<nome>/` com `assertMaterializedPath` em cada
  arquivo. Antes, remove os arquivos da pasta que não estão na nova lista (espelho), sempre
  dentro de `skills/<nome>/`.
- **Manifesto e lock**: o `path` da dependência passa a ser `skills/<nome>` (pasta). O lock
  ganha o campo opcional `files: Record<caminho relativo, "sha256:…">`, e `artifactHash`
  passa a ser `sha256` da lista ordenada `"<caminho>\0<sha256>\n"`. `files` entra no payload
  de integridade **só quando presente**, o que mantém a integridade dos locks antigos.
- **`files` fora da comparação do `maia ci` (achado F1)**: `lockComparableProjection`
  (`src/agent/catalog/lock/staleness/lock.comparable.projection.ts`) hoje descarta
  `artifactHash` e `integrity` porque dependem do disco. `files` também depende do disco: num
  clone limpo, o lock gerado em memória pelo `maia ci` não teria `files` e o salvo teria, então
  todo `ci` acusaria lock desatualizado. Por isso `files` também é descartado nessa projeção.
- **Versão do lock**: `lockfileVersion: 3` quando o **manifesto** tem alguma dependência de
  skill com `path` de pasta (não terminado em `SKILL.md`). A decisão não depende do disco
  (achado F1): um `maia lock` antes de restaurar as skills não rebaixa a versão. É um superconjunto
  da v2, porque toolkits continuam permitidos. `SUPPORTED_LOCKFILE_VERSIONS = [1, 2, 3]`. Um
  Maia antigo recusa a v3 com a mensagem de compatibilidade que já existe, em vez de verificar
  errado.
- **Verify**: para `path` que é diretório com `files`, reporta `missing-file`, `changed-file`
  ou `unexpected-file` com o caminho. Diretório **sem** `files` no lock é reportado como
  `missing-artifact-hash`, igual ao caso de arquivo (achado U3). Assim um lock gerado antes da
  restauração não passa no verify sem checagem.
- **Agente**: `materializeAgentSkills` espelha a pasta inteira em `<skillsDir>/<nome>/`.
- **Migração (FR-014)**: no `maia i` sem argumentos, uma dependência de skill remota cujo
  `path` termina em `SKILL.md` é rematerializada como pasta, no mesmo commit da fonte já
  travado, e o `path` vira `skills/<nome>`. O `maia ci` com lock antigo continua restaurando
  o arquivo único, como hoje, até alguém rodar `maia i` e commitar o lock novo.

**Alternatives considered**: baixar o tarball do repositório inteiro. Rejeitado porque traz
conteúdo que não é da skill e pesa mais. Hash único sem `files` também foi descartado, porque
não diria **qual** arquivo divergiu (FR-012).

## D9 — Variáveis globais

**Decision**:
- **Local**: `$MAIA_CONFIG_HOME` se definido (testes e usuários avançados). Senão, em
  Linux/macOS, `${XDG_CONFIG_HOME:-~/.config}/maia/mcp.env`; no Windows,
  `%APPDATA%\maia\mcp.env`.
- **Não usar `~/.maia`**: `findProjectRoot` trata qualquer pasta com `.maia` como raiz de
  projeto. Criar `~/.maia` faria a home virar "projeto" para todo comando rodado fora de um
  projeto.
- **Permissões**: diretório criado com modo `0700`, arquivo `0600`. Em arquivo já existente
  com permissão mais aberta, o Maia avisa e não altera.
- **Escrita**: `configureMcpCredentialsFromResult(store, result, scope)`, com `scope` igual a
  `'project'` (padrão) ou `'global'`. Com `--env-g`, valores pedidos vão para o arquivo
  global. Variável que já tem valor no global não é pedida (FR-019). Sem TTY, o placeholder
  vazio vai para o arquivo do escopo escolhido.
- **Placeholders do projeto**: `ensureEnvFileEntries`, usado por instalação, `maia i` e
  `maia ci`, deixa de criar `X=` no projeto quando `X` tem valor não vazio no global.
- **Leitura em runtime**: `loadMcpEnvFromCurrentProject` passa a carregar em duas camadas.
  Primeiro o projeto, aplicando **só valores não vazios**; depois o global, preenchendo só
  chaves ainda ausentes ou vazias. O ambiente do processo continua com prioridade (nada já
  definido e não vazio é sobrescrito). Valor vazio exportado no processo conta como "não
  definido" para efeito de preencher a partir dos arquivos.
- **Arquivo global ilegível** (achado C1): erro de leitura (ex.: `EACCES`) vira
  `warning: cannot read <arquivo> (<código>); using project values only.` e o carregamento segue
  só com o projeto.
- **Flag**: `--env-g`, com `--env-global` como sinônimo longo, e `-env-g` normalizado para
  `--env-g` antes do parse, porque foi o que a pessoa escreveu. `mcp find` e `mcp add|i`
  passam a usar `parseFlags`, e a query deixa de incluir as flags.
- **Sem credenciais**: `--env-g` num MCP sem credenciais imprime `--env-g: <mcp> requires no
  credentials; nothing was written.`.

**Rationale**: XDG é o padrão de config por usuário no Linux, e o override facilita testes
sem tocar a home real.

## D10 — Colisão com comandos nativos e `--as`

**Decision**:
- `AgentTarget.nativeCommands?: readonly string[]`. Para `claude`, uma lista estática dos
  comandos de barra embutidos do Claude Code (`security-review`, `review`, `init`, `help`,
  `clear`, `compact`, `config`, `cost`, `doctor`, `memory`, `model`, `permissions`,
  `pr-comments`, `status`, `mcp`, `agents`, `hooks`, `resume`, `export`, `add-dir`,
  `context`, `usage`, `plugin`, `ide`, `login`, `logout`, `bug`, `upgrade`, `vim`,
  `terminal-setup`, `release-notes`, `rewind`, `todos`, `output-style`, `statusline`,
  `install-github-app`). O aviso é informativo (Assumption da spec).
- `--as <nome>` em `skills add`: o nome local (chave no manifesto, pasta, cópia no agente e
  bloco do `CLAUDE.md`) vira `<nome>`. A dependência ganha `sourceName: <nome original>`,
  usado na busca, e o campo vai para o lock e para o payload de integridade quando presente.
- O nome em `--as` é validado com `^[A-Za-z0-9._-]+$`, o mesmo padrão de `fetchRemoteSkillMarkdown`.

## D11 — Alias `maia mcp i`

**Decision**: `mcpCommand` aceita `i` como `add`/`install`. A linha de ajuda passa a ser
`maia mcp i|add|install <name>`.

## D12 — Versão e documentação

**Decision**: release **1.7.0**, porque é minor: novas funcionalidades (env global, `--as`,
alias) e lock v3. Atualizar o README (en/pt-BR) nas seções de Claude, skills, MCP e
variáveis, o `help.ts` (via mapa), o CHANGELOG, o `SECURITY.md` (instalação por busca,
confiança) e o `AGENT.md`. No `AGENT.md`, remover o follow-up "multi-file skills" e adicionar
os follow-ups do research D3: o Cline lê só o arquivo global, e o Continue atual prefere
`.continue/mcpServers/*.yaml`.
