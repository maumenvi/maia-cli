# Quickstart: validar o registro do proxy por agente

Roteiro de validação de ponta a ponta. Formatos esperados em
[contracts/agent.registration.md](./contracts/agent.registration.md) e
[contracts/cline.global.md](./contracts/cline.global.md); não são repetidos aqui.

## Pré-requisitos

- Node ≥ 26; `npm link` (ou `./install-local.sh`) para ter `maia` no PATH.
- Uma pasta de teste vazia: `mkdir /tmp/maia-010 && cd /tmp/maia-010`.

## 1. Automático (sem agentes reais)

```bash
npm run typecheck
npm test
node --test tests/agents/contract/*.test.ts
```

Esperado: tudo verde, incluindo os sete contratos literais. Alterar a chave de um alvo (ex.:
Cursor de volta para `servers`) faz o contrato correspondente falhar (SC-004). A execução com
agentes reais é separada e segue o roteiro em [docs/agents/validation.md](../../docs/agents/validation.md).

## 2. Migração de legado (sem agentes reais)

```bash
cd /tmp/maia-010
mkdir -p .cursor .continue .cline
echo '{"servers":{"maia":{"command":"maia"},"other":{"command":"x"}}}' > .cursor/mcp.json
echo '{"models":[],"mcpServers":{"maia":{"command":"maia"}}}' > .continue/config.json
echo '{"servers":{"maia":{"command":"maia"},"other":{"command":"x"}}}' > .cline/mcp.json
HOME=$(mktemp -d) maia init cursor continue cline < /dev/null
```

Esperado:
- `.cursor/mcp.json`: `mcpServers.maia` no formato do contrato; `servers.other` intacto.
- `.continue/mcpServers/maia.yaml` criado; `.continue/config.json` só sem `mcpServers.maia`.
- `.cline/mcp.json` sem `servers.maia`; `servers.other` intacto.
- Saída com uma linha `Moved …`/`Removed …` por arquivo; Cline em `pending` (sem TTY) com o
  passo manual; `.clinerules/maia.md` sem afirmar registro nem conter caminho absoluto.
- Rodar de novo: nenhuma linha `Moved`/`Removed`, só `No change in …`.

## 3. Cline global (TTY, home temporária)

```bash
export HOME=$(mktemp -d)
mkdir -p "$HOME/.cline/data/settings"
echo '{"mcpServers":{"other":{"command":"x"}}}' > "$HOME/.cline/data/settings/cline_mcp_settings.json"
maia agent add cline     # responder "n": arquivo intacto, situação pending
maia agent add cline     # responder "y": entrada maia-<slug>-<hash> gravada, "other" intacto
maia agent add cline     # sem pergunta: já registrado
maia mcp add <mcp-exato> # nunca pergunta sobre o Cline
maia agent rm cline      # responder "y": só a chave do projeto sai do global
```

`maia agent rm <id...>` também remove os registros do projeto, os blocos de instrução
gerenciados e os perfis Maia; não apaga cópias de skills nas pastas nativas dos agentes.

## 4. Roteiro com os agentes reais (manual, SC-001/SC-005)

O passo a passo por agente fica em `docs/agents/validation.md` (FR-011). Resumo do resultado
esperado em cada um, num projeto com `maia init <id>` e um MCP instalado:

| Agente | Onde conferir | Esperado |
|--------|---------------|----------|
| Cursor | Settings → MCP | servidor `maia` verde, ferramentas listadas |
| Continue | painel de ferramentas do agente | ferramentas do `maia` disponíveis |
| Cline | Cline → MCP Servers | `maia-<slug>-<hash>` conectado; abrir outro projeto e confirmar que o servidor de cada projeto expõe as capacidades certas |
| Zed | Agent Panel → servidores de contexto | `maia` ativo; **confirmar que o Zed lê `context_servers` de `.zed/settings.json`** |
| Codex | `/mcp` na sessão | `maia` listado depois de marcar o projeto como confiável |

Registrar o resultado (versão do agente, data, ok/falha) em
[`docs/agents/validation.md`](../../docs/agents/validation.md). A execução real não foi feita
como parte dos testes automatizados.
Uma divergência confirmada no agente real vira correção desta feature (US4, cenário 3).

## 5. Sem caminho absoluto (FR-008)

```bash
grep -rn "$PWD\|$HOME" .cursor .continue .cline .zed .codex .clinerules AGENTS.md .maia/agents || echo ok
```

Esperado: `ok`.
