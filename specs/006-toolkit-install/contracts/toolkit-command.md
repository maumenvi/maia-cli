# Contrato: `maia toolkit`

Handler: `src/cli/commands/toolkit/toolkit.command.ts`, registrado em
`command.handlers.ts` como `toolkit`.

## Sintaxe

```text
maia toolkit i|install <nome> [-g|--global] [--version <x.y.z>] [-y|--yes]
maia toolkit ls|list [--json]
maia toolkit rm|remove <nome> [-y|--yes]
```

`-y` em `rm` responde "sim" à pergunta de apagar arquivos. Sem `-y` e sem TTY, a
resposta é "não".

## `install`

| Situação | Saída (stdout/stderr) | Exit | Efeitos |
|---|---|---|---|
| Sem `<nome>` | `Usage: maia toolkit i <name> [-g] [--version <x.y.z>] [-y]` | 1 | nenhum |
| Nome desconhecido | `Unknown toolkit "<n>". Available: speckit` | 1 | nenhum |
| `--version` fora de `^\d+\.\d+\.\d+$` (aceita prefixo `v`) | `Invalid version "<v>"` | 1 | nenhum |
| Versão inexistente | `Toolkit speckit has no release v<x>` | 1 | nenhum |
| `-g` sem suporte | `warning: <n> does not support global installation; installing in the project` e segue como sem `-g` | — | — |
| Pré-requisito ausente | `Missing prerequisite "uv" for speckit. See <docsUrl>` | 1 | nenhum |
| Já instalado na mesma versão | `speckit@1.0.11 is already installed` | 0 | nenhum |
| Presente em outra versão (troca via `--version`) | checa guardrail `file-overwrite` nos caminhos existentes; bloqueado ⇒ mensagem do guardrail; senão a confirmação diz `Existing speckit files will be overwritten (edits will be lost).` | 1 se bloqueado | nenhum se bloqueado |
| Presente sem registro | `Adopted existing speckit@<v>` | 0 | manifesto + lock |
| Confirmação | imprime `Will run: <argv…>` (cada comando) e `Source: <repository>@<ref>`; pergunta `Proceed? [y/N]` | — | — |
| Recusa / sem TTY sem `-y` | `Aborted` | 1 | nenhum |
| Instalador falha | saída do instalador + `Toolkit speckit failed to install (exit <c>)` | 1 | caminhos novos removidos; nada registrado |
| Agente sem integração | `warning: agent "<a>" is not supported by speckit` | — | — |
| Sem agentes | `warning: no agent configured; speckit installed with its default integration` | — | — |
| Sucesso | `Installed toolkit:speckit@1.0.11 (<scope>)` | 0 | manifesto, lock, bloco de instruções dos agentes |

Ordem garantida: validações e pré-requisitos **antes** de qualquer escrita; manifesto
e lock só **depois** do instalador retornar 0 (FR-009).

## `ls`

Texto: uma linha por toolkit do catálogo —
`speckit  GitHub Spec Kit  global:yes  installed 1.0.11 (global)` ou
`… not installed`. `--json`: array de `ToolkitView` (data-model §6).

## `rm`

| Situação | Saída | Exit | Efeitos |
|---|---|---|---|
| Não registrado | `Toolkit "<n>" is not installed` | 1 | nenhum |
| Sempre | remove de `maia.json` e `maia.lock.json` (com rollback) | — | — |
| Pergunta | lista caminhos existentes + `Delete these files? Edits will be lost. [y/N]` | — | — |
| "não" / sem TTY | `Kept: <paths>` | 0 | só manifesto/lock |
| "sim" | por integração: guardrail `file-delete` em todos os seus caminhos **antes**; se liberados, roda `specify integration uninstall <k>`; se algum bloqueado, não roda e reporta. Depois apaga `projectPaths` restantes via guardrail | 0 | arquivos removidos |
| Caminho bloqueado | `Blocked by guardrail, kept: <path>` | 0 | caminho preservado |
| Escopo global | `Global tool kept. To uninstall: uv tool uninstall specify-cli` | — | ferramenta intacta |

## Integração com `maia i` / `maia ci` / `maia verify`

- `maia i` (sem args): após `reinstallFromLock`, `restoreToolkits(mode: 'install')` —
  instala ausentes, nunca pergunta; `mismatch` ⇒ erro `Toolkit speckit is at <x> but
  maia.json requires <y>. Run "maia toolkit i speckit --version <y>" to switch
  versions.` sem reinstalar.
- `maia ci`: gate de staleness (inclui toolkits) e gate de catálogo (FR-003a) antes de
  tudo; `restoreToolkits(mode: 'ci')` é um passo do mesmo `withRollback` das
  skills/tools (depois delas) — instala ausentes na versão do lock; `mismatch` é erro
  (mesma mensagem, citando `maia.lock.json`); falha desfaz também skills/tools. Falha ⇒ `Toolkit speckit failed during ci:
  <causa>` e exit 1 (FR-018).
- `maia verify`: para cada toolkit do lock, `absent`/`mismatch`/ferramenta global
  ausente viram `LockVerificationProblem` (presença + versão, sem hash — FR-019).
