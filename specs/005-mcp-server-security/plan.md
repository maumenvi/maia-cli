# Implementation Plan: Servidor MCP & Segurança de Runtime

**Branch**: `005-mcp-server-security` | **Date**: 2026-09-22 (rev. 2) | **Spec**: [spec.md](./spec.md)

**Revisão 2**: incorpora a sessão de clarificação de 2026-09-22 (3 perguntas → FR-008,
FR-009, FR-010) e corrige duas afirmações erradas da revisão 1, apontadas pela
análise de consistência. Ver "Correções da revisão 1" abaixo.

**Input**: Especificação da feature em `/specs/005-mcp-server-security/spec.md`

**Note**: Este template é preenchido pelo comando `/speckit-plan`; sua definição descreve o fluxo de execução.

## Summary

Diferente das features 002–004, a maior parte da superfície descrita neste spec **já
existe e funciona**. O levantamento do código (454 arquivos em `src/`) mostra que
FR-001, FR-002, FR-003 e FR-005 estão implementados de ponta a ponta, e que FR-004 e
FR-006 estão parcialmente cobertos. O gap real e não-negociável é **FR-007
(guardrails para ações destrutivas), que não tem nenhuma implementação** — não existe
deny list, não existe hook de pre-commit, não existe classificação de ação
destrutiva em lugar nenhum do repositório.

Estado por requisito, verificado no código:

| FR | Estado | Evidência |
|----|--------|-----------|
| FR-001 (find/add/sync) | ✅ Implementado | `src/cli/commands/mcp/mcp-command.ts` cobre `sync`, `find`, `add`/`install` |
| FR-002 (servidor stdio) | ✅ Implementado | `src/agent/mcp/server/stdio.ts` + `src/cli/commands/mcp-server.ts` |
| FR-003 (discovery dinâmica + agent scoping) | ✅ Implementado | `McpStdioServer.dynamicDiscovery` e `agentId` → `collectAllTools` → `canLlmAccessResource` |
| FR-004 (validação JSON-RPC + versão) | ⚠️ Parcial | validação estrutural existe (`isJsonRpcInboundMessage`, `-32700`/`-32600`), mas a era legada **não rejeita** revisão incompatível |
| FR-005 (isolamento de ambiente) | ✅ Implementado | `resolveSafeInheritedEnv` + `SAFE_INHERITED_ENV_KEYS` em `McpStdioTransport` |
| FR-006 (segredos) | ⚠️ Parcial | prompt mudo (`SecretPromptOutput`) e `.gitignore` cobrem entrada e VCS; falta garantia contra vazamento em **stderr de subprocesso** e em mensagens de erro |
| FR-007 (guardrails destrutivos) | ❌ **Ausente** | nenhum arquivo de deny list, nenhum hook, `.husky/` não existe |
| FR-008 (quatro pontos de aplicação) | ❌ **Ausente** | `maia remove` apaga via `removeMaterializedFile` sem nenhuma checagem |
| FR-009 (sem override) | ❌ **Ausente** | decorre de FR-007; nada implementado |
| FR-010 (decisão por caminho) | ❌ **Ausente** | decorre de FR-007; nada implementado |

Este plano fecha cinco lacunas:

1. **FR-004 / SC-001 — rejeição de versão só vale na era moderna**: `handle()` rejeita
   `_meta` com revisão moderna desconhecida via `-32022`, mas `handleInitialize`
   chama `negotiateMcpProtocolVersion`, que faz *fallback silencioso* para
   `MCP_LEGACY_PROTOCOL_VERSIONS[0]` quando o cliente pede uma revisão que o Maia não
   suporta. Isso é exatamente a "reinterpretação silenciosa" que o Acceptance
   Scenario 3.2 proíbe. SC-001 exige 100% de rejeição identificável e hoje é falso
   para o caminho `initialize`.

2. **FR-007–FR-010 / SC-004 — guardrails não existem**: é o único requisito sem
   nenhuma linha de código, e a Constituição o torna obrigatório duas vezes
   (Princípio II e a seção Compliance review). A clarificação de 2026-09-22 fixou
   três decisões que estreitam o escopo: decisão **por caminho** contra a deny list
   (FR-010), **sem nenhum override** em runtime (FR-009), e aplicação em **quatro
   pontos** — comando de consulta, pre-commit, CI, e o `maia remove` antes de apagar
   arquivo materializado (FR-008).

3. **FR-006 / SC-003 — stderr do subprocesso é repassado cru**: `McpStdioTransport`
   faz `this.child.stderr.on('data', chunk => process.stderr.write(chunk))`. Um MCP
   que ecoa sua própria configuração (comportamento comum em modo debug) imprime o
   valor da credencial no terminal do usuário através do Maia. SC-003 exige zero
   valores de segredo na saída ao longo de um ciclo completo de execução.

4. **Edge case — variável obrigatória ausente no start**: o spec pergunta
   explicitamente o que acontece; hoje `resolveRuntimeEnv` resolve o placeholder para
   string vazia e o processo sobe quebrado, falhando depois com um erro de transporte
   que não menciona a variável. Precisa falhar cedo e nomeando a variável.

5. **Edge case — desconexão no meio da requisição**: `rl.on('close')` chama
   `process.exit(0)` sem aguardar; requisições pendentes no `AgentMcpManager` são
   abandonadas sem resposta e sessões filhas podem sobreviver ao pai.

FR-001, FR-002, FR-003 e FR-005 são tratados como **baseline coberto por regressão** —
não recebem reimplementação.

## Correções da revisão 1

A análise de consistência encontrou duas afirmações erradas na revisão 1 deste plano.
Ambas estão corrigidas aqui:

**1. SC-002 já tem teste.** A revisão 1 afirmava que SC-002 "é verdadeiro hoje, mas
nenhum teste o prova". Falso: [`tests/tools/mcp-manager.test.ts`](../../tests/tools/mcp-manager.test.ts)
contém `'passes only explicitly declared credentials to stdio MCP processes'`, que já
cobre os três casos centrais — a variável declarada chega ao filho, a variável-fonte
do pai **não** chega, e um segredo não-declarado **não** vaza. O trabalho de US4
restante é menor do que a revisão 1 supunha: **estender** a cobertura existente com os
casos ainda descobertos (MCP sem nenhuma variável declarada; variável obrigatória
ausente), não criar do zero o que já existe. Criar um teste duplicado violaria o
Princípio VII.

**2. `.maia/guardrails.json` é por projeto, não artefato de teste.** A revisão 1 o
chamava de "deny list versionada" e, ao mesmo tempo, as tarefas o adicionavam a
`artifactPaths` de `scripts/run-tests.mjs` — uma lista de arquivos que o runner
**apaga** após os testes. As duas coisas são incompatíveis. Resolução: o arquivo é
config **do projeto que usa o Maia**, versionável por quem o escreve, e os testes
desta feature nunca o gravam na raiz do repositório — eles usam `tempDir` como cwd,
como já fazem todos os testes de catálogo e de remoção. Nada é adicionado a
`artifactPaths`.

**Risco de compatibilidade**: o item 1 muda o veredito de `initialize` para clientes
que hoje pedem uma revisão desconhecida e recebem silenciosamente `2025-11-25`. Após
esta feature eles recebem erro. Isso é intencional (é o furo que torna SC-001 falso),
mas a implementação precisa distinguir "cliente não declarou revisão" (continua
usando o default, comportamento correto do MCP) de "cliente declarou uma revisão que
não suportamos" (passa a ser erro) — ver Decision 1 em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (type-stripping nativo do Node.js), alvo Node.js ≥26

**Primary Dependencies**: Nenhuma além dos built-ins do Node.js (`node:child_process`,
`node:readline`, `node:fs`). `typescript` é dependência apenas de desenvolvimento.
Este plano **não adiciona nenhuma dependência de runtime** — incluindo o guardrail de
pre-commit, que é um hook git em shell chamando um script Node do próprio repositório,
sem `husky` nem `lint-staged` (ver Decision 3 em research.md).

**Storage**: Arquivos JSON/texto planos — `maia.json` (manifesto), `maia.lock.json`
(lockfile), `.maia/mcp.env` (credenciais, fora do VCS via `.gitignore`), e o novo
`.maia/guardrails.json` (deny list do projeto que usa o Maia; versionável por quem o
escreve, resolvido a partir do cwd — os testes desta feature usam `tempDir`, como já
fazem os testes de catálogo e de remoção).

**Testing**: `node:test` via `npm test` (`scripts/run-tests.mjs`), com `--coverage`
em CI. Testes ficam em `tests/`, espelhando o escopo do código sob teste.

**Target Platform**: CLI multiplataforma (Linux, macOS, Windows) rodando sob Node.js
≥26. O servidor MCP é stdio apenas; transportes de rede (HTTP/SSE/WS) existem no
código como *clientes* para MCPs externos, mas não expõem o Maia em rede.

**Project Type**: CLI de projeto único (`src/` + `tests/`), sem frontend/backend.

**Performance Goals**: Sem meta numérica de throughput — o servidor é stdio, de um
cliente por processo. A restrição real é que a checagem de guardrail no pre-commit
não torne o commit perceptivelmente lento (alvo: < 500 ms para um diff típico).

**Constraints**:
- Nenhum valor de segredo pode alcançar stdout, stderr, logs ou arquivo versionado (SC-003).
- Nenhuma variável de ambiente fora do conjunto seguro + declarado pode alcançar um
  processo de MCP (SC-002).
- stdout do servidor MCP é canal de protocolo exclusivo — nada além de JSON-RPC
  newline-delimited pode ser escrito nele.
- Toda alteração precisa caber em um commit (Princípio IV).

**Scale/Scope**: ~9 arquivos novos de guardrail (a clarificação removeu o mecanismo de
override e reduziu os kinds de quatro para dois), ~5 arquivos modificados no runtime
MCP e no `remove`, mais os testes correspondentes. Sem migração de dados.

## Constitution Check

*GATE: Deve passar antes da pesquisa de Fase 0. Reavaliado após o design de Fase 1.*

| Princípio | Avaliação | Veredito |
|-----------|-----------|----------|
| I. Test-First (NON-NEGOTIABLE) | Cada lacuna tem cenário de aceite ou critério de sucesso correspondente; `quickstart.md` lista os testes que precisam existir antes do código. SC-002 já tem teste (ver "Correções da revisão 1") e é **estendido**, não recriado. | ✅ PASS |
| II. Security by Default | Esta feature **é** o princípio: FR-007 materializa a exigência de deny list + pre-commit que a Constituição impõe, e FR-006 fecha o vazamento de stderr. Nenhum segredo entra no repositório. | ✅ PASS |
| III. Spec-Driven Workflow | spec → plan (este) → tasks → implement, com revisão humana entre fases. | ✅ PASS |
| IV. Small & Reversible Changes | As cinco lacunas são independentes entre si e cada uma cabe em um commit; a ordem em `quickstart.md` reflete isso. | ✅ PASS |
| V. Single Responsibility per File | Todo arquivo novo carrega uma função/tipo e um comentário de propósito, seguindo o padrão já estabelecido em `src/agent/mcp/`. | ✅ PASS |
| VI. Scope-Organized Directories | Guardrails vão para `src/guardrails/` (escopo novo e bem definido); correções de protocolo ficam em `src/agent/mcp/runtime/protocol/json-rpc/`; correções de transporte em `src/agent/mcp/runtime/transport/stdio/`. | ✅ PASS |
| VII. Clean Code | Sem código morto; o fallback silencioso de `negotiateMcpProtocolVersion` é substituído, não duplicado. | ✅ PASS |
| VIII. Pure Functions | Classificação de ação destrutiva, casamento de deny list e redação de segredo são funções puras; I/O (spawn, escrita de arquivo, git) fica nas bordas. | ✅ PASS |
| IX. File Naming Convention | Arquivos novos nascem na convenção de ponto; o repositório inteiro é migrado para ela nesta feature (ver "Migração de nomenclatura"). Testes com sufixo `.test.ts`. | ✅ PASS |

**Resultado**: nenhuma violação. A tabela de Complexity Tracking permanece vazia.

**Nota sobre o Princípio IX**: a Constituição escreve "toda palavra separada por
ponto (`.`)" e dá `user.dto.in.ts` como exemplo, mas o repositório inteiro usa hoje
kebab-case com ponto apenas antes do sufixo de teste
(`resolve-safe-inherited-env.ts`). Essa discrepância foi levantada no planejamento e
**resolvida a favor da Constituição**: esta feature inclui a migração completa do
repositório para a convenção de ponto. Ver a seção "Migração de nomenclatura" abaixo.

## Migração de nomenclatura (Princípio IX)

Decisão do planejamento: renomear **todos** os arquivos do repositório para a
convenção de ponto da Constituição, como parte desta feature, em vez de deixar dois
padrões coexistindo. Arquivos novos da 005 já nascem com ponto.

### Escopo medido

| Item | Quantidade |
|------|-----------|
| Arquivos `.ts` em `src/` com hífen | 413 (de 454) |
| Arquivos `.ts` em `tests/` com hífen | 22 (de 33) |
| Diretórios com hífen | 14 |
| Imports relativos a reescrever | 1067 |

**Colisões de nome**: nenhuma. Verificado convertendo todo basename de `-` para `.`
e procurando duplicatas por diretório — o conjunto resultante é injetivo, então o
rename não funde dois arquivos em um.

**Arquivos que já estão conformes** (sem hífen) permanecem intactos: `stdio.ts`,
`router.ts`, `defaults.ts`, `index.ts`, etc.

### Regra de transformação

Apenas o **basename** é transformado; `-` → `.`. O sufixo `.test.ts` é preservado.

```
resolve-safe-inherited-env.ts  →  resolve.safe.inherited.env.ts
mcp-stdio-transport.ts         →  mcp.stdio.transport.ts
can-llm-access-resource.ts     →  can.llm.access.resource.ts
mcp-server.test.ts             →  mcp.server.test.ts
stdio.ts                       →  stdio.ts          (inalterado)
```

**Diretórios NÃO são renomeados.** `src/agent/mcp/runtime/protocol/json-rpc/`
continua com hífen. O Princípio IX fala de *file names*, e o Princípio VI, que rege
diretórios, exige apenas organização por escopo, sem impor grafia. Renomear os 14
diretórios multiplicaria o diff sem nenhuma exigência constitucional que o sustente.

### Restrições que a migração deve respeitar

1. **`git mv`, nunca delete+create** — preserva o histórico e mantém o rename
   legível no diff.
2. **`src/cli/index.ts` não muda** — é o entrypoint publicado, referenciado por
   `package.json` (`bin`, `dev`, `maia`). Não tem hífen, então já está conforme.
3. **Fixtures `.mjs` e `.json` em `tests/fixtures/` não mudam** — não são fonte
   TypeScript e são carregadas por caminho literal.
4. **`dist/` é artefato de build** — não é renomeado; é regenerado.
5. **Os 1067 imports precisam ser reescritos junto com os renames**, no mesmo
   commit. O `allowImportingTsExtensions` do `tsconfig.json` significa que os
   imports carregam a extensão `.ts` literal, então nenhum resolver conserta isso
   sozinho — um rename sem a reescrita quebra o build inteiro.

### Verificação

A migração é puramente mecânica e não pode alterar comportamento. O gate é que os
três comandos continuem verdes **com a suíte inalterada**:

```bash
npm run typecheck          # prova que os 1067 imports resolvem
npm test                   # prova que nenhum comportamento mudou
npm run check:architecture  # um-símbolo-por-arquivo e JSDoc seguem válidos
```

`scripts/check-source-architecture.mjs` não valida nomenclatura, então **nada
automatizado impede a convenção de regredir**. Uma checagem de nomenclatura fica
registrada como follow-up: ela pertence ao guardrail de CI desta feature (FR-007),
mas não é uma ação destrutiva, então entra como tarefa própria e não dentro do
módulo de guardrails.

### Sequenciamento e tensão com o Princípio IV

O Princípio IV exige que cada tarefa caiba em um commit. Um rename de 435 arquivos
tecnicamente cabe em um commit, mas é um commit que ninguém revisa linha a linha. A
mitigação é que o rename é **mecanicamente verificável**: se os três gates passam e o
diff contém exclusivamente renames e mudanças de string de import, ele está correto
por construção.

Para manter o diff auditável, a migração é o **último** trabalho da feature, depois
que as cinco lacunas funcionais estiverem implementadas e verdes. Fazê-la antes
forçaria todo o trabalho funcional a mirar caminhos que ainda vão mudar, e
embaralharia rename com lógica em cada commit subsequente — exatamente o que a
decisão de escopo quis evitar.

> **Nota de risco**: este é o item de maior custo de review da feature e o único que
> toca arquivos fora do escopo do spec 005. Ele entrou por decisão explícita de
> escopo no planejamento, não por derivação do spec. Se o custo de review se mostrar
> proibitivo na fase de tasks, extraí-lo para uma feature própria é a saída natural —
> as cinco lacunas funcionais não dependem dele.


## Project Structure

### Documentation (this feature)

```text
specs/005-mcp-server-security/
├── plan.md              # Este arquivo (saída do /speckit-plan)
├── research.md          # Saída da Fase 0 (/speckit-plan)
├── data-model.md        # Saída da Fase 1 (/speckit-plan)
├── quickstart.md        # Saída da Fase 1 (/speckit-plan)
├── contracts/           # Saída da Fase 1 (/speckit-plan)
│   ├── mcp-server-protocol.md
│   ├── guardrails.md
│   └── mcp-commands.md
├── checklists/
│   └── requirements.md  # Já existente
└── tasks.md             # Saída da Fase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

Nomes já na convenção de ponto do Princípio IX (ver "Migração de nomenclatura"). Os
arquivos marcados MODIFICADO aparecem com o nome **pós-migração**; seu nome atual
está em kebab-case.

```text
src/
├── guardrails/                              # ESCOPO NOVO (FR-007)
│   ├── contracts/
│   │   ├── destructive.action.kind.ts       # FR-010: apenas delete | overwrite
│   │   ├── destructive.action.ts            # kind + targetPath (sem overrideToken)
│   │   ├── guardrail.config.ts              # forma do .maia/guardrails.json
│   │   ├── guardrail.decision.ts            # allow | block + motivo
│   │   └── guardrail.violation.ts           # violação individual reportável
│   ├── policy/
│   │   ├── evaluate.guardrail.ts            # puro; fail-closed; sem override (FR-009)
│   │   ├── match.deny.pattern.ts            # puro
│   │   └── default.deny.patterns.ts
│   ├── config/
│   │   ├── load.guardrail.config.ts         # I/O na borda
│   │   └── parse.guardrail.config.ts        # puro; malformado ⇒ fail-closed
│   └── audit/
│       └── format.guardrail.decision.ts     # trilha auditável (FR-007, cenário 6.2)
│
├── agent/mcp/
│   ├── runtime/protocol/json-rpc/           # diretório mantém o hífen
│   │   └── negotiate.mcp.protocol.version.ts   # MODIFICADO: erro em vez de fallback
│   ├── runtime/transport/stdio/
│   │   ├── mcp.stdio.transport.ts              # MODIFICADO: stderr redigido, shutdown limpo
│   │   ├── assert.required.env.ts              # NOVO: falha cedo nomeando a variável
│   │   └── redact.secrets.from.stream.ts       # NOVO: puro
│   └── server/
│       └── stdio.ts                            # MODIFICADO: rejeição no initialize (nome já conforme)
│
└── cli/
    ├── commands/
    │   ├── guardrail.ts                        # NOVO: superfície de checagem/CI
    │   └── remove.ts                           # MODIFICADO: consulta o guardrail (FR-008)
    └── shared/guardrail/
        └── assert.path.allowed.ts              # NOVO: ponte comando → política

tests/
├── guardrails/
│   ├── match.deny.pattern.test.ts
│   ├── evaluate.guardrail.test.ts
│   ├── parse.guardrail.config.test.ts
│   └── guardrail.command.test.ts
├── tools/
│   ├── mcp.protocol.test.ts                    # ESTENDIDO: rejeição no initialize
│   ├── mcp.server.test.ts                      # ESTENDIDO: desconexão no meio
│   ├── mcp.manager.test.ts                     # ESTENDIDO: casos de SC-002 ainda descobertos
│   └── mcp.env.isolation.test.ts               # NOVO: redação de stderr (SC-003)
└── cli/
    └── remove.test.ts                          # ESTENDIDO: bloqueio pelo guardrail (FR-008)

scripts/
├── check-guardrails.mjs                        # NOVO: usado pelo hook e pelo CI
└── rename-to-dot-convention.mjs                # NOVO: migração mecânica do Princípio IX

.githooks/
└── pre-commit                                  # NOVO: shell, sem dependência
```

Os arquivos em `scripts/` e o hook mantêm suas grafias: o Princípio IX rege fonte
TypeScript, e `scripts/` já usa kebab-case em `.mjs` (`check-source-architecture.mjs`,
`build-publish.mjs`, `run-tests.mjs`). Trocar a grafia lá criaria inconsistência
dentro do próprio diretório sem ganho.

**Structure Decision**: Projeto único, seguindo a organização por escopo já vigente
(Princípio VI). Guardrails ganham o escopo de topo `src/guardrails/` em vez de serem
enfiados em `src/cli/` porque são política de sistema consumida por três chamadores
distintos (CLI, hook de pre-commit, CI) — colocá-los sob `cli/` inverteria a
dependência. As correções de MCP ficam nos diretórios que já as contêm, sem novo
escopo.

O hook vive em `.githooks/` (versionado) e é ativado por
`git config core.hooksPath .githooks`, feito por `npm run guardrails:install`. Isso
mantém o hook auditável no repositório, ao contrário de `.git/hooks/`, que não é
versionável — e evita adicionar `husky` como dependência (Decision 3 em research.md).

## Constitution Check — reavaliação pós-design (revisão 2)

Reavaliado após a clarificação de 2026-09-22 e as correções da análise de
consistência. **Nenhuma violação nova**; duas avaliações melhoraram:

| Princípio | Efeito da revisão 2 |
|-----------|---------------------|
| **II. Security by Default** | **Reforçado.** FR-009 elimina o override em runtime, que seria um bypass acionável pelo próprio agente que a política deveria conter. FR-008 fecha a única exclusão irreversível do CLI (`maia remove`), que a revisão 1 deixava sem checagem. |
| **VII. Clean Code** | **Reforçado.** FR-010 remove dois `DestructiveActionKind` sem produtor e elimina `classify` como símbolo próprio; a correção F1 evita um teste duplicado de SC-002. Menos código morto do que a revisão 1 previa. |
| I, III, IV, V, VI, VIII, IX | Inalterados. ✅ PASS |

**Resultado**: nenhuma violação. Complexity Tracking segue vazia.

## Complexity Tracking

> Preencher SOMENTE se o Constitution Check tiver violações que precisem de justificativa.

Nenhuma violação. Tabela intencionalmente vazia.
