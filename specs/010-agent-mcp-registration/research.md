# Research: registro do proxy `maia` no Cursor, Cline, Continue e demais agentes

Pesquisa feita em 2026-10-02 contra a documentação oficial de cada agente e o código da
`develop` (merge `966f065`). Nenhum agente real foi executado nesta fase. Os itens marcados
como **a confirmar no agente real** entram no roteiro manual do [quickstart.md](./quickstart.md).

## D1 — Tabela por agente (FR-001)

| Agente | Arquivo que o agente lê (projeto) | Formato esperado | Pasta de início | O que o Maia grava hoje | Situação |
|--------|-----------------------------------|------------------|-----------------|-------------------------|----------|
| `claude` | `.mcp.json` | `mcpServers.<nome>` com `command`/`args` | pasta de lançamento; `CLAUDE_PROJECT_DIR` no ambiente | igual | ok (009) |
| `copilot` | `.vscode/mcp.json` | `servers.<nome>`; VS Code expande `${workspaceFolder}` em `cwd` | — | igual | ok (009) |
| `cursor` | `.cursor/mcp.json` | `mcpServers.<nome>` com `type: "stdio"`, `command`, `args`, `env`; variáveis expandidas em `command`, `args`, `env`, `url`, `headers` ([docs](https://cursor.com/docs/mcp)). `cwd` **não** é documentado | não documentada | `mcpServers.maia` com `type: "stdio"` e `env.MAIA_PROJECT_DIR=${workspaceFolder}` | implementado; cliente real ainda não testado |
| `continue` | `.continue/mcpServers/*.yaml` (também aceita JSON no mesmo formato de Claude/Cursor) | bloco com `name`, `version`, `schema: v1` e `mcpServers` como lista de `{ name, type, command, args, env }` ([docs](https://docs.continue.dev/customize/deep-dives/mcp)); `config.json` está marcado como deprecated | workspace aberto | `.continue/mcpServers/maia.yaml` com um servidor Maia | implementado; cliente real ainda não testado |
| `cline` | só global: `cline_mcp_settings.json` | `mcpServers.<nome>` com `command`, `args`, `env` (+ `disabled`, `autoApprove` opcionais) | fora do projeto (processo da extensão) | candidato global existente, entrada por projeto após consentimento | implementado; registro aparece em todas as janelas Cline |
| `zed` | `.zed/settings.json` (configurações de projeto) | `context_servers.<nome>` com `command`, `args`, `env` planos ([docs](https://zed.dev/docs/ai/mcp)) | raiz do projeto ([zed#35354](https://github.com/zed-industries/zed/issues/35354)) | `context_servers.maia` com campos planos | formato implementado; leitura em settings de projeto a confirmar no agente real |
| `codex` | `.codex/config.toml` (só em projeto confiável) | tabela `[mcp_servers.<nome>]` com `command`, `args`, `env`, `cwd` ([docs](https://developers.openai.com/codex/mcp)) | pasta atual da sessão | `[mcp_servers.maia]` com `command` e `args`; saída e instruções avisam sobre confiança | implementado; cliente real ainda não testado |

**Decision**: corrigir Cursor, Continue, Zed e Codex no formato documentado, com migração do
que o Maia gravou antes; Cline ganha registro global com confirmação (D3–D6).

**Rationale**: o contrato de cada agente vem da documentação oficial; quando ela for omissa
(Zed em settings de projeto), o roteiro manual decide.

**Alternatives considered**: manter os formatos e só documentar → não resolve a spec (SC-001).

## D2 — Como o servidor encontra o projeto: `MAIA_PROJECT_DIR`

O Cursor não documenta `cwd`, e o Cline inicia o servidor fora do projeto. Os dois aceitam
`env` (o Cursor expande `${workspaceFolder}` dentro de `env`).

**Decision**:
- `resolveMcpServerProjectRoot` passa a olhar, nesta ordem: `env.MAIA_PROJECT_DIR`,
  `env.CLAUDE_PROJECT_DIR`, depois subir a partir de `cwd`. Cada variável só vale se
  `findProjectRoot` achar um projeto a partir dela; senão passa para a próxima (uma variável
  não expandida, como o texto literal `${workspaceFolder}`, cai na busca por `cwd`).
- `AgentTarget.projectDir` ganha o valor `'workspace-env'`: grava
  `env: { MAIA_PROJECT_DIR: "${workspaceFolder}" }` em vez de `cwd`. O Cursor passa a usá-lo.
  O Copilot continua com `'workspace-variable'` (`cwd`), já validado na 009.
- O Cline (global, D3) grava `env: { MAIA_PROJECT_DIR: "<caminho absoluto>" }`: o arquivo
  global não é de projeto nem versionado (FR-008).

**Rationale**: um único mecanismo explícito, independente do agente, e que não quebra os
casos atuais (variáveis já existentes continuam valendo).

**Alternatives considered**:
- *Argumento `--project <dir>`*: obrigaria tratar o argumento no parser do `mcp-server` e
  aparece na lista de processos; `env` é o canal que os dois agentes documentam.
- *Manter `cwd` no Cursor*: não documentado; arriscar o mesmo erro silencioso que motivou a
  feature.

## D3 — Cline: onde fica o arquivo global

Fontes: [cline#11671](https://github.com/cline/cline/issues/11671) (o código lê
`CLINE_MCP_SETTINGS_PATH`, senão `<CLINE_DATA_DIR ou ~/.cline/data>/settings/cline_mcp_settings.json`,
para CLI e integrações) e guias de configuração da extensão VS Code (pasta `globalStorage`
da extensão `saoudrizwan.claude-dev`). Não está claro se toda versão da extensão VS Code já
usa `~/.cline`; versões antigas usam `globalStorage`.

**Decision**: função pura `listClineSettingsCandidates({ env, platform, home })` com, nesta
ordem e sem duplicatas:
1. `env.CLINE_MCP_SETTINGS_PATH`, se definido;
2. `<env.CLINE_DATA_DIR ou ~/.cline/data>/settings/cline_mcp_settings.json`;
3. `<pasta de dados do editor>/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   para os editores `Code`, `Code - Insiders`, `VSCodium`, `Cursor` e `Windsurf`, onde a pasta
   de dados é `~/.config/<editor>` (Linux), `~/Library/Application Support/<editor>` (macOS) e
   `%APPDATA%\<editor>` (Windows).

O Maia considera só os candidatos **que já existem** (FR spec, cenário 8: nunca cria pastas
da extensão). Se mais de um existir, todos aparecem na mesma confirmação e todos recebem a
entrada.

**Rationale**: cobre CLI, JetBrains e as instalações VS Code mais comuns sem adivinhar qual
está ativa; arquivo inexistente = Cline nunca rodou ali.

**Alternatives considered**: perguntar o caminho à pessoa → atrito sem ganho; só `~/.cline`
→ perde versões da extensão que ainda usam `globalStorage`.

## D4 — Cline: formato e nome da entrada

**Decision**:
- Chave: `maia-<slug do nome da pasta>-<8 primeiros hex do sha256 do caminho absoluto>`,
  ex.: `maia-maia-cli-1a2b3c4d`. Estável para a mesma pasta, distinta entre projetos.
- Valor: `{ "command": "maia", "args": ["mcp-server", "--agent", "cline"], "env": { "MAIA_PROJECT_DIR": "<raiz>" } }`.
  Campos que o Cline adicionar depois (`disabled`, `autoApprove`, `timeout`) são preservados
  numa atualização: o Maia só sobrescreve `command`, `args` e `env.MAIA_PROJECT_DIR`.
- "Entrada do Maia" = `command === "maia"`, `args[0] === "mcp-server"` e
  `env.MAIA_PROJECT_DIR` definido. "Entrada órfã" = entrada do Maia cuja pasta não existe mais.
  Ao registrar, as órfãs são listadas na mesma confirmação e removidas se a pessoa aceitar.
- Escrita: reler o arquivo imediatamente antes de gravar, alterar só as chaves do Maia,
  gravar em arquivo temporário na mesma pasta e renomear (troca atômica). JSON inválido →
  não grava (FR-009), mensagem igual à de `readJson`.

**Limitação documentada**: o Cline não tem configuração por workspace; um servidor registrado
aparece em todas as janelas do Cline. Por isso a chave carrega o nome do projeto, e o README
explica como desativar (`disabled: true`) no próprio Cline.

**Alternatives considered**: chave única `maia` → o segundo projeto sobrescreveria o
primeiro (viola cenário 4); identificar projeto por id gravado no `maia.json` → exigiria
migrar todos os manifestos por um caso só do Cline.

## D5 — Cline: quando perguntar

`configureAgents` é assíncrona e chamada por `restoreConfiguredAgents` em fluxos como `mcp
add`, `i`, `ci`, `remove`, `skills` e `toolkit`. Perguntar sobre um arquivo global a cada
`maia mcp add` seria intrusivo e repetiria a pergunta depois de uma recusa; a entrada global
também não muda quando capacidades mudam (o proxy agrega tudo).

**Decision**:
- `configureAgents` é assíncrona e, para o Cline, **só lê por padrão**: calcula a situação do
  registro (`registered` se algum candidato existente tem a entrada atual do projeto;
  `pending` caso contrário) e escreve o bloco de instruções e a saída de acordo.
- `offerClineGlobalRegistration` recebe o `CliInteraction` injetável e só é habilitada por
  `maia init` e `maia agent add` quando `cline` está entre os agentes pedidos. Operações de
  restauração, como `maia mcp add`, nunca passam essa permissão. Sem TTY, projeto local-only,
  recusa, JSON inválido ou nenhum candidato → nada é gravado; a situação fica `pending`.
- A confirmação usa o `CliInteraction.confirm` existente (injetável nos testes; padrão
  "não"; sem TTY sempre "não").

**Rationale**: consentimento explícito num comando de configuração de agente, nunca como
efeito colateral das operações comuns de instalação e restauração.

**Alternatives considered**: perguntar em todos os fluxos de restauração → intrusivo e viola
FR-006; gravar o global sem confirmação explícita → também viola FR-006.

## D6 — Situação do registro no bloco e na saída (FR-007)

**Decision**: `AgentRegistration` ganha um terceiro estado e uma nota:

```ts
| { status: 'registered'; configPath: string; note?: string }
| { status: 'skipped'; reason: string }
| { status: 'pending'; reason: string; manualStep: string }
```

- `pending` (Cline): o bloco diz que nenhum MCP está registrado ainda, mostra o arquivo a
  editar e a entrada JSON exata, e indica `maia agent add cline` para o Maia gravar. O caminho
  do projeto no bloco é substituído por `<absolute path of this project>`.
- `note` (Codex): `AgentTarget.registrationNote` = aviso de projeto confiável; aparece no bloco
  e na saída sempre que o registro é escrito.
- `registered` do Cline aponta para o arquivo global (caminho exibido com `~` no lugar da home,
  para não gravar o caminho absoluto da máquina no arquivo de instruções do projeto).

**Rationale**: o agente lê esse texto e procura as ferramentas prometidas; a 009 já fixou
"só afirmar o que aconteceu".

## D7 — `maia agent rm <id...>` (FR-012, FR-006b)

Não existe hoje comando para tirar um agente do projeto (`saveSelectedAgents` só acrescenta).

**Decision**: nova ação em `agent.command.ts` (`rm`/`remove`), com efeitos:
1. tira o agente de `maia.json` (`store.removeSelectedAgents`);
2. remove a entrada `maia` do arquivo de config do projeto no formato do alvo (JSON, Zed,
   TOML) ou apaga `.continue/mcpServers/maia.yaml`, que é do Maia por inteiro;
3. remove o bloco gerenciado do arquivo de instruções (`removeMarkedBlock`, pura); o arquivo
   fica, mesmo vazio, porque pode ter sido criado pela pessoa;
4. remove `.maia/agents/<id>/`;
5. para o Cline, oferece (mesma confirmação de D5) remover a entrada do projeto de cada
   candidato global onde ela exista;
6. não apaga cópias de skills na pasta nativa; a saída lista a pasta para remoção manual.

**Rationale**: o cenário 6 da US3 exige um gatilho de remoção; um comando explícito é o
único gatilho seguro (editar `maia.json` à mão não passa pelo Maia).

**Alternatives considered**: `enabled: false` no `maia.json` como remoção → semântica
diferente (desativar ≠ remover) e não tem comando hoje.

## D8 — Migração de registros legados (FR-004, FR-005)

Hoje `legacyConfigPaths` só funciona quando o formato do legado é o mesmo do alvo (caso do
Claude). Os novos legados mudam de chave (Cursor), de arquivo e formato (Continue) ou de
lugar (Cline).

**Decision**: substituir `legacyConfigPaths(cwd): string[]` por
`legacyProxyLocations(cwd): LegacyProxyLocation[]`, onde
`LegacyProxyLocation = { path: string; format: 'mcp-servers' | 'servers' | 'zed-settings' | 'toml-mcp-servers' }`.

| Alvo | Locais legados |
|------|----------------|
| `claude` | `.claude/claude_desktop_config.json` (`mcp-servers`) |
| `cursor` | `.cursor/mcp.json` (`servers`) — o mesmo arquivo, outra chave |
| `continue` | `.continue/config.json` (`mcp-servers`) |
| `cline` | `.cline/mcp.json` (`servers`) |

Fluxo em `configureAgents`, depois de gravar o destino: para cada local legado com entrada
`maia`, remover só essa entrada (função pura `removeProxyEntry(data, format)` + leitura/
escrita na borda) e imprimir `Moved the "maia" proxy from <origem> to <destino>.` (ou, no
Cline, `Removed the "maia" proxy from .cline/mcp.json: Cline reads only its global settings.`).
O arquivo legado nunca é apagado, mesmo que fique só com `{ "mcpServers": {} }`.

Zed e Codex não mudam de arquivo: a reescrita da entrada `maia` no formato novo já substitui
a forma antiga (a chave é a mesma), sem mensagem de migração extra além de `Updated`.

**Idempotência**: um segundo run não encontra entrada legada e não imprime nada novo; os
writers só gravam quando o conteúdo serializado muda (`InjectResult.changed`), e a saída usa
`No change in` nesse caso.

## D9 — Formatos de escrita

**Decision**:
- `AgentConfigFormat` ganha `'continue-mcp-block'`: o Maia gera o arquivo inteiro com
  serialização YAML própria e pura (`renderContinueMcpBlock`). Strings saem entre aspas
  duplas com escape JSON, que é YAML válido; nenhuma dependência nova.
  ```yaml
  name: Maia
  version: 0.0.1
  schema: v1
  mcpServers:
    - name: maia
      type: stdio
      command: "maia"
      args:
        - "mcp-server"
        - "--agent"
        - "continue"
  ```
- Cursor: `configFormat: 'mcp-servers'`, `projectDir: 'workspace-env'`, `stdioType: true`
  (novo campo do alvo: grava `type: "stdio"`, exigido pela doc do Cursor).
- Zed: `injectZedSettings` passa a gravar `{ command, args, env? }` planos.
- Codex: `injectTomlMcpServers` passa a gravar a tabela padrão `[mcp_servers.maia]` (com
  `env` como tabela inline quando houver valores) e a remover tanto a forma inline
  antiga (`maia = { … }` sob `[mcp_servers]`) quanto uma tabela `[mcp_servers.maia]`
  existente antes de reescrever. Outras tabelas e chaves do arquivo ficam intactas.
- Cline: formato `mcp-servers` aplicado ao arquivo global (D4).

**Alternatives considered**: JSON em `.continue/mcpServers/maia.json` (aceito pelo
Continue) → evita YAML, mas a doc trata JSON como compatibilidade com outras ferramentas e
YAML como formato nativo; o YAML gerado é fixo e pequeno.

## D10 — Testes de contrato por agente (FR-010)

**Decision**: `tests/agents/contract/<id>.registration.contract.test.ts`, um por agente, cada
um rodando `maia init <id>` num projeto temporário (home e variáveis do Cline apontadas para
pastas temporárias) e comparando o arquivo gerado com o esperado **literal** (objeto ou texto),
mais a verificação comum `assertNoAbsolutePath(conteúdo, projectRoot, home)`. Cada teste cita
no comentário do arquivo a URL da documentação da tabela D1. Casos de migração ficam em
testes próprios por agente (`<id>.legacy.migration.test.ts`).

**Rationale**: o defeito original era formato nunca checado; o teste literal falha em
qualquer mudança de chave ou estrutura (SC-004).

## D11 — Documentação (FR-011)

**Decision**:
- `docs/agents/validation.md` (en) com um roteiro curto por agente: pré-requisito, comando
  `maia init <id>`, onde olhar no agente, resultado esperado, fonte oficial. O quickstart
  desta feature aponta para ele.
- README / README.pt-BR: remover de "Known issues"/"Erros conhecidos" os itens de Cursor,
  Continue e Cline corrigidos; acrescentar a limitação do Cline (servidor visível em todas as
  janelas) e o aviso do Codex (projeto confiável); documentar `maia agent rm`.
- `AGENT.md`: atualizar "Known open follow-ups" e registrar `MAIA_PROJECT_DIR` na nota do
  `mcp-server`.
