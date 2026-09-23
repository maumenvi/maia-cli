---

description: "Task list for 005-mcp-server-security"
---

# Tasks: Servidor MCP & Segurança de Runtime

**Input**: Design documents from `/specs/005-mcp-server-security/`

**Prerequisites**: [plan.md](./plan.md) (rev. 2), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Revisão 2** (2026-09-23): regenerado após a sessão de clarificação de 2026-09-22
(FR-008, FR-009, FR-010) e as correções da análise de consistência. Mudanças em
relação à revisão 1: o mecanismo de override sumiu (FR-009), os
`DestructiveActionKind` caíram de quatro para dois e `classify` deixou de existir
como símbolo (FR-010), o `maia remove` ganhou tarefas (FR-008), e as tarefas de SC-002
passaram de "criar teste" para "estender teste existente".

**Tests**: Test tasks são **obrigatórios**. O Princípio I da Constituição é
NON-NEGOTIABLE: "No new logic merges without a test that exercises it." Todo teste é
escrito **antes** da implementação e deve falhar primeiro.

**Organization**: Tarefas agrupadas por user story. As seis stories são todas P1, mas
o estado do código difere radicalmente entre elas — US1 e US2 já estão implementadas.
A ordem das fases é por **risco decrescente**, não por numeração do spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos distintos, sem dependência pendente)
- **[Story]**: User story do spec (US1–US6)
- Todo caminho de arquivo é exato

## Path Conventions

Projeto único: `src/` e `tests/` na raiz. Arquivos **novos** nascem na convenção de
ponto do Princípio IX (`evaluate.guardrail.ts`). Arquivos **existentes** aparecem com
o nome atual em kebab-case até a Fase 8, que migra o repositório inteiro.

## Estado de partida (verificado no código)

| User Story | FR | Estado | O que falta |
|---|---|---|---|
| US1 — descobrir/adicionar/sincronizar | FR-001 | ✅ Implementado | Nada. Baseline de regressão. |
| US2 — expor capacidades via servidor | FR-002, FR-003 | ✅ Implementado | Só o edge case de encerramento. |
| US3 — rejeitar protocolo inválido | FR-004 | ⚠️ Parcial | Rejeição no `initialize` (SC-001 é **falso** hoje) |
| US4 — isolar ambiente | FR-005 | ✅ Implementado **e testado** | Dois casos descobertos + falha cedo em variável ausente |
| US5 — proteger segredos | FR-006 | ⚠️ Parcial | Redação do stderr (SC-003 é **falso** hoje) |
| US6 — guardrails destrutivos | FR-007–FR-010 | ❌ **Ausente** | Tudo (SC-004 é **falso** hoje) |

Baseline verde na partida: **154 testes passando**.

**Correção da revisão 1**: SC-002 **já tem teste** — `'passes only explicitly declared
credentials to stdio MCP processes'` em `tests/tools/mcp-manager.test.ts` cobre os três
casos centrais. A revisão 1 mandava criar do zero o que já existe; a Fase 5 agora
**estende** aquele arquivo.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar a estrutura que as fases seguintes consomem. Nenhuma lógica aqui.

- [X] T001 Criar o diretório de escopo `src/guardrails/` com os subdiretórios `contracts/`, `policy/`, `config/` e `audit/`, conforme a árvore em plan.md (Princípio VI)
- [X] T002 [P] Criar os diretórios de teste `tests/guardrails/` e o de ponte `src/cli/shared/guardrail/`

> **Nota**: a revisão 1 tinha uma terceira tarefa adicionando `.maia/guardrails.json` a
> `artifactPaths` de `scripts/run-tests.mjs`. **Removida**: o arquivo é config do
> projeto que usa o Maia, resolvido a partir do cwd, e os testes desta feature usam
> `tempDir` como cwd — como já fazem `remove.test.ts` e os testes de catálogo. Nada é
> gravado na raiz do repositório, então nada precisa ser limpo.

**Checkpoint**: estrutura pronta; `npm test` continua verde com os 154 testes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Os tipos que US6 inteira consome. Bloqueia **apenas** a Fase 7.

**⚠️ NÃO bloqueia** as fases 3–6, que são independentes de guardrails.

- [X] T003 [P] Definir o tipo `DestructiveActionKind` em `src/guardrails/contracts/destructive.action.kind.ts` como union fechada de **exatamente dois** valores: `'file-delete'` e `'file-overwrite'` — FR-010 removeu `config-rewrite` e `command-declared` por não terem produtor
- [X] T004 [P] Definir a interface `DestructiveAction` em `src/guardrails/contracts/destructive.action.ts` com **três** campos: `kind: DestructiveActionKind` (obrigatório; usado **apenas** na auditoria, nunca na decisão), `targetPath: string` (obrigatório; **único campo que decide** allow/block), `reason?: string`. **Sem `overrideToken`** (FR-009)
- [X] T005 [P] Definir a interface `GuardrailConfig` em `src/guardrails/contracts/guardrail.config.ts` com **dois** campos: `version: number` (obrigatório, "Deve ser `1`") e `denyPatterns: string[]` (obrigatório, "Lista vazia é válida"). **Sem `allowOverrides` nem `requireConfirmation`** (FR-009)
- [X] T006 [P] Definir a interface `GuardrailViolation` em `src/guardrails/contracts/guardrail.violation.ts` com: `pattern: string` (o padrão que casou, ou o literal `'<malformed-config>'` no caso fail-closed), `targetPath: string`, `message: string` ("nunca contém valor de segredo")
- [X] T007 Definir o tipo discriminado `GuardrailDecision` em `src/guardrails/contracts/guardrail.decision.ts` como união exata: `{ outcome: 'allow'; action: DestructiveAction; auditNote: string }` e `{ outcome: 'block'; action: DestructiveAction; violations: GuardrailViolation[] }` (depende de T004 e T006)

**Checkpoint**: tipos compilam; `npm run typecheck` verde. Nenhum comportamento mudou.

---

## Phase 3: User Story 3 — Rejeitar protocolo inválido (P1) 🎯 MVP

**Goal**: Fazer SC-001 verdadeiro. Hoje o `initialize` aceita revisão desconhecida e
responde com sucesso usando outra — a "reinterpretação silenciosa" que o Acceptance
Scenario 3.2 proíbe.

**Independent Test**: Enviar ao servidor uma mensagem JSON-RPC estruturalmente inválida
e uma declarando revisão incompatível; ambas rejeitadas com erro identificável, sem
crash e sem sucesso silencioso.

### ⚠️ Atenção antes de começar

`negotiateMcpProtocolVersion` tem **dois chamadores com propósitos diferentes**:

- `src/agent/mcp/server/stdio.ts:181` — servidor **validando** o que o cliente pediu.
- `src/agent/mcp/runtime/client/json-rpc-client/json-rpc-mcp-client.ts:141` — cliente
  escolhendo sua **própria** revisão preferida, chamando **sem argumento**.

Só o primeiro muda. O segundo não pode quebrar.

### Tests for User Story 3 (escrever primeiro, devem falhar)

- [X] T008 [P] [US3] Em `tests/tools/mcp-protocol.test.ts`, teste: `initialize` com `protocolVersion` não suportada (ex.: `'1999-01-01'`) retorna erro `-32602` cujo `data.supported` lista as três revisões legadas e cujo `data.requested` ecoa a revisão pedida
- [X] T009 [P] [US3] Em `tests/tools/mcp-protocol.test.ts`, teste de **não-regressão**: `initialize` **sem** o campo `protocolVersion` continua retornando sucesso com a revisão default `'2025-11-25'` (caso A da Decision 1 — a armadilha é tratar ausente como erro)
- [X] T010 [P] [US3] Em `tests/tools/mcp-protocol.test.ts`, teste: `initialize` com cada revisão legada suportada (`'2025-11-25'`, `'2025-06-18'`, `'2024-11-05'`) ecoa exatamente a revisão pedida
- [X] T011 [P] [US3] Em `tests/tools/mcp-protocol.test.ts`, teste de não-regressão do cliente: `initializeLegacy` continua enviando a revisão preferida quando `negotiateMcpProtocolVersion` é chamada sem argumento

### Implementation for User Story 3

- [X] T012 [US3] Criar `src/agent/mcp/runtime/protocol/json-rpc/negotiate.mcp.protocol.version.result.ts` com o tipo discriminado: `{ outcome: 'negotiated'; version: McpProtocolVersion }` e `{ outcome: 'unsupported'; requested: string; supported: readonly string[] }` (um símbolo por arquivo, Princípio V)
- [X] T013 [US3] Reescrever `src/agent/mcp/runtime/protocol/json-rpc/negotiate-mcp-protocol-version.ts` para retornar o resultado de T012, distinguindo os três casos da Decision 1: ausente ⇒ `negotiated` com o default; suportada ⇒ `negotiated` ecoando; presente e não suportada ⇒ `unsupported`. Função pura (Princípio VIII); substituir o fallback, não duplicá-lo (Princípio VII)
- [X] T014 [US3] Atualizar o chamador cliente em `src/agent/mcp/runtime/client/json-rpc-client/json-rpc-mcp-client.ts:141` para ler `.version` do novo resultado, preservando o comportamento de escolher a revisão preferida quando chamado sem argumento
- [X] T015 [US3] Em `handleInitialize` de `src/agent/mcp/server/stdio.ts`, traduzir o caso `unsupported` em `JsonRpcFailure` com código `-32602`, mensagem `Unsupported MCP protocol version <requested>` e `data: { requested, supported }` — usar `-32602` e **não** `-32022`, que pertence ao vocabulário da era moderna (Decision 1)

**Checkpoint**: SC-001 verdadeiro. Os quatro testes novos passam, os 154 anteriores
seguem verdes. US3 entregável isoladamente.

---

## Phase 4: User Story 5 — Proteger segredos (P1)

**Goal**: Fazer SC-003 verdadeiro. `McpStdioTransport` repassa o stderr do filho cru;
um MCP em modo debug que ecoa sua config imprime o token no terminal.

**Independent Test**: Configurar um MCP que exige credencial, rodá-lo, e verificar que
o valor nunca aparece na saída — apenas o nome da variável.

**Depende de**: nada. Paralela às fases 3, 5 e 7.

### Tests for User Story 5 (escrever primeiro, devem falhar)

- [X] T016 [P] [US5] Criar `tests/tools/mcp-env-isolation.test.ts` (arquivo novo, dedicado à **redação de stderr**; o isolamento de ambiente já vive em `mcp-manager.test.ts`) com teste: valor injetado que aparece no stderr do filho é substituído por `[REDACTED:<NOME_DA_VAR>]` antes de alcançar `process.stderr`
- [X] T017 [P] [US5] Em `tests/tools/mcp-env-isolation.test.ts`, teste: valor com **menos de 8 caracteres** NÃO é redigido (substrings curtas casariam com texto não-relacionado e destruiriam o log — Decision 5)
- [X] T018 [P] [US5] Em `tests/tools/mcp-env-isolation.test.ts`, teste: texto de stderr sem nenhum valor injetado passa intacto, byte a byte
- [X] T019 [P] [US5] Em `tests/tools/mcp-env-isolation.test.ts`, teste: valor que aparece **múltiplas vezes** no mesmo chunk é redigido em todas as ocorrências

### Implementation for User Story 5

- [X] T020 [US5] Criar `src/agent/mcp/runtime/transport/stdio/redact.secrets.from.stream.ts` com função **pura** que recebe o texto e o mapa de valores injetados e devolve o texto com cada ocorrência literal substituída por `[REDACTED:<NOME>]`; valores com menos de 8 caracteres são ignorados (Decision 5)
- [X] T021 [US5] Em `src/agent/mcp/runtime/transport/stdio/mcp-stdio-transport.ts`, trocar o handler `this.child.stderr.on('data', chunk => process.stderr.write(chunk))` por escrita através da redação de T020, usando como conjunto de valores exatamente o que `resolveRuntimeEnv` resolveu para aquele processo
- [X] T022 [US5] Auditar as mensagens de erro de `src/agent/mcp/runtime/transport/stdio/mcp-stdio-transport.ts` e `src/agent/mcp/runtime/transport/stdio/resolve-runtime-env.ts` para garantir que nenhuma inclua valor de credencial — apenas nome de variável (FR-006); corrigir as que violarem

**Checkpoint**: SC-003 verdadeiro para o caminho de stderr. Limite aceito: valor
transformado pelo MCP antes de imprimir (base64, hash) não é pego por casamento
literal — Decision 5.

---

## Phase 5: User Story 4 — Isolar ambiente do processo (P1)

**Goal**: O isolamento está correto **e já tem teste**. Esta fase cobre os dois casos
que aquele teste não alcança e trata o edge case de variável ausente.

**Independent Test**: Configurar um MCP que declara variáveis específicas, iniciá-lo, e
verificar de dentro do processo que só as necessárias ao runtime e as declaradas estão
presentes.

**Depende de**: nada. Paralela às fases 3, 4 e 7.

### Tests for User Story 4 (escrever primeiro)

- [X] T023 [US4] Em `tests/tools/mcp-manager.test.ts`, **estender** a cobertura de SC-002 (não recriar — `'passes only explicitly declared credentials to stdio MCP processes'` já cobre variável declarada chega / variável-fonte não chega / segredo não-declarado não vaza): adicionar teste de um MCP que declara `env: {}` e não recebe nenhum segredo do ambiente pai (Acceptance Scenario 4.2), usando a fixture `tests/fixtures/mcp/mock-env-server.mjs`
- [X] T024 [US4] Em `tests/tools/mcp-manager.test.ts`, testes do edge case de variável ausente: (a) uma variável referenciada e não resolvida faz o start falhar **antes do spawn**, nomeando-a; (b) três faltantes são reportadas **todas na mesma mensagem**; (c) variável presente porém **vazia** é tratada como faltante; (d) todas presentes ⇒ spawn normal

### Implementation for User Story 4

- [X] T025 [US4] Criar `src/agent/mcp/runtime/transport/stdio/collect.referenced.env.names.ts` com função **pura** que extrai os nomes de variável referenciados por placeholder num valor de config, cobrindo as **duas** sintaxes que `resolve-env-placeholders.ts` aceita: `${env:NOME}` e `{NOME}`
- [X] T026 [US4] Criar `src/agent/mcp/runtime/transport/stdio/assert.required.env.ts` que recebe a config do MCP, coleta os nomes via T025, e lança erro agregando **todas** as variáveis não resolvidas ou vazias de uma vez (mesma decisão de relato agregado da feature 004); a mensagem nomeia as variáveis e **nunca** mostra valor parcial (Decision 2)
- [X] T027 [US4] No construtor de `src/agent/mcp/runtime/transport/stdio/mcp-stdio-transport.ts`, chamar a asserção de T026 **antes** do `spawn`, de modo que nenhum processo suba com credencial vazia

**Checkpoint**: SC-002 com cobertura completa. Edge case de variável ausente resolvido
com mensagem acionável.

---

## Phase 6: Edge case — desconexão no meio da requisição

**Goal**: `rl.on('close')` chama `process.exit(0)` sem aguardar; `shutdownAll()` é
disparado mas nunca esperado, então sessões filhas podem sobreviver ao pai como órfãs
segurando credenciais em memória.

**Independent Test**: Fechar stdin com requisição pendente e verificar que nenhum
processo filho sobrevive.

**Depende de**: **Fase 3** — mesmo arquivo (`stdio.ts`).

### Tests (escrever primeiro)

- [X] T028 [US2] Em `tests/tools/mcp-server.test.ts`, teste: fechar stdin com uma requisição pendente resulta em `shutdownAll()` **aguardado** e nenhum processo filho sobrevivente
- [X] T029 [US2] Em `tests/tools/mcp-server.test.ts`, teste: um MCP que não responde ao shutdown faz o teto de tempo disparar e o processo sair mesmo assim

### Implementation

- [X] T030 [US2] Em `src/agent/mcp/server/stdio.ts`, reescrever o handler `rl.on('close')` para parar de aceitar novas requisições, **aguardar** `shutdownAll()` com teto de tempo, e só então sair — código `0` na conclusão limpa, `1` se o teto for atingido (Decision 6)

**Checkpoint**: sem processos órfãos. Servidor encerra de forma determinística.

---

## Phase 7: User Story 6 — Guardrails de ações destrutivas (P1)

**Goal**: Fazer SC-004 verdadeiro nos **quatro** pontos do FR-008. É o único requisito
sem nenhuma linha de código.

**Independent Test**: Disparar uma ação destrutiva cujo alvo casa com a deny list e
verificar que é bloqueada, em vez de concluir pela intenção declarada.

**Depende de**: Fase 2 (tipos). Independente das fases 3–6.

### Tests for User Story 6 (escrever primeiro, devem falhar)

- [X] T031 [P] [US6] Criar `tests/guardrails/match.deny.pattern.test.ts`: casamento glob positivo, negativo, e padrão que casa em subdiretório (`**/credentials/**`)
- [X] T032 [P] [US6] Criar `tests/guardrails/parse.guardrail.config.test.ts`: arquivo **ausente** ⇒ defaults embutidos, sem erro; **válido** ⇒ defaults **mais** declarados ("uma config nunca afrouxa o baseline"); **não-parseável** ⇒ fail-closed; `version` diferente de `1` ⇒ fail-closed; `denyPatterns` que não é array de strings ⇒ fail-closed
- [X] T033 [P] [US6] Criar `tests/guardrails/evaluate.guardrail.test.ts`: `allow` quando nenhum padrão casa; `block` quando um casa; **agregação** de múltiplas violações numa só decisão (não para na primeira). **Sem nenhum caso de override** — o mecanismo não existe (FR-009)
- [X] T034 [P] [US6] Em `tests/guardrails/evaluate.guardrail.test.ts`, teste da regra de precedência máxima: `targetPath` que resolve para **fora** da raiz do workspace é sempre `block`
- [X] T035 [P] [US6] Em `tests/guardrails/evaluate.guardrail.test.ts`, teste de FR-010: o **mesmo `targetPath` com `kind` diferente produz o mesmo veredito** — o `kind` não participa da decisão, só da auditoria
- [X] T036 [P] [US6] Criar `tests/guardrails/guardrail.command.test.ts`: códigos de saída `0` (nada bloqueado), `1` (ao menos uma ação bloqueada) e `2` (config presente e malformada)
- [X] T037 [P] [US6] Em `tests/guardrails/guardrail.command.test.ts`, teste de FR-006: nenhuma mensagem de violação ou nota de auditoria contém valor de credencial

### Implementation — política (funções puras)

- [X] T038 [P] [US6] Criar `src/guardrails/policy/default.deny.patterns.ts` exportando os padrões embutidos aplicados quando não há config: `**/*.env` e `**/credentials/**`. Não incluir `.maia/mcp.env` separadamente — já casa com `**/*.env`
- [X] T039 [P] [US6] Criar `src/guardrails/policy/match.deny.pattern.ts` com função **pura** de casamento glob entre um `targetPath` e um padrão (Princípio VIII)
- [X] T040 [US6] Criar `src/guardrails/config/parse.guardrail.config.ts` com função **pura** que valida a forma do `GuardrailConfig`: `version` deve ser `1`; `denyPatterns` deve ser array de strings; qualquer desvio devolve resultado de erro (**nunca lança**) para que o chamador aplique fail-closed (Decision 4)
- [X] T041 [US6] Criar `src/guardrails/config/load.guardrail.config.ts` que lê `.maia/guardrails.json` **resolvido a partir do cwd** (I/O na borda, Princípio VIII) e delega a validação a T040: ausente ⇒ defaults de T038; válido ⇒ defaults **mais** declarados; inválido ⇒ sinaliza malformado
- [X] T042 [US6] Criar `src/guardrails/policy/evaluate.guardrail.ts` com função **pura** aplicando as **quatro** regras de contracts/guardrails.md nesta ordem: (1) caminho fora da raiz do workspace ⇒ block sempre; (2) config malformada ⇒ block com violação `'<malformed-config>'`; (3) `targetPath` casa com algum padrão de deny ⇒ block; (4) caso contrário ⇒ allow. Violações **agregadas**, nunca interrompidas na primeira. **Nenhuma regra tem exceção por override** (FR-009). A decisão usa **só** `targetPath` (FR-010) (depende de T039, T040)
- [X] T043 [P] [US6] Criar `src/guardrails/audit/format.guardrail.decision.ts` com função **pura** que formata a decisão para a trilha auditável, cobrindo `allow` **e** `block` (Acceptance Scenario 6.2 exige que a ação permitida também seja auditável) e garantindo que nenhum valor de segredo entre na saída

### Implementation — pontos de aplicação (FR-008)

- [X] T044 [US6] Criar `src/cli/shared/guardrail/assert.path.allowed.ts` como ponte entre comando e política: carrega a config via T041, monta a `DestructiveAction`, avalia via T042, e lança com as violações formatadas quando o resultado é `block` (depende de T041, T042, T043)
- [X] T045 [US6] **Ponto 1** — criar `src/cli/commands/guardrail.ts` implementando `maia guardrail check <caminho...>` no padrão `CommandHandler`, com os códigos de saída `0`/`1`/`2` de contracts/guardrails.md (depende de T044)
- [X] T046 [US6] Registrar `guardrail: guardrailCommand` em `src/cli/commands/command-handlers.ts` e adicionar a linha `maia guardrail check <path...>` em `src/cli/commands/help.ts`
- [X] T047 [US6] **Ponto 4** — em `tests/cli/remove.test.ts`, escrever primeiro os testes de FR-008: (a) remoção cujo alvo casa com a deny list é bloqueada e o arquivo **continua existindo**, com manifesto e lockfile inalterados; (b) remoção cujo alvo não casa segue funcionando; (c) os 6 testes existentes continuam verdes
- [X] T048 [US6] **Ponto 4** — em `src/cli/commands/remove.ts`, consultar T044 com o `materializedPath` **antes** do `withRollback`, não como passo dentro dele (o rollback não tem o que desfazer; a intenção é nunca começar). A checagem é **condicional**: `materializedPath` é `undefined` para `kind === 'mcp'`, que não tem arquivo materializado — nesse caso não há caminho a avaliar
- [X] T049 [US6] **Pontos 2 e 3** — criar `scripts/check-guardrails.mjs`, consumido pelo hook e pelo CI, avaliando os arquivos staged e saindo com o código correspondente (mantém kebab-case por consistência com os demais `.mjs` do diretório)
- [X] T050 [US6] **Ponto 2** — criar `.githooks/pre-commit` em shell, sem dependência externa, invocando `node scripts/check-guardrails.mjs`; marcar como executável (`chmod +x`)
- [X] T051 [US6] Adicionar ao `package.json` os scripts `guardrails:install` (executando `git config core.hooksPath .githooks`) e `guardrails:check` (executando `node scripts/check-guardrails.mjs`)
- [X] T052 [US6] **Ponto 3** — adicionar o step `Check guardrails` ao `.github/workflows/ci.yml`, **depois** de `Check source architecture`. Este é o gate não-contornável: `--no-verify` burla o hook local e não pode ser desabilitado (Decision 3)

**Checkpoint**: SC-004 verdadeiro nos quatro pontos. `maia guardrail check` funciona,
hook bloqueia localmente, CI bloqueia de forma não-contornável, e `maia remove` não
apaga arquivo bloqueado.

---

## Phase 8: Migração de nomenclatura (Princípio IX)

**Purpose**: Migrar o repositório inteiro para a convenção de ponto da Constituição.

**⚠️ OBRIGATORIAMENTE A ÚLTIMA FASE.** Renomear antes forçaria todo o trabalho
funcional a mirar caminhos que ainda vão mudar.

**Pré-condição**: Fases 1–7 completas e os três gates verdes.

**Escopo medido**: 413 arquivos em `src/`, 22 em `tests/`, 1067 imports relativos.
Colisões de nome: **nenhuma** (o conjunto pós-transformação é injetivo).

- [X] T053 Confirmar base limpa e verde antes de começar: `git status --porcelain` vazio, e `npm run typecheck`, `npm test` e `npm run check:architecture` os três passando
- [X] T054 Criar `scripts/rename-to-dot-convention.mjs` que executa a migração mecânica: para cada `.ts` sob `src/` e `tests/`, transformar **apenas o basename** de `-` para `.` preservando o sufixo `.test.ts`, usando **`git mv`** (nunca delete+create); **não** renomear diretórios; **não** tocar `src/cli/index.ts` (entrypoint publicado, já conforme), `tests/fixtures/**` (não é fonte TS) nem `dist/` (artefato de build)
- [X] T055 Estender `scripts/rename-to-dot-convention.mjs` para reescrever os 1067 imports relativos no **mesmo commit** do rename — `allowImportingTsExtensions` faz os imports carregarem a extensão `.ts` literal, então um rename sem reescrita quebra o build inteiro
- [X] T056 Executar a migração e validar os três gates **com a suíte inalterada**: `npm run typecheck`, `npm test`, `npm run check:architecture`
- [X] T057 Validar que o diff é puramente mecânico: `git diff --cached --name-status -M` mostra renames (`R`) e mudanças de string de import, e **nada mais**
- [X] T058 Validar que nenhum arquivo de fonte sobrou com hífen: `find src tests -name '*.ts' -exec basename {} \; | grep -e '-'` deve retornar vazio (hoje retorna 435)
- [X] T059 Validar que o pacote publicável não quebrou: `npm pack --dry-run` e `node src/cli/index.ts help` — um rename acidental do entrypoint quebraria a publicação **sem quebrar nenhum teste**

**Checkpoint**: repositório na convenção do Princípio IX, comportamento idêntico,
histórico preservado.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T060 [P] Criar `scripts/check-file-naming.mjs` validando que nenhum `.ts` sob `src/` e `tests/` contém hífen no basename, e adicionar o step ao `.github/workflows/ci.yml` — sem isso **nada impede a convenção de regredir**. Tarefa própria e **fora** do módulo de guardrails: um nome fora da convenção não é ação destrutiva
- [ ] T061 [P] Documentar `maia guardrail check`, o formato do `.maia/guardrails.json` e a integração com `maia remove` no `README.md` e no `README.pt-BR.md`, incluindo a semântica fail-closed e a ausência de override
- [ ] T062 [P] Registrar em `SECURITY.md` as garantias de runtime desta feature: isolamento de ambiente por allow-list (SC-002), redação de segredos no stderr com seu limite conhecido (SC-003), e guardrails sem override nos quatro pontos (SC-004)
- [ ] T063 Verificar os gates de cobertura com os arquivos novos: `npm run test:coverage` exige 80% de linhas, 80% de funções e 70% de branches. Baseline atual: 87.54% / 87.20% / 77.93% — a margem de **branches é a mais apertada (7.93pp)** e `src/guardrails/` adiciona ~10 arquivos
- [ ] T064 Executar a validação completa de [quickstart.md](./quickstart.md), cenários 1 a 7, confirmando os quatro critérios de sucesso

---

## Dependencies & Execution Order

### Phase Dependencies

- **Fase 1 (Setup)**: sem dependências.
- **Fase 2 (Foundational)**: depende da Fase 1. Bloqueia **apenas** a Fase 7.
- **Fase 3 (US3)**: depende da Fase 1. Independente das fases 4, 5, 7.
- **Fase 4 (US5)**: depende da Fase 1. Independente das fases 3, 5, 7.
- **Fase 5 (US4)**: depende da Fase 1. Independente das fases 3, 4, 7.
- **Fase 6 (desconexão)**: depende da **Fase 3** — mesmo arquivo (`stdio.ts`).
- **Fase 7 (US6)**: depende da Fase 2. Independente das fases 3–6.
- **Fase 8 (migração)**: depende de **todas** as anteriores. Obrigatoriamente última.
- **Fase 9 (polish)**: depende da Fase 8 (T060 valida o resultado da migração).

### Grafo

```
Fase 1 (Setup)
   ├─→ Fase 2 (tipos) ─→ Fase 7 (US6 — guardrails, 4 pontos) ─┐
   ├─→ Fase 3 (US3 — protocolo) ─→ Fase 6 (desconexão)        ┤
   ├─→ Fase 4 (US5 — segredos)                                 ├─→ Fase 8 ─→ Fase 9
   └─→ Fase 5 (US4 — ambiente)                                 ┘
```

### User Story Dependencies

- **US1 (FR-001)**: já implementada; sem tarefas. Coberta por `tests/cli/mcp-registry.test.ts`.
- **US2 (FR-002, FR-003)**: já implementada; a Fase 6 toca o servidor só para o edge case de encerramento.
- **US3, US4, US5, US6**: mutuamente independentes; paralelizáveis entre pessoas depois da Fase 1 (US6 depois da Fase 2).

### Within Each User Story

- Testes escritos **primeiro** e falhando antes da implementação (Princípio I).
- Tipos antes de funções puras; funções puras antes das bordas de I/O.
- `npm run typecheck` e `npm test` verdes ao fim de cada tarefa.
- Um commit por tarefa ou grupo lógico (Princípio IV).

### Parallel Opportunities

- **Fase 2**: T003–T006 em paralelo; T007 depende de T004 e T006.
- **Fase 3**: T008–T011 em paralelo entre si.
- **Fase 4**: T016–T019 em paralelo entre si.
- **Fase 5**: T023–T024 **não** são paralelos — mesmo arquivo (`mcp-manager.test.ts`).
- **Fase 7**: T031–T037 (testes) em paralelo; T038, T039 e T043 em paralelo; T040→T041→T042 e T044→T045 sequenciais por dependência; T047 antes de T048 (teste antes da implementação).
- **Entre fases**: 3, 4, 5 e 7 podem correr simultaneamente com equipe.

---

## Parallel Example: Fase 7 (US6)

```bash
# Testes primeiro, todos em paralelo (arquivos distintos):
Task: "tests/guardrails/match.deny.pattern.test.ts"
Task: "tests/guardrails/parse.guardrail.config.test.ts"
Task: "tests/guardrails/evaluate.guardrail.test.ts"
Task: "tests/guardrails/guardrail.command.test.ts"

# Depois, as funções puras sem dependência entre si:
Task: "src/guardrails/policy/default.deny.patterns.ts"
Task: "src/guardrails/policy/match.deny.pattern.ts"
Task: "src/guardrails/audit/format.guardrail.decision.ts"
```

---

## Implementation Strategy

### MVP (Fase 1 + Fase 3)

A US3 é o MVP: menor mudança que converte um critério de sucesso falso em verdadeiro,
com risco concentrado em um único ponto.

1. Fase 1 — Setup
2. Fase 3 — US3 (rejeição de protocolo)
3. **PARAR E VALIDAR**: SC-001 verdadeiro; 154 testes anteriores verdes
4. Entregável isoladamente

### Entrega incremental

1. Setup → base pronta
2. **US3** → SC-001 verdadeiro → entregar (MVP)
3. **US5** → SC-003 verdadeiro → entregar
4. **US4** → SC-002 com cobertura completa → entregar
5. **Desconexão** → sem órfãos → entregar
6. **US6** → SC-004 verdadeiro nos 4 pontos → entregar
7. **Migração** → Princípio IX → entregar
8. **Polish** → guarda contra regressão da convenção

### Ordem recomendada por risco

A ordem é por risco decrescente, não por numeração de user story. As quatro stories
com trabalho real são todas P1 no spec; o desempate é o estado do código.

### Nota de risco — Fase 8

A migração é o item de maior custo de review e o único que toca arquivos fora do escopo
do spec 005. Entrou por decisão explícita de escopo, não por derivação do spec. As sete
fases anteriores **não dependem dela** — se o custo de review se mostrar proibitivo,
extraí-la para uma feature própria mantém as fases 1–7 entregáveis sem alteração.

---

## Notes

- `[P]` = arquivos distintos, sem dependência pendente
- `[Story]` mapeia a tarefa à user story do spec, para rastreabilidade
- Verificar que cada teste **falha** antes de implementar (Princípio I)
- Commit por tarefa ou grupo lógico (Princípio IV)
- Parar em qualquer checkpoint para validar a story isoladamente
- Arquivos novos nascem na convenção de ponto; existentes migram na Fase 8
