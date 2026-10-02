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

## D3 — `cwd` sem caminho absoluto

**Decision**: `buildEntry` passa a receber o estilo de pasta do agente, por um novo campo
`projectDir` em `AgentTarget`:

| Agente | Valor em `cwd` | Por quê |
|--------|----------------|---------|
| `claude` | omitido | O Claude Code executa servidores de `.mcp.json` a partir da raiz do projeto, como no contorno validado |
| `copilot` | `${workspaceFolder}` | O VS Code expande essa variável em `.vscode/mcp.json` |
| `cline`, `codex`, `continue`, `cursor`, `zed` | caminho absoluto (como hoje) | Não confirmamos como cada um resolve a pasta; mudar às cegas pode quebrar o proxy. Fica como follow-up no `AGENT.md` |

O perfil `capabilities.json` passa a gravar `mcpServer` **sem** `cwd`, porque ele é só
informativo e nenhum código o lê.

**Rationale**: atende ao relato (Claude) e ao VS Code, e não arrisca os outros agentes. A
mudança de escopo do FR-004 está registrada na spec (Clarifications).

**Alternatives considered**: passar `--project <caminho>` em `args`. Rejeitado porque continua
absoluto.

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
- **Versão do lock**: `lockfileVersion: 3` quando algum pacote tem `files`. É um superconjunto
  da v2, porque toolkits continuam permitidos. `SUPPORTED_LOCKFILE_VERSIONS = [1, 2, 3]`. Um
  Maia antigo recusa a v3 com a mensagem de compatibilidade que já existe, em vez de verificar
  errado.
- **Verify**: para `path` que é diretório com `files`, reporta `missing-file`, `changed-file`
  ou `unexpected-file` com o caminho.
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
o follow-up do `cwd` dos outros agentes.
