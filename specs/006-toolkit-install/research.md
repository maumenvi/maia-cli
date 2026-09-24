# Research: Instalação de Toolkits

**Feature**: 006-toolkit-install | **Date**: 2026-09-24

Pesquisa da Fase 0. Cada decisão segue o formato Decision / Rationale / Alternatives.
Fatos sobre o Spec Kit foram verificados localmente (`specify` 1.0.9.dev0 instalado
nesta máquina) e na API de releases do GitHub (`github/spec-kit`, última release
estável `v1.0.11`, 2026-09-24).

---

## Decision 1 — Onde vive o catálogo de toolkits

**Decision**: catálogo embutido e tipado em código, em `src/agent/toolkits/catalog/`,
com uma entrada por arquivo (`speckit.ts`) e um índice (`toolkit.catalog.ts`). Cada
entrada é um objeto `ToolkitDefinition` puro (ver data-model.md) que descreve **como**
invocar o instalador nativo — nunca arquivos a materializar.

**Rationale**: a Clarification 5 fixou catálogo embutido e curado na v1 (FR-003,
FR-003a). Código tipado dá verificação em `typecheck`, é testável sem I/O e não abre
superfície para definições vindas de terceiros. Um arquivo por toolkit respeita o
Princípio V.

**Alternatives considered**:
- JSON em `data/toolkits/` (como `data/tools/`): perde tipagem das funções de
  construção de comando (argv depende de versão, escopo e agentes); rejeitado.
- Toolkits via `maia source add`: fora do escopo (Clarification 5).

---

## Decision 2 — Como o Spec Kit é instalado nativamente

**Decision**: o Maia só monta e executa comandos do próprio Spec Kit, sem shell
(`execFileSync`/`spawnSync` com argv, como `run.git.ts` já faz):

| Situação | Comando nativo |
|---|---|
| Pré-requisito | `uv --version` (e `uvx` no escopo projeto) |
| Escopo projeto (sem `-g`) | `uvx --from git+https://github.com/github/spec-kit.git@<tag> specify init --here --force --non-interactive --ignore-agent-tools --script <sh\|ps> --integration <primária>` |
| Escopo global (`-g`) — ferramenta | `uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@<tag>` |
| Escopo global — projeto | `specify init --here --force --non-interactive --ignore-agent-tools --script <sh\|ps> --integration <primária>` |
| Integrações adicionais | `[uvx --from … ] specify integration install <chave>` (uma por agente extra) |
| Versão global instalada | `specify --version` → `specify 1.0.11` |
| Versão no projeto | `.specify/init-options.json` → `speckit_version` |
| Desinstalar integração | `[uvx --from … ] specify integration uninstall <chave>` |
| Desinstalar ferramenta global (apenas informado) | `uv tool uninstall specify-cli` |

`--script` é `ps` no Windows e `sh` nos demais. `--ignore-agent-tools` evita que o
init falhe quando o CLI do agente (ex.: `claude`) não está no PATH da máquina de CI.

**Rationale**: `specify init --help` documenta `--non-interactive` como "fail instead
of hanging", exatamente o requisito do `maia ci` (US2.2). No escopo projeto, `uvx`
executa a ferramenta num ambiente efêmero — nada é instalado na máquina, o que é a
semântica correta de "sem `-g`". No escopo global, `uv tool install` coloca `specify`
no PATH (documentação oficial de instalação). `--force` no `uv tool install` permite
trocar de versão; `--force` no `init --here` é necessário porque o projeto nunca está
vazio (tem `maia.json`) — o init só é executado quando o toolkit **não** está presente
(FR-017), então não há edição do usuário a sobrescrever.

**Alternatives considered**:
- Baixar o zip da release e extrair: viola FR-006 (Maia materializando arquivos).
- `pipx`: não é o caminho documentado pelo Spec Kit; rejeitado.

---

## Decision 3 — Mapeamento de agentes Maia → integrações do Spec Kit

**Decision**: tabela de mapeamento na própria definição do toolkit (`speckit.ts`),
derivada de `specify integration list`:

| Agente Maia | Integração Spec Kit | Multi-install safe |
|---|---|---|
| `claude` | `claude` | sim |
| `copilot` | `copilot` | não |
| `cursor` | `cursor-agent` | sim |
| `zed` | `zed` | não |
| `cline` | `cline` | sim |
| `codex` | `codex` | sim |
| `continue` | — (sem suporte) | — |

Escolha da **primária** e das extras — revisada após o levantamento real de T002
(que **refutou** a hipótese anterior de "não multi-install safe como primária"):
o Spec Kit só instala integrações adicionais automaticamente quando **todas** as
integrações envolvidas são multi-install safe (`Installing multiple integrations is
only automatic when all involved integrations are declared multi-install safe`); com
uma não safe instalada, qualquer extra falha (a alternativa seria `--force`, que o
Maia não usa por contornar a proteção do próprio toolkit). Regra:

1. Separar agentes suportados em `safe` e `unsafe`, preservando a ordem do manifesto.
2. Se houver pelo menos um `safe`: primária = primeiro `safe`; extras = demais `safe`;
   todos os `unsafe` são pulados com warning `integration "<k>" cannot be combined
   with other integrations; skipped`.
3. Se só houver `unsafe`: primária = primeiro `unsafe`; demais `unsafe` pulados com o
   mesmo warning.

Isso atende o maior número de agentes (FR-008). Consequência: `claude` + `copilot`
resulta em `claude` apenas, com aviso para `copilot` (limitação do próprio Spec Kit).
Agentes sem integração geram aviso. Sem agentes configurados, o init roda sem
`--integration` (default do Spec Kit em modo não interativo: `copilot`) e o Maia
avisa que nenhum agente foi vinculado.

**Rationale**: reflete o comportamento verificado do Spec Kit v1.0.11; nunca usa
`--force` do toolkit; ordem do manifesto ⇒ escolha determinística (lock
reprodutível).

**Caminhos verificados (T002, Spec Kit v1.0.11, `--script sh`)**:

| Integração | Arquivos criados pelo init/install |
|---|---|
| (base) | `.specify/` (`init-options.json` com `speckit_version`, `integration.json`, `integrations/`, `memory/`, `scripts/`, `templates/`, `workflows/`) |
| `claude` | `.claude/skills/speckit-*/` |
| `copilot` | `.github/skills/speckit-*/` |
| `cursor-agent` | `.cursor/skills/speckit-*/` |
| `codex` | `.agents/skills/speckit-*/` |
| `zed` | `.agents/skills/speckit-*/` (mesmo diretório do `codex`) |
| `cline` | `.clinerules/workflows/speckit-*.md` |

Combinações verificadas: `claude` + `codex` + `cursor-agent` + `cline` ok; `copilot`
primária + qualquer extra → erro; `claude` primária + `copilot`/`zed` → erro.
`specify integration uninstall <k>` remove os arquivos da integração e deixa
`.specify/` no lugar (exit 0 para as quatro safe).

**Alternatives considered**: rodar `init` uma vez por agente — o segundo `init`
sobrescreveria o primeiro; rejeitado.

---

## Decision 4 — Resolução de versão ("última release estável")

**Decision**: sem `--version`, `GET https://api.github.com/repos/github/spec-kit/releases/latest`
(endpoint que já exclui drafts e pre-releases) com `createGitHubHeaders()` existente
(usa `GITHUB_TOKEN`/`GH_TOKEN` se houver). Com `--version X`, normaliza para a tag
`vX` e valida com `GET …/releases/tags/vX`; 404 ⇒ erro sem efeitos colaterais
(US1.8). A versão resolvida é gravada **exata** (`1.0.11`) no `maia.json` e no lock.

**Rationale**: a Clarification 2 exige versão exata no lock. Gravá-la também no
manifesto (estilo "save-exact") mantém `buildLockFromManifest` uma função pura do
manifesto — sem rede no caminho de `lock`/`ci`/staleness, restrição já estabelecida
pela feature 004 (Decision 4 daquela pesquisa). Isto refina FR-014 ("versão
solicitada, quando informada"): o manifesto sempre carrega a versão resolvida, o que é
um superconjunto compatível.

**Alternatives considered**:
- Manter `*` no manifesto e resolver em `maia lock`: `lock` passaria a depender de
  rede e o gate de staleness do `ci` (004) ficaria não determinístico; rejeitado.
- `specify self check`: só existe depois de instalado; rejeitado.

---

## Decision 5 — Comparação de versão instalada

**Decision**: normalizar removendo prefixo `v` e sufixos locais/dev
(`1.0.9.dev0` → `1.0.9`, `1.0.11+abc` → `1.0.11`) e comparar `major.minor.patch`.

**Rationale**: o `init-options.json` local registrou `1.0.9.dev0` para uma instalação
da série 1.0.9; comparar strings cruas faria `maia ci` reinstalar sempre (violando
FR-017/SC-006).

**Versão divergente (Clarification 6)**: em `maia i` e `maia ci`, estado `mismatch`
é **erro** — nunca reinstalação implícita, porque `specify init --force` sobrescreve
arquivos que o usuário edita (constituição, templates). Mensagem: `Toolkit <n> is at
<x> but <maia.json|maia.lock.json> requires <y>. Run "maia toolkit i <n> --version
<y>" to switch versions.` Troca de versão só pelo comando explícito, com confirmação
que avisa sobre sobrescrita.

**Alternatives considered**: comparação exata — reinstalação espúria; rejeitado.

---

## Decision 6 — Formato no manifesto e no lockfile, e compatibilidade

**Decision**:
- `maia.json` ganha a seção `toolkits: Record<string, ToolkitDependency>`
  (`{ version, scope }`), normalizada para `{}` quando ausente.
- `maia.lock.json` ganha `toolkits?: Record<string, LockToolkit>` fora de `packages`.
- `lockfileVersion` passa a **2 somente quando há toolkits**; sem toolkits continua
  **1**. O CLI passa a aceitar `{1, 2}`.
- `lockComparableProjection` inclui `toolkits`, então o gate de staleness da 004 cobre
  divergência manifesto × lock de toolkits (US2.3) sem código novo no `ci`.

**Rationale**: `packages` é verificado por hash de artefato (FR-019 proíbe hash para
toolkits) e é iterado por `reinstallFromLock`, `resolveAuthorizedPackages` e o MCP —
misturar toolkits ali vazaria para todos esses caminhos. O bump condicional garante
que um Maia antigo (que só aceita `1`) **falhe** diante de um lock com toolkits, em vez
de ignorá-los silenciosamente e reportar sucesso (FR-018); projetos sem toolkits não
sofrem nenhuma mudança de formato.

**Alternatives considered**:
- Bump incondicional para 2: quebraria todo lock existente em Maia antigo sem ganho;
  rejeitado.
- Manter 1 com campo opcional: Maia antigo ignoraria toolkits em `ci`; rejeitado.

---

## Decision 7 — Flags curtas `-g` e `-y`

**Decision**: estender `parseFlags` para reconhecer flags booleanas curtas de uma
letra (`-g` → `flags.global`, `-y` → `flags.yes`), com aliases longos `--global` e
`--yes`. Um mapa de aliases vive em arquivo próprio.

**Rationale**: hoje `parseFlags` trata `-g` como posicional, o que faria
`maia toolkit i speckit -g` tentar instalar um toolkit chamado `-g`. A mudança é
aditiva: nenhum comando existente usa argumentos iniciados por um único `-`.

**Alternatives considered**: tratar `-g` só dentro do comando toolkit — duplicaria
parsing; rejeitado.

---

## Decision 8 — Confirmação e execução não interativa

**Decision**: `ConfirmFn` injetável (padrão: `readline/promises` + checagem de
`process.stdin.isTTY`); sem TTY a resposta é "não". `maia toolkit i` usa
confirmação (pulável com `-y`); `maia toolkit rm` usa a mesma função para "apagar
arquivos?" (default "não"). `maia i`/`maia ci` nunca chamam `ConfirmFn`
(FR-010b).

**Rationale**: segue o padrão de prompts já usado em `select.catalog.result.ts` e
`prompt.for.agent.ids.ts`, e torna os testes determinísticos.

---

## Decision 9 — Executor de processos injetável

**Decision**: tipo `NativeRunner = (command: string, args: string[], options) =>
NativeRunResult` com implementação padrão baseada em `spawnSync` sem shell,
`stdio: 'inherit'` na instalação interativa (o usuário vê a saída do instalador) e
`pipe` em checagens de versão. Testes injetam um runner falso que grava argv e
simula efeitos no disco.

**Rationale**: testes não podem depender de `uv`/rede (Princípio I exige suíte
verde sempre). Nenhum `shell: true` — argv montado a partir de dados do catálogo e da
versão validada contra o formato `^\d+\.\d+\.\d+$` (Princípio II: nada de injeção de
comando via `--version`).

---

## Decision 10 — Rollback de instalação nativa

**Decision**: antes de executar o instalador, o Maia registra quais **caminhos
declarados pelo toolkit** (ex.: `.specify/`, `.claude/skills/speckit-*`) já existem.
Se o instalador falhar, apaga (via `assertPathAllowed`, `file-delete`) apenas os
caminhos declarados que **não existiam antes**, e não grava manifesto/lock. A
instalação global de ferramenta não é desfeita (fora do projeto) — o Maia informa o
comando de desinstalação.

**Rationale**: a 003 exige rollback explícito em install; o Maia não controla o
instalador de terceiros, mas controla o que registra e pode limpar o que o toolkit
declaradamente cria. Ver Complexity Tracking no plan.md.

**Alternatives considered**: snapshot completo da árvore do projeto — custo alto e
arriscado em projetos grandes; rejeitado.

---

## Decision 11 — Remoção

**Decision**: `maia toolkit rm <nome>` remove do manifesto e do lock (via
`withRollback`), lista os caminhos declarados existentes e pergunta se apaga. Com
"sim": executa a desinstalação nativa de cada integração (`specify integration
uninstall`, que o Spec Kit documenta como "safely preserving modified files") e em
seguida apaga os caminhos declarados restantes do projeto, cada um passando por
`assertPathAllowed`; caminhos bloqueados são preservados e reportados. A ferramenta
global nunca é desinstalada (Clarification 4); o comando nativo é exibido.

Revisado após `/speckit-analyze` (C2): **antes** de cada `specify integration
uninstall <k>`, todos os caminhos declarados daquela integração (`integrationPaths[k]`,
expandidos) passam por `assertPathAllowed(..., 'file-delete')`; se algum estiver
bloqueado, a desinstalação nativa daquela integração **não é executada**, seus
caminhos são preservados e reportados (FR-025). O mesmo vale para `projectPaths`
antes da exclusão direta.

**Rationale**: usa o procedimento nativo quando existe (FR-006) sem permitir que ele
contorne os guardrails (Princípio II): a decisão continua sendo do caminho, avaliada
pelo Maia antes de qualquer processo destrutivo.

---

## Decision 12 — Exposição no MCP do Maia

**Decision**: uma ferramenta embutida somente leitura `maia_toolkits` (entrada
opcional `{ name?: string }`) adicionada em `collectAllTools` com `origin:
'toolkit:catalog'` e tratada no `routeToolCall`. Retorna JSON com toolkits
disponíveis e instalados: nome, descrição, versão, escopo, caminhos, integrações,
link de documentação e o comando CLI de instalação. Não existe nenhuma ferramenta
MCP que execute instalador (FR-021, SC-005).

**Rationale**: é o mesmo ponto único pelo qual o agente já descobre skills/MCPs/tools
(US4). Metadado não sensível ⇒ exposto a todos os agentes, sem política de acesso.

---

## Decision 13 — Bloco de instruções dos agentes

**Decision**: `renderAgentCapabilityBlock` ganha a subseção `### Toolkits`, listando
cada toolkit instalado com versão, doc e a dica "detalhes via ferramenta MCP
`maia_toolkits`" (FR-022).

---

## Decision 14 — Guardrail antes de sobrescrita nativa (C2, FR-027)

**Decision**: quando `maia toolkit i` vai reexecutar o instalador sobre um toolkit já
presente (troca de versão via `--version`, ou adoção com versão diferente), todos os
caminhos declarados **existentes** passam por `assertPathAllowed(...,
'file-overwrite')` antes de pedir confirmação; um bloqueio aborta sem executar nada
(exit do `GuardrailBlockedError`). Instalação em projeto sem toolkit presente não
precisa dessa checagem (nada existe para sobrescrever). `maia i`/`ci` nunca
sobrescrevem (Decision 5).

**Rationale**: `specify init --force` é uma ação destrutiva executada por terceiros;
o Princípio II exige que ela seja bloqueada por guardrail, não pela boa vontade do
instalador.

---

## Decision 15 — Toolkits dentro do rollback do `ci` (M2)

**Decision**: em `maia ci`, `restoreToolkits` roda como passo do mesmo
`withRollback` que materializa skills/tools, **depois** delas; o `undo` do passo de
toolkits chama `rollbackNewToolkitPaths` (Decision 10). Falha de toolkit desfaz
também as skills/tools materializadas nesta execução.

**Rationale**: mantém a garantia de rollback do `ci` estabelecida na feature 004.

---

## Decision 16 — Nome MCP reservado (L4)

**Decision**: `maia_toolkits` é reservado; `collectAllTools` o coloca primeiro e
`collectLocalEntries` ignora (com aviso em stderr do servidor) qualquer skill/tool
com o mesmo nome; `maia i skill|tool maia_toolkits` é recusado.

---

## Decision 17 — Catálogo injetável até o lock (M1)

**Decision**: `CatalogStoreOptions` ganha `toolkitCatalog?: readonly
ToolkitDefinition[]` (default `TOOLKIT_CATALOG`), repassado por `store.buildLock()` a
`buildLockFromManifest`. Testes que usam toolkit falso constroem o store com esse
catálogo; `ToolkitIo.catalog` usa o mesmo valor.

---

## Toolkits candidatos (fora da v1)

Mantidos na spec como candidatos: OpenSpec, BMAD Method, Task Master AI, Agent OS.
Cada um entra por release futura adicionando um arquivo em
`src/agent/toolkits/catalog/` — a Decision 1 garante que nenhum fluxo muda.
