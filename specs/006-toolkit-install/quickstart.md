# Quickstart: validação de toolkits

Guia de validação ponta a ponta. Contratos em [contracts/](./contracts/) e formatos em
[data-model.md](./data-model.md).

## Pré-requisitos

- Node.js ≥ 26, checkout desta branch, `npm run maia -- <args>` (ou `maia` linkado).
- Para os cenários reais: `uv`/`uvx` no PATH e acesso ao GitHub.
- Suíte automatizada: nenhum pré-requisito externo — os testes injetam `NativeRunner`
  e `ConfirmFn` falsos.

```bash
npm run typecheck && npm test && npm run check:architecture && npm run check:naming
```

## Cenário 1 — Instalar no projeto (US1)

```bash
tmp=$(mktemp -d) && cd "$tmp"
maia init claude copilot
maia toolkit i speckit          # mostra "Will run: uvx --from …@v1.0.11 specify init …" e pergunta
```

Esperado: `.specify/` e `.claude/skills/speckit-*` criados; `maia.json` tem
`toolkits.speckit = { version: "1.0.11", scope: "project" }`; `maia.lock.json` tem
`lockfileVersion: 2` e `toolkits.speckit.integrations = ["claude"]` e o aviso
`integration "copilot" cannot be combined with other integrations; skipped`
(limitação do Spec Kit: `copilot` não é multi-install safe); `CLAUDE.md` tem a seção
`### Toolkits`. `which specify` não muda (nada global).

Variações: `maia toolkit install speckit` (idêntico); `maia toolkit i nope` (erro +
lista); `maia toolkit i speckit --version 9.9.9` (erro, nada alterado); resposta "n"
na confirmação (`Aborted`, nada alterado); `PATH=/usr/bin maia toolkit i speckit -y`
sem `uv` (erro de pré-requisito com link).

## Cenário 2 — Idempotência e restauração (US2)

```bash
maia toolkit i speckit -y       # "already installed"
echo "# edit" >> .specify/memory/constitution.md
maia i                          # não reexecuta instalador; edição preservada
git init -q && git add -A && git commit -qm base
rm -rf .specify .claude/skills/speckit-*
maia ci                         # reinstala v1.0.11 sem perguntas
maia verify                     # OK
```

Divergência: editar `maia.json` para `"version": "1.0.10"` sem `maia lock` →
`maia ci` falha com erro de staleness antes de instalar.

Versão divergente no disco: com lock em `1.0.11` e `.specify/init-options.json`
editado para `1.0.10`, `maia i` e `maia ci` falham com `Toolkit speckit is at 1.0.10
but … requires 1.0.11` sem executar o instalador; a troca é feita só com
`maia toolkit i speckit --version 1.0.11` (confirmação avisa sobrescrita).

## Cenário 3 — Global (US3)

```bash
maia toolkit i speckit -g -y
specify --version               # specify 1.0.11
```

Esperado: ferramenta global + projeto inicializado; manifesto com `scope: "global"`.
Toolkit sem suporte global: validado por teste unitário com definição fake
(`supportsGlobal: false`) — aviso e argv idêntico ao sem `-g`.

## Cenário 4 — MCP (US4)

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"maia_toolkits","arguments":{}}}' \
  | maia mcp-server --agent claude
```

Esperado: JSON com `speckit`, `installed: true`, versão, escopo, caminhos. Em
`tools/list` não há ferramenta que instale toolkits.

## Cenário 5 — Remoção (US5)

```bash
maia toolkit rm speckit         # responde "n"
# → manifesto/lock sem speckit; .specify permanece; "Kept: …"
maia toolkit i speckit -y && maia toolkit rm speckit -y
# → integrações desinstaladas nativamente, .specify apagado
```

Com `.maia/guardrails.json` contendo `".specify/**"` em `denyPatterns`: o caminho é
preservado com `Blocked by guardrail, kept: .specify`. Em escopo global: mensagem com
`uv tool uninstall specify-cli`; `specify --version` continua funcionando.
