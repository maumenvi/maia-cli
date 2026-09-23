# Contract: Guardrails de Ações Destrutivas

**Feature**: `005-mcp-server-security` | **Requisito**: FR-007 | **Critério**: SC-004

Este é o único requisito da feature sem nenhuma implementação prévia.

## Superfícies

A mesma avaliação é exposta em três pontos. Os três compartilham o mesmo módulo puro
de política — a lógica não é duplicada.

Quatro pontos de aplicação (FR-008). Todos compartilham o mesmo módulo puro de
política — a lógica não é duplicada.

| Superfície | Invocação | Papel |
|------------|-----------|-------|
| CLI | `maia guardrail check <caminho...>` | Consulta manual e uso por scripts. |
| Pre-commit | `.githooks/pre-commit` | Feedback local rápido. Contornável com `--no-verify`. |
| CI | step em `.github/workflows/ci.yml` | **Gate real** para o que é commitado. Não contornável. |
| `maia remove` | consulta interna antes de apagar | **Gate de runtime**: a única exclusão irreversível do CLI. |

O hook local não é suficiente sozinho: `--no-verify` existe e não pode ser
desabilitado. SC-004 ("100% bloqueadas") só é verdadeiro porque o CI repete a
checagem.

Os três primeiros pontos cobrem arquivos *staged* no git. O quarto cobre o que nenhum
deles alcança: `maia remove` chama `rmSync` sobre o arquivo materializado, e o próprio
código reconhece que a operação não tem volta. Sem esse ponto, SC-004 seria verdadeiro
no papel e falso na prática.

**Ativação do hook**: `npm run guardrails:install` executa
`git config core.hooksPath .githooks`. O hook é versionado, portanto auditável —
`.git/hooks/` não seria.

## Configuração

Arquivo: `.maia/guardrails.json`

```jsonc
{
  "version": 1,
  "denyPatterns": ["**/*.env", "**/credentials/**"]
}
```

Não há campo de override: um bloqueio só se desfaz editando `denyPatterns` (FR-009).
O arquivo é config do projeto que usa o Maia, resolvido a partir do cwd.

| Estado do arquivo | Comportamento |
|-------------------|---------------|
| Ausente | Usa `DEFAULT_DENY_PATTERNS` embutidos. Não é erro. |
| Válido | Defaults **mais** os padrões declarados. Uma config nunca afrouxa o baseline. |
| Não-parseável, `version` desconhecida, ou schema inválido | **Bloqueia toda ação destrutiva** e reporta o erro de parse. |

A última linha é fail-closed por decisão explícita: um guardrail que falha aberto é
pior que nenhum, porque o usuário acredita estar protegido.

## Avaliação

**Entrada**: `DestructiveAction` — `kind`, `targetPath`, `reason?`. A decisão usa
**apenas** `targetPath`; o `kind` vai só para a auditoria (FR-010).

**Saída**: `GuardrailDecision` — `allow` com nota de auditoria, ou `block` com a lista
**agregada** de violações (todas de uma vez, não a primeira).

Regras, em ordem:

1. `targetPath` resolvido para fora da raiz do workspace ⇒ **block**, sempre.
2. Config malformada ⇒ **block**, com violação `<malformed-config>`.
3. `targetPath` casa com algum padrão de deny ⇒ **block**.
4. Caso contrário ⇒ **allow**.

Nenhuma regra tem exceção por override (FR-009).

Toda decisão é auditável depois, `allow` ou `block` — exigência do Acceptance
Scenario 6.2.

## Códigos de saída

| Código | Significado |
|--------|-------------|
| `0` | Nenhuma ação bloqueada. |
| `1` | Ao menos uma ação bloqueada. Violações listadas em stderr. |
| `2` | Config presente e malformada. |

## Integração com `maia remove` (FR-008)

`maia remove <kind> <nome>` consulta o guardrail **antes** de qualquer efeito.

**Ponto de inserção**: antes do `withRollback`, não como passo dentro dele. Um passo
que falha dispara o rollback dos anteriores; aqui não há o que desfazer — a intenção é
nunca começar. Falhando antes, manifesto e lockfile ficam intocados.

**Alvo avaliado**: o caminho materializado que seria apagado —
`skills/<nome>.ts` ou `tools/<nome>.mjs`.

| Resultado | Comportamento |
|-----------|---------------|
| `allow` | A remoção prossegue normalmente. |
| `block` | Erro com as violações; **nenhum** arquivo apagado, manifesto e lockfile inalterados. |

**Uso normal não é afetado**: nenhum padrão default (`**/*.env`, `**/credentials/**`)
casa com `skills/` ou `tools/`. Só uma deny list que liste esses caminhos bloquearia
uma remoção comum — e aí o bloqueio é o comportamento pedido.

---

## Garantia sobre segredos

Nenhuma mensagem de violação, nota de auditoria ou saída de erro pode conter valor de
credencial. Caminhos e nomes de variável são permitidos; valores nunca (FR-006).
