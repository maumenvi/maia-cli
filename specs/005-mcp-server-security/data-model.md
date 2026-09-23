# Data Model: Servidor MCP & Segurança de Runtime

**Feature**: `005-mcp-server-security` | **Date**: 2026-09-22 | **Plan**: [plan.md](./plan.md)

Este documento cobre apenas as entidades **novas ou modificadas** por esta feature.
As entidades de catálogo (`InstalledPackage`, `Manifest`, `Lockfile`) vêm das
features 001–004 e não mudam.

---

## 1. GuardrailConfig

Política de ações destrutivas de um projeto. Persistida em `.maia/guardrails.json`.
**Entidade nova.**

| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `version` | `number` | sim | Deve ser `1`. Versão desconhecida ⇒ fail-closed (Decision 4). |
| `denyPatterns` | `string[]` | sim | Padrões glob de caminho. Lista vazia é válida (nenhum bloqueio adicional além dos defaults). |

**FR-009**: não há campo de override. A revisão 1 previa `allowOverrides` e
`requireConfirmation`; a clarificação de 2026-09-22 os removeu — um bloqueio só se
desfaz editando `denyPatterns` (Decision 7).

**Validação**:
- Arquivo ausente ⇒ usa `DEFAULT_DENY_PATTERNS` embutidos. Não é erro.
- Arquivo presente mas não-parseável, ou `version !== 1`, ou `denyPatterns` não-array
  de strings ⇒ **bloqueia toda ação destrutiva** e reporta o erro de parse
  (Decision 4, fail-closed).
- `denyPatterns` é aplicado em adição aos defaults, nunca em substituição — uma
  config não pode afrouxar o baseline.

---

## 2. DestructiveAction

Uma ação candidata a bloqueio, classificada antes de ser executada.
**Entidade nova.**

| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `kind` | `DestructiveActionKind` | sim | Ver enum abaixo. Informado pelo chamador e usado **apenas** na mensagem de auditoria — nunca na decisão de bloquear (FR-010). |
| `targetPath` | `string` | sim | Caminho relativo à raiz do workspace. **Este é o único campo que decide** allow/block. Caminho absoluto fora do workspace ⇒ sempre bloqueado. |
| `reason` | `string` | não | Descrição legível de por que a ação foi solicitada; entra na trilha de auditoria. |

### DestructiveActionKind

Enum fechado com **dois** valores. A revisão 1 previa quatro; a clarificação de
2026-09-22 (FR-010, Decision 9) removeu `config-rewrite` e `command-declared` por não
terem nenhum produtor — nenhum chamador os geraria, o que os tornaria código morto.

| Valor | Significado | Produtor |
|-------|-------------|----------|
| `file-delete` | Remoção irreversível de arquivo. | `maia remove` (FR-008) |
| `file-overwrite` | Sobrescrita forçada de conteúdo existente. | pre-commit / CI |

O `kind` **não participa da decisão**. Ele é derivado do contexto do chamador e serve
à trilha de auditoria; o bloqueio é decidido só pelo `targetPath` (FR-010).

**Transição de estado**: `DestructiveAction` é imutável. Ela é construída,
classificada, avaliada, e descartada. Não há ciclo de vida persistido.

---

## 3. GuardrailDecision

Resultado da avaliação de uma `DestructiveAction` contra uma `GuardrailConfig`.
**Entidade nova.** Tipo discriminado.

```
GuardrailDecision =
  | { outcome: 'allow';  action: DestructiveAction; auditNote: string }
  | { outcome: 'block';  action: DestructiveAction; violations: GuardrailViolation[] }
```

**Regras**:
- `allow` exige que **nenhum** padrão de deny case. Não há segunda via: nenhum token,
  flag ou confirmação converte um `block` em `allow` (FR-009).
- `block` sempre carrega ao menos uma violação. Violações são **agregadas**, não
  interrompidas na primeira (mesma decisão da feature 004 para `verifySourceLock`).
- Toda decisão, `allow` ou `block`, é auditável depois — exigência do Acceptance
  Scenario 6.2.

### GuardrailViolation

| Campo | Tipo | Regra |
|-------|------|-------|
| `pattern` | `string` | O padrão que casou, ou `'<malformed-config>'` no caso fail-closed. |
| `targetPath` | `string` | O caminho que casou. |
| `message` | `string` | Explicação legível. Nunca contém valor de segredo. |

---

## 4. EnvironmentScope *(modificada)*

Conjunto mínimo de variáveis que um processo de MCP herda. **Já existe** em
`resolveSafeInheritedEnv` + `SAFE_INHERITED_ENV_KEYS`; esta feature adiciona
validação de completude.

Composição efetiva do ambiente do filho, em ordem de precedência:

1. `SAFE_INHERITED_ENV_KEYS` filtradas de `process.env` — allow-list fechada:
   `PATH`, `PATHEXT`, `SystemRoot`, `WINDIR`, `ComSpec`, `TMPDIR`, `TMP`, `TEMP`,
   `LANG`, `LC_ALL`, `LC_CTYPE`, `TERM`.
2. Variáveis declaradas pelo MCP, com placeholders (`${env:VAR}` ou `{VAR}`) resolvidos a partir de
   `.maia/mcp.env`.

Nada mais alcança o processo filho. **Invariante SC-002.**

**Nova regra de validação** (Decision 2): toda variável referenciada por placeholder
deve resolver para valor não-vazio antes do `spawn`. Faltantes são reportadas
**todas de uma vez**, nomeando as variáveis e nunca valores parciais.

---

## 5. ProtocolMessage *(modificada)*

Mensagem JSON-RPC trocada com o servidor MCP. **Já existe**; esta feature altera o
veredito de uma classe de entrada.

Estados de validação, em ordem de aplicação:

| # | Condição | Resultado |
|---|----------|-----------|
| 1 | JSON não-parseável | `-32700 Parse error` — já implementado |
| 2 | Não casa com request nem notification | `-32600 Invalid Request` — já implementado |
| 3 | `_meta` declara revisão moderna desconhecida | `-32022 Unsupported MCP protocol version` — já implementado |
| 4 | `initialize` com `protocolVersion` ausente | Usa o default legado — **mantido** |
| 5 | `initialize` com `protocolVersion` suportada | Ecoa a revisão — **mantido** |
| 6 | `initialize` com `protocolVersion` **não suportada** | `-32602` com `data.supported` — **NOVO** (Decision 1) |
| 7 | Método desconhecido | `-32601 Method not found` — já implementado |

A linha 6 é a única mudança de comportamento. Ela transforma o que hoje é sucesso
silencioso com revisão trocada em erro explícito, tornando SC-001 verdadeiro.

**Invariante de canal**: stdout carrega exclusivamente JSON-RPC newline-delimited.
Nenhum diagnóstico, log ou aviso pode ser escrito nele — o que vai para o usuário vai
por stderr, já redigido (Decision 5).

---

## Relações

```
GuardrailConfig ──avalia──> DestructiveAction ──produz──> GuardrailDecision
      (denyPatterns)         (decide-se pelo targetPath)         │
                                                                 └──contém──> GuardrailViolation[]

Quatro chamadores produzem uma DestructiveAction (FR-008):
  maia guardrail check · pre-commit · CI · maia remove (antes de apagar)

EnvironmentScope ──restringe──> processo filho de MCP ──emite──> stderr ──redigido──> terminal

ProtocolMessage ──validada por──> McpStdioServer ──consulta──> política de acesso por agente
```

Nenhuma das entidades novas é persistida além de `.maia/guardrails.json`, que é
config **do projeto que usa o Maia**, resolvida a partir do cwd. `DestructiveAction` e
`GuardrailDecision` vivem apenas durante a avaliação.
