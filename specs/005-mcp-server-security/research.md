# Research: Servidor MCP & Segurança de Runtime

**Feature**: `005-mcp-server-security` | **Date**: 2026-09-22 | **Plan**: [plan.md](./plan.md)

## Contexto

O spec não deixou nenhum marcador `[NEEDS CLARIFICATION]`, e o checklist de
requisitos passa em todos os itens. A pesquisa desta fase, portanto, não é sobre
resolver ambiguidade do spec — é sobre resolver as escolhas de implementação que o
levantamento do código existente abriu, já que quatro dos sete requisitos estão
implementados e a feature é majoritariamente de fechamento de lacuna, não de
construção do zero.

Cada decisão abaixo corresponde a uma das cinco lacunas listadas no Summary do plano.

As Decisions 7–9 vieram da sessão de clarificação de 2026-09-22, posterior à revisão 1
deste documento, e estreitam o escopo de guardrails (FR-008, FR-009, FR-010).

---

## Decision 1 — Rejeitar revisão de protocolo incompatível no `initialize`

**Decisão**: Substituir o fallback silencioso de `negotiateMcpProtocolVersion` por
uma distinção de três casos, e reportar o terceiro como erro JSON-RPC:

| Caso | Entrada | Comportamento |
|------|---------|---------------|
| A | `protocolVersion` ausente | Usa `MCP_LEGACY_PROTOCOL_VERSIONS[0]`. **Mantém** o comportamento atual. |
| B | `protocolVersion` suportada | Ecoa a revisão pedida. **Mantém** o comportamento atual. |
| C | `protocolVersion` presente mas não suportada | **NOVO**: erro `-32602` com `data.supported` listando as revisões aceitas. |

A função pura passa a retornar um resultado discriminado (`negotiated` vs.
`unsupported`) em vez de sempre uma string, e `handleInitialize` traduz o segundo
caso em `JsonRpcFailure`.

**Rationale**: O Acceptance Scenario 3.2 exige rejeição explícita "em vez de tentar
uma reinterpretação silenciosa", e SC-001 exige 100% de rejeição com zero falhas
silenciosas. Hoje o caminho moderno (`_meta` com `io.modelcontextprotocol/protocolVersion`)
cumpre isso via `-32022`, mas o caminho legado `initialize` não: pedir
`"protocolVersion": "1999-01-01"` retorna sucesso com `2025-11-25`, e o cliente
segue acreditando que sua revisão foi aceita. A distinção entre os casos A e C é o
ponto crítico — a especificação do MCP permite omitir a revisão, então tratar
"ausente" como erro quebraria clientes conformes sem ganho de segurança.

**Código de erro**: `-32602` (Invalid params) e não `-32022`. O `-32022` é o código
definido pela era moderna e stateless para incompatibilidade de versão; reutilizá-lo
no handshake legado misturaria vocabulários de duas eras do protocolo. `-32602` é o
código padrão do JSON-RPC para um parâmetro cujo valor é inaceitável, que é
precisamente o caso. O `data.supported` carrega a informação acionável.

**Alternatives considered**:
- *Manter o fallback e apenas logar um aviso*: rejeitado — viola SC-001 diretamente;
  um aviso em stderr não é "rejeição com erro identificável" e, num servidor stdio,
  ninguém o lê.
- *Rejeitar também quando `protocolVersion` está ausente*: rejeitado — a
  especificação do MCP trata o campo como opcional no `initialize`; isso quebraria
  clientes conformes e não fecha nenhum furo de segurança.
- *Reutilizar `-32022` nos dois caminhos*: rejeitado pela mistura de vocabulários
  descrita acima; além disso, `-32022` está fora da faixa reservada do JSON-RPC e
  clientes legados não o reconhecem.

---

## Decision 2 — Falhar cedo quando uma variável declarada está ausente

**Decisão**: Antes de `spawn`, verificar que toda variável referenciada via
placeholder (`${env:VAR}` ou `{VAR}`) na configuração do MCP tem valor resolvido e não-vazio. Se
alguma faltar, lançar erro nomeando **todas** as variáveis faltantes de uma vez,
antes de o processo subir.

**Rationale**: Este é o edge case que o spec levanta ("O que acontece quando uma
variável de ambiente obrigatória declarada está ausente no início do processo do
MCP?"). Hoje `resolveEnvPlaceholders` resolve o placeholder para string vazia, o
processo sobe com uma credencial vazia, e falha mais tarde com um erro de transporte
(`MCP process exited (code=1, signal=null)`) que não menciona qual variável faltou.
Falhar antes do spawn dá uma mensagem acionável e evita um processo-zumbi.

Reportar todas de uma vez, e não a primeira, segue a mesma decisão já tomada na
feature 004 para `verifySourceLock` (relato agregado) — é a mesma classe de problema
e a inconsistência seria arbitrária.

**Nota de segurança**: a mensagem de erro nomeia a *variável*, nunca um valor
parcial. Isso é o que o FR-006 permite ("apenas o nome/referência da variável
aparece").

**Alternatives considered**:
- *Deixar o processo subir e falhar depois*: comportamento atual; rejeitado pela
  mensagem não-acionável e pelo processo-zumbi.
- *Substituir por string vazia silenciosamente*: rejeitado — é o comportamento atual
  de fato e mascara erro de configuração como falha de runtime.
- *Tratar variável vazia como válida*: rejeitado — uma credencial vazia nunca é
  intencional; se um MCP aceita valor vazio, ele não deveria declarar a variável.

---

## Decision 3 — Guardrails sem dependência nova, hook versionado em `.githooks/`

**Decisão**: Implementar o guardrail de pre-commit como um script shell em
`.githooks/pre-commit` que invoca `node scripts/check-guardrails.mjs`, ativado por
`git config core.hooksPath .githooks`. Sem `husky`, sem `lint-staged`.

A mesma checagem roda como step do CI, de modo que o hook é conveniência local e o
CI é o gate que não pode ser contornado por `--no-verify`.

**Rationale**: O `package.json` tem exatamente duas devDependencies (`@types/node`,
`typescript`) e zero dependências de runtime — é uma postura deliberada do projeto.
Adicionar `husky` traria uma árvore de dependências inteira para gerar um arquivo de
três linhas que podemos versionar diretamente. `core.hooksPath` é nativo do git desde
2.9 e torna o hook auditável no repositório, ao contrário de `.git/hooks/`, que não é
versionável — e a auditabilidade é exatamente o que o Princípio II exige de um
guardrail.

O ponto crítico é que **`--no-verify` existe e não pode ser desabilitado**. Um hook
sozinho não satisfaz SC-004 ("100% das ações destrutivas são bloqueadas"), porque
qualquer um pode contorná-lo. Por isso a checagem é dupla: hook local para feedback
rápido, step de CI para o gate real. Isso espelha a estrutura que a feature 004 já
estabeleceu para o lockfile.

**Alternatives considered**:
- *`husky`*: rejeitado pela dependência nova contra a postura zero-dep do projeto.
- *Apenas o hook, sem CI*: rejeitado — `--no-verify` torna SC-004 falso.
- *Apenas o CI, sem hook*: viável e seguro, mas o feedback só chega depois do push;
  o hook custa três linhas e encurta o ciclo. Ambos são mantidos.
- *Escrever em `.git/hooks/` no `postinstall`*: rejeitado — não é versionável, não é
  auditável, e um `postinstall` que mexe na configuração do git do usuário é
  intrusivo.

---

## Decision 4 — Configuração de guardrail malformada é fail-closed

**Decisão**: Quando `.maia/guardrails.json` existe mas não faz parse, ou não casa
com o schema esperado, a avaliação **bloqueia toda ação destrutiva** e reporta o erro
de parse. Quando o arquivo simplesmente não existe, aplicam-se os
`DEFAULT_DENY_PATTERNS` embutidos.

**Rationale**: Este é o edge case que o spec levanta ("Como o sistema lida com uma
configuração de guardrail que está, ela própria, malformada?"). Um guardrail que
falha aberto não é um guardrail — é uma falsa sensação de segurança, e pior que não
ter nenhum, porque o usuário acredita estar protegido. O Princípio II diz que ações
destrutivas "MUST be blocked by guardrails... never by relying on model or reviewer
discretion"; uma config quebrada que libera tudo delega exatamente para essa
discrição.

A distinção entre "ausente" e "malformado" importa: ausente é o estado normal de um
projeto que nunca configurou nada, e bloquear tudo nesse caso tornaria o Maia
inutilizável na primeira execução. Malformado é um estado que alguém criou e que
indica um problema real.

**Alternatives considered**:
- *Fail-open com aviso*: rejeitado pelo raciocínio acima — é a falha silenciosa que
  o spec inteiro tenta eliminar.
- *Cair para os defaults quando malformado*: rejeitado — mascara o erro de
  configuração e o usuário segue com uma política que não é a que ele escreveu, sem
  perceber.
- *Bloquear também quando ausente*: rejeitado por tornar a primeira execução
  inviável; os defaults embutidos já cobrem o caso comum.

---

## Decision 5 — Redação de segredos no stderr do subprocesso

**Decisão**: Interceptar o stderr do processo filho e substituir qualquer ocorrência
literal de um valor de credencial conhecido por `[REDACTED:<NOME_DA_VAR>]` antes de
escrever em `process.stderr`. O conjunto de valores a redigir é exatamente o conjunto
já resolvido em `resolveRuntimeEnv` para aquele processo.

**Rationale**: `McpStdioTransport` hoje repassa stderr cru
(`this.child.stderr.on('data', chunk => process.stderr.write(chunk))`). MCPs em modo
debug comumente ecoam sua configuração efetiva, incluindo tokens. SC-003 exige zero
valores de segredo na saída "ao longo de um ciclo completo de instalação e execução",
e o ciclo de execução inclui o stderr que o Maia repassa. Como o Maia é quem escolheu
injetar aquele valor no processo, ele sabe exatamente qual string procurar — a
redação é precisa, não heurística.

Substituir pelo nome da variável preserva a utilidade diagnóstica: quem lê o log
ainda entende *qual* credencial o MCP estava usando, sem ver o valor.

**Limite conhecido e aceito**: se o MCP transformar o valor antes de imprimi-lo
(base64, truncamento, hash), o casamento literal não pega. Redação por casamento de
substring não é uma barreira criptográfica e não se pretende exaustiva; ela elimina a
via de vazamento comum e direta. A barreira real continua sendo o isolamento de
ambiente da Decision de FR-005 (já implementado), que garante que o processo só
recebe as variáveis que declarou.

**Valores curtos**: valores com menos de 8 caracteres não são redigidos, porque
substrings curtas casariam com texto não-relacionado e destruiriam o log. Credenciais
reais excedem esse limite folgadamente.

**Alternatives considered**:
- *Descartar o stderr inteiro*: rejeitado — elimina o vazamento mas também toda a
  capacidade de diagnosticar um MCP que não sobe.
- *Redação por heurística de padrão* (regex para formatos de token conhecidos):
  rejeitado como mecanismo primário — gera falso positivo e falso negativo, enquanto
  o casamento literal contra os valores efetivamente injetados é exato.
- *Escrever o stderr em arquivo em vez do terminal*: rejeitado — apenas move o
  vazamento do terminal para o disco, e SC-003 cobre ambos.

---

## Decision 6 — Desconexão no meio da requisição

**Decisão**: No `close` do readline, parar de aceitar novas requisições, aguardar
`shutdownAll()` do `AgentMcpManager` com um teto de tempo, e só então sair. Sair com
código `0` na conclusão limpa e `1` se o teto for atingido.

**Rationale**: Este é o edge case que o spec levanta ("O que acontece quando um
cliente MCP se desconecta no meio de uma requisição?"). Hoje `rl.on('close')` é um
handler `async` cujo `await this.mcpManager.shutdownAll()` nunca é aguardado por
ninguém — `process.exit(0)` está dentro do mesmo handler, mas o handler em si não é
esperado pelo runtime, e `process.exit` é síncrono e imediato. Sessões de MCP filhas
podem sobreviver ao pai, virando processos órfãos que seguram credenciais em memória.

O teto de tempo evita o oposto: um MCP que não responde ao shutdown não pode
impedir o Maia de terminar.

**Alternatives considered**:
- *`process.exit(0)` imediato*: comportamento atual; rejeitado pelos órfãos.
- *Aguardar indefinidamente*: rejeitado — um MCP travado penduraria o Maia para
  sempre.
- *Responder às requisições pendentes antes de sair*: rejeitado — o cliente já se
  desconectou, não há para onde enviar; o que importa é liberar os recursos.

---

## Decision 7 — Nenhum override em runtime (FR-009)

**Decisão**: Uma ação destrutiva bloqueada não tem mecanismo de bypass. Remover
`overrideToken` de `DestructiveAction` e `allowOverrides` de `GuardrailConfig`.
Alterar a deny list configurada é a única forma de permitir uma ação que ela bloqueia.

**Rationale**: Nenhum cenário de aceite do spec exige override, e o default previsto
na revisão 1 já era `allowOverrides: false` — o mecanismo existiria sem nenhum caso de
uso. O Princípio II diz que ações destrutivas devem ser bloqueadas por guardrails
"never by relying on model or reviewer discretion"; um token de bypass em runtime é
exatamente essa discrição, com a agravante de ser acionável pelo próprio agente que a
política deveria conter. Código sem chamador também viola o Princípio VII.

A deny list continua sendo o ponto de flexibilidade: quem precisa permitir um caminho
edita a config, e essa edição é versionada e revisável — diferente de um token passado
em runtime, que não deixa rastro no repositório.

**Alternatives considered**:
- *Flag de CLI `--allow-destructive`*: rejeitada — um agente que executa comandos pode
  passar a flag sozinho, o que anula o guardrail no exato cenário que o Princípio II
  descreve.
- *Token na config*: rejeitada — duplica o que a deny list já faz, com uma superfície
  a mais para errar.
- *Confirmação interativa*: rejeitada — o pre-commit e o CI são não-interativos, então
  a confirmação teria que virar bloqueio automático nos dois pontos que mais importam.

---

## Decision 8 — Quatro pontos de aplicação, incluindo o `remove` (FR-008)

**Decisão**: O guardrail é consultado em quatro pontos: o comando `maia guardrail
check`, o hook de pre-commit, o gate de CI, e o `maia remove` antes de apagar qualquer
arquivo materializado.

**Rationale**: A revisão 1 previa apenas os três primeiros, todos sobre arquivos
*staged* no git. Isso deixaria SC-004 verdadeiro no papel e falso na prática: o
`maia remove` chama `removeMaterializedFile`, que faz `rmSync` no arquivo instalado,
e o próprio código reconhece que a operação não tem volta — o comentário em
`remove.ts` diz que a deleção "is not un-deletable in general (its original content is
not retained here)". É a exclusão irreversível que o FR-007 nomeia, e passava sem
nenhuma checagem.

**Ponto de inserção**: a consulta entra **antes** do `withRollback`, não como um passo
dentro dele. Um passo que falha aciona o rollback dos anteriores; mas aqui não há nada
a desfazer — a intenção é nunca começar. Falhar antes mantém o manifesto e o lockfile
intocados e dá a mensagem de bloqueio sem efeito colateral.

**Verificação de que o guardrail não bloqueia o uso normal**: os alvos do `remove` são
`skills/<nome>.ts` e `tools/<nome>.mjs`; nenhum dos padrões default (`**/*.env`,
`**/credentials/**`) casa com eles. Uma remoção comum segue funcionando.

**Alternatives considered**:
- *Só os três pontos de git*: rejeitada pelo raciocínio acima — deixa a única exclusão
  irreversível do CLI sem cobertura.
- *Estender a install, lock, context e sync*: rejeitada nesta iteração — essas escrevem
  arquivos que elas mesmas geram, e o benefício não justifica o acoplamento. Entram
  quando houver caso concreto.
- *Camada obrigatória em toda escrita*: rejeitada — exigiria refatorar todo o acesso a
  disco do projeto, muito além do escopo de 005, e contra o Princípio IV.

---

## Decision 9 — Classificação por caminho, dois kinds (FR-010)

**Decisão**: A decisão do guardrail é caminho do alvo × deny list. Os
`DestructiveActionKind` reconhecidos reduzem-se a `file-delete` e `file-overwrite`,
derivados do contexto do chamador, não declarados por ele.

**Rationale**: A revisão 1 previa quatro kinds (`file-delete`, `file-overwrite`,
`config-rewrite`, `command-declared`), mas os dois últimos não teriam nenhum produtor:
o único ponto de entrada é `maia guardrail check <caminho>`, que recebe caminhos, e o
`maia remove`, que também entrega um caminho. Definir um tipo de operação sem chamador
é código morto por construção (Princípio VII).

Decidir por caminho também mantém a política **auditável no repositório**: a deny list
é uma lista de padrões que qualquer pessoa lê e revisa, enquanto uma política por tipo
de operação dependeria de cada chamador se classificar corretamente — exatamente a
"discrição" que o Princípio II proíbe.

**Consequência sobre `classify`**: a função de classificação some como símbolo próprio.
O `kind` vem do chamador (o `remove` sabe que apaga; o pre-commit sabe que sobrescreve)
e serve apenas para a mensagem de auditoria, nunca para a decisão de bloquear.

**Alternatives considered**:
- *Caminho mais kind declarado*: rejeitada — mantém quatro kinds sem produtor e confia
  na autoclassificação do chamador.
- *Só por tipo de operação*: rejeitada — a deny list deixaria de ser uma lista de
  caminhos legível e revisável.
- *Caminho e operação, ambos obrigatórios*: rejeitada — dobra a superfície de
  configuração sem fechar nenhuma lacuna que o casamento por caminho deixe aberta.

---

## Baseline confirmado (sem mudança de código)

Estes requisitos foram verificados como implementados e corretos; a única pendência
é **teste**, não código:

- **FR-001** — `mcpCommand` implementa `sync`, `find` e `add`/`install`.
- **FR-002** — `McpStdioServer` serve sobre stdin/stdout com framing newline-delimited.
- **FR-003** — `dynamicDiscovery` recoleta a cada `tools/list`; `agentId` propaga até
  `canLlmAccessResource`, que aplica a política de acesso por LLM.
- **FR-005** — `resolveSafeInheritedEnv` monta o ambiente do filho a partir de uma
  allow-list fechada (`SAFE_INHERITED_ENV_KEYS`: `PATH`, `TMPDIR`, `LANG`, etc.) mais
  o que o MCP declarou. Não há herança de `process.env` completo. **SC-002 é
  verdadeiro hoje e já tem teste**: `'passes only explicitly declared credentials to
  stdio MCP processes'` em `tests/tools/mcp-manager.test.ts` cobre os três casos
  centrais. Restam descobertos apenas dois casos, tratados como extensão daquele
  arquivo: MCP que não declara nenhuma variável, e variável obrigatória ausente no
  start.

O edge case "dois clientes se identificando como o mesmo agente simultaneamente" não
gera trabalho: o servidor stdio atende um cliente por processo, e o `agentId` vem de
flag na inicialização (`--agent`), não por requisição. Dois clientes são dois
processos, cada um com seu catálogo e suas sessões. Registrado aqui para que a
ausência seja deliberada e não um esquecimento.

O edge case "descoberta dinâmica encontra capacidade não autorizada para o agente"
também já está resolvido: `collectLocalEntries` e `collectMcpEntries` recebem
`agentId` e filtram na coleta, então a capacidade não autorizada nunca entra na lista
— ela não é listada e depois barrada, ela não é listada.
