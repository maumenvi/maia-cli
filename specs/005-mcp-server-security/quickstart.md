# Quickstart: Validação de Servidor MCP & Segurança de Runtime

**Feature**: `005-mcp-server-security` | **Date**: 2026-09-22 | **Plan**: [plan.md](./plan.md)

Guia de validação executável. Cada cenário mapeia para um critério de sucesso do
[spec](./spec.md) e indica o teste que precisa existir. Detalhes de comportamento
estão em [contracts/](./contracts/) e [data-model.md](./data-model.md) — não são
repetidos aqui.

## Pré-requisitos

```bash
node --version    # ≥ 26
npm ci
npm run typecheck # deve estar verde antes de começar
npm test          # deve estar verde antes de começar
```

Princípio I da Constituição: typecheck e suíte verdes o tempo todo. Uma tarefa não
está completa enquanto qualquer um dos dois estiver vermelho.

---

## Ordem de execução

As cinco lacunas são independentes e cada uma cabe em um commit (Princípio IV). A
ordem abaixo é por risco decrescente, não por dependência técnica.

| # | Lacuna | Escopo | Critério |
|---|--------|--------|----------|
| 1 | Guardrails ausentes | `src/guardrails/`, `scripts/`, `.githooks/`, CI | SC-004 |
| 2 | Rejeição de versão no `initialize` | `protocol/json-rpc/`, `server/stdio.ts` | SC-001 |
| 3 | Vazamento por stderr | `transport/stdio/` | SC-003 |
| 4 | Variável obrigatória ausente | `transport/stdio/` | edge case |
| 5 | Desconexão no meio da requisição | `server/stdio.ts` | edge case |
| 6 | Baseline: casos de SC-002 ainda descobertos | `tests/` | SC-002 |
| 7 | Migração de nomenclatura | repositório inteiro | Princípio IX |

---

## Cenário 1 — Guardrails bloqueiam ação destrutiva *(SC-004, FR-007)*

O único requisito sem implementação prévia.

**Setup**:
```bash
npm run guardrails:install   # git config core.hooksPath .githooks
```

**Validação**:
```bash
# Sem config: defaults embutidos aplicam
maia guardrail check .maia/mcp.env      # esperado: bloqueado, exit 1

# Config malformada: fail-closed
echo '{ nao é json' > .maia/guardrails.json
maia guardrail check qualquer-arquivo.txt   # esperado: bloqueado, exit 2
rm .maia/guardrails.json

# Caminho fora do workspace: sempre bloqueado
maia guardrail check /etc/passwd         # esperado: bloqueado, exit 1

# Caminho comum: permitido e auditável
maia guardrail check src/cli/index.ts    # esperado: permitido, exit 0
```

**Sem override (FR-009)**: não existe flag, token ou confirmação que converta um
bloqueio em permissão. A única forma de liberar um caminho é editar `denyPatterns`.

**Decisão por caminho (FR-010)**: o mesmo caminho recebe o mesmo veredito
independentemente de qual chamador o submeteu. O `kind` da ação entra na trilha de
auditoria, nunca na decisão — verificável submetendo o mesmo alvo pelo comando de
consulta e pelo `maia remove` e conferindo que o veredito coincide.

**Quarto ponto — `maia remove` (FR-008)**:

```bash
# Uso normal segue funcionando (skills/ e tools/ não casam com os defaults)
maia remove tool <nome>                  # esperado: removido, exit 0

# Com uma deny list que cubra o alvo, a remoção é bloqueada ANTES de apagar
echo '{"version":1,"denyPatterns":["tools/**"]}' > .maia/guardrails.json
maia remove tool <nome>                  # esperado: bloqueado, exit != 0
# e o arquivo continua lá, com manifesto e lockfile intocados
```

**Hook**: tentar commitar um arquivo que casa com um padrão de deny deve falhar o
commit. Depois confirmar que o mesmo commit passa com `--no-verify` — e que o **CI o
barra mesmo assim**. Essa segunda metade é o que torna SC-004 verdadeiro; sem ela o
hook é só conveniência.

**Testes exigidos**:
- `tests/guardrails/match.deny.pattern.test.ts` — casamento glob positivo, negativo e
  em subdiretório.
- `tests/guardrails/evaluate.guardrail.test.ts` — allow, block, agregação de múltiplas
  violações, caminho fora do workspace. **Sem casos de override** (FR-009).
- `tests/guardrails/parse.guardrail.config.test.ts` — ausente ⇒ defaults; válido ⇒
  defaults + declarados; malformado ⇒ fail-closed; `version` desconhecida ⇒
  fail-closed.
- `tests/guardrails/guardrail.command.test.ts` — códigos de saída 0/1/2.
- `tests/cli/remove.test.ts` (estendido) — remoção bloqueada não apaga arquivo nem
  altera manifesto/lockfile; remoção permitida segue funcionando (os 6 testes
  existentes continuam verdes).

---

## Cenário 2 — Revisão de protocolo incompatível é rejeitada *(SC-001, FR-004)*

**Validação manual**:
```bash
# Revisão não suportada ⇒ erro, NÃO sucesso com revisão trocada
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"1999-01-01"}}' \
  | maia mcp-server
# esperado: error -32602 com data.supported

# Revisão ausente ⇒ continua funcionando (comportamento conforme ao MCP)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | maia mcp-server
# esperado: result com a revisão default

# JSON inválido
echo 'nao é json' | maia mcp-server        # esperado: -32700

# Forma inválida
echo '{"foo":"bar"}' | maia mcp-server     # esperado: -32600
```

**Testes exigidos** — estender `tests/tools/mcp.protocol.test.ts`:
- `initialize` com revisão não suportada ⇒ `-32602` com `data.supported`.
- `initialize` sem `protocolVersion` ⇒ sucesso com o default (prova que o caso A da
  Decision 1 não regrediu).
- `initialize` com cada revisão legada suportada ⇒ ecoa a revisão pedida.
- Cobertura já existente de `-32700`, `-32600`, `-32022`, `-32601` permanece verde.

**Atenção à regressão**: o risco real aqui é tratar "ausente" como erro. O teste do
segundo item é o que impede isso.

---

## Cenário 3 — Segredos não vazam pelo stderr *(SC-003, FR-006)*

**Validação**: configurar um MCP fixture cujo processo imprime sua configuração
efetiva em stderr, incluindo o valor da credencial. Rodar e inspecionar a saída.

```bash
maia mcp add <fixture-que-ecoa-config> 2>captura.txt
grep -F "$VALOR_DA_CREDENCIAL" captura.txt   # esperado: nenhum resultado
grep -F "[REDACTED:" captura.txt             # esperado: ao menos um resultado
rm captura.txt
```

O segundo `grep` importa tanto quanto o primeiro: ele prova que a linha chegou ao
usuário **redigida**, e não que ela simplesmente sumiu.

**Testes exigidos** — em `tests/tools/mcp.env.isolation.test.ts` (arquivo novo, dedicado à redação de stderr; o isolamento de ambiente em si já vive em `mcp.manager.test.ts`):
- Valor injetado que aparece no stderr do filho sai como `[REDACTED:<NOME>]`.
- Valor com menos de 8 caracteres não é redigido (evita destruir o log).
- Texto não relacionado passa intacto.

**Limite aceito**: se o MCP transformar o valor antes de imprimir (base64, hash), o
casamento literal não pega. Documentado na Decision 5 do [research.md](./research.md);
a barreira primária continua sendo o isolamento de ambiente.

---

## Cenário 4 — Variável obrigatória ausente falha cedo

**Validação**: configurar um MCP que referencia `${env:TOKEN_INEXISTENTE}` sem valor em
`.maia/mcp.env`.

Esperado: falha **antes** do spawn, nomeando a variável. Múltiplas faltantes são
reportadas todas de uma vez. A mensagem nunca mostra valor parcial.

**Testes exigidos**:
- Uma variável faltante ⇒ erro nomeando-a; nenhum processo foi spawnado.
- Três faltantes ⇒ as três na mesma mensagem.
- Variável presente mas vazia ⇒ tratada como faltante.
- Todas presentes ⇒ spawn normal.

---

## Cenário 5 — Desconexão no meio da requisição

**Validação**: iniciar o servidor, enviar uma requisição que demora, fechar stdin
antes da resposta.

Esperado: as sessões de MCP filhas são encerradas, nenhum processo órfão sobrevive, e
o Maia sai — `0` na conclusão limpa, `1` se o teto de tempo for atingido.

```bash
# Após o teste, nenhum processo filho deve restar
ps -eo pid,ppid,cmd | grep -i mcp    # esperado: nenhum órfão
```

**Testes exigidos** — estender `tests/tools/mcp.server.test.ts`:
- Fechar stdin com requisição pendente ⇒ shutdown chamado, sem órfão.
- MCP que não responde ao shutdown ⇒ o teto de tempo dispara e o processo sai.

---

## Cenário 6 — Regressão do baseline *(SC-002, FR-001/002/003/005)*

Estes requisitos **já estão corretos no código e SC-002 já tem teste**. A revisão 1
deste guia afirmava que nada provava SC-002 — era falso. O teste
`'passes only explicitly declared credentials to stdio MCP processes'`, em
`tests/tools/mcp.manager.test.ts`, já cobre os três casos centrais: a variável
declarada chega ao filho, a variável-fonte do pai não chega, e um segredo
não-declarado não vaza.

**O que falta** — estender aquele arquivo, **não** recriar o que já existe:
- Um MCP que **não declara nenhuma** variável não recebe segredo do ambiente pai
  (Acceptance Scenario 4.2) — caso ainda descoberto.
- Variável obrigatória ausente no start (ver Cenário 4).

**Baseline já coberto, deve permanecer verde**: `tests/tools/mcp.server.test.ts`
(init/list/call e proxy de MCP), `tests/tools/mcp.manager.test.ts`,
`tests/cli/mcp.registry.test.ts`.

---

## Cenário 7 — Migração de nomenclatura *(Princípio IX)*

**Sempre por último.** Ver "Migração de nomenclatura" no [plan.md](./plan.md) para o
escopo medido (413 arquivos em `src/`, 22 em `tests/`, 1067 imports) e as restrições.

**Pré-condição**: cenários 1–6 implementados, e os três gates verdes. A migração parte
de uma base estável, senão um teste vermelho fica ambíguo entre "a lógica quebrou" e
"o rename quebrou".

```bash
# 0. Base limpa — o diff da migração precisa conter SÓ renames e imports
git status --porcelain     # esperado: vazio

# 1. Executar a migração (git mv + reescrita dos imports)
node scripts/rename-to-dot-convention.mjs

# 2. Os três gates, com a suíte INALTERADA
npm run typecheck          # prova que os 1067 imports resolvem
npm test                   # prova que nenhum comportamento mudou
npm run check:architecture
```

**Verificação do diff** — a migração é mecânica; o diff tem que provar isso:

```bash
# Todo arquivo .ts alterado deve ser rename (R) ou mudança só de import
git diff --cached --name-status -M | grep -v '^R' | grep '\.ts$'
# esperado: só os arquivos cujos imports foram reescritos

# Nenhum arquivo de fonte sobrou com hífen
find src tests -name '*.ts' -exec basename {} \; | grep -e '-'
# esperado: nenhum resultado

# O entrypoint publicado não mudou
test -f src/cli/index.ts && echo "entrypoint intacto"
```

**Verificação do pacote** — `src/cli/index.ts` é referenciado por `package.json`
(`bin`, `dev`, `maia`). Um rename acidental ali quebraria a publicação sem quebrar
nenhum teste:

```bash
npm pack --dry-run
node src/cli/index.ts help     # o mesmo smoke test que o CI roda
```

**Critério de aceite**: os três gates verdes, zero arquivos de fonte com hífen, e o
diff contendo exclusivamente renames e mudanças de string de import. Nenhuma alteração
de lógica, nenhum teste adicionado ou modificado neste commit.

**Follow-up registrado**: nada automatizado impede a convenção de regredir —
`check-source-architecture.mjs` valida um-símbolo-por-arquivo e JSDoc, mas não
nomenclatura. Uma checagem de nomes é tarefa própria, fora do módulo de guardrails
(um nome fora da convenção não é uma ação destrutiva).

---

## Validação final

```bash
npm run typecheck
npm test
npm run check:architecture
npm run guardrails:check     # o mesmo gate que roda no CI
```

Os quatro verdes. Conforme o Princípio I, uma tarefa não está completa enquanto
qualquer um estiver vermelho.

```bash
# Princípio IX: nenhum arquivo de fonte com hífen
find src tests -name '*.ts' -exec basename {} \; | grep -e '-'   # esperado: vazio
```

### Mapa de cobertura dos critérios

| Critério | Estado antes | Cenário que o prova |
|----------|--------------|---------------------|
| SC-001 — 100% de mensagens inválidas rejeitadas | **Falso** (fallback no `initialize`) | 2 |
| SC-002 — 100% dos processos sem ambiente extra | Verdadeiro, **já testado** | 6 (estende casos descobertos) |
| SC-003 — zero segredos na saída | **Falso** (stderr cru) | 3 |
| SC-004 — 100% das ações destrutivas bloqueadas, nos 4 pontos do FR-008 | **Falso** (sem guardrails) | 1 |
