# Contract: registro global do Cline (US3)

## Candidatos

Na ordem (research D3), só os que **já existem**:

1. `$CLINE_MCP_SETTINGS_PATH`
2. `${CLINE_DATA_DIR:-~/.cline/data}/settings/cline_mcp_settings.json`
3. `<dados do editor>/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   para `Code`, `Code - Insiders`, `VSCodium`, `Cursor`, `Windsurf`.

## Entrada

```json
"maia-<slug>-<hash8>": {
  "command": "maia",
  "args": ["mcp-server", "--agent", "cline"],
  "env": { "MAIA_PROJECT_DIR": "/caminho/absoluto/do/projeto" }
}
```

Campos extras já presentes na chave (`disabled`, `autoApprove`, `timeout`, outras variáveis
de `env`) são preservados. Nenhuma outra chave de `mcpServers` ou do topo é alterada.

## `maia init cline` / `maia agent add cline`

| Condição | Pergunta? | Arquivo global | Situação | Saída (resumo) |
|----------|-----------|----------------|----------|----------------|
| Entrada atual já existe em algum candidato | não | intocado | `registered` | `Cline: "maia" proxy already registered in ~/<caminho>.` |
| TTY, não local-only, ≥ 1 candidato, pessoa aceita | sim | entrada gravada em cada candidato; órfãs removidas | `registered` | `Registered the "maia" proxy for Cline in ~/<caminho>.` |
| Pessoa recusa | sim | intocado | `pending` | passo manual (abaixo) |
| Sem TTY | não | intocado | `pending` | passo manual |
| Projeto local-only | não | intocado | `skipped` | mensagem local-only da 009 |
| Nenhum candidato existe | não | intocado | `pending` | passo manual + `Cline settings file not found; open Cline once and run "maia agent add cline" again.` |
| JSON inválido no candidato | — | intocado | `pending` | `warning: Cannot update <caminho>: invalid JSON (…)`; exit 0 |

Texto da pergunta:

```text
Cline reads MCP servers only from its global settings. Add the "maia" proxy for this project to:
  ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
Entry "maia-maia-cli-1a2b3c4d": maia mcp-server --agent cline (MAIA_PROJECT_DIR=<raiz>)
Also remove 1 stale Maia entry pointing to a missing folder: maia-old-9f8e7d6c
Proceed? [y/N]
```

(a linha "Also remove" só aparece quando há órfãs).

## Demais comandos (`maia mcp add`, `maia i`, `maia ci`, `maia remove`, …)

Nunca perguntam nem gravam no global. Recalculam a situação e reescrevem o bloco.
Com `pending`, a saída inclui `Cline: "maia" proxy not registered yet; run "maia agent add cline" to register it.`

## Passo manual (situação `pending`)

Saída do CLI e `.clinerules/maia.md`:

```text
No MCP server is registered for Cline yet: Cline reads MCP servers only from its global settings.
Add this entry under "mcpServers" in cline_mcp_settings.json (Cline → MCP Servers → Configure),
or run `maia agent add cline` to let Maia add it:
{ "maia-<slug>-<hash8>": { "command": "maia", "args": ["mcp-server", "--agent", "cline"], "env": { "MAIA_PROJECT_DIR": "<raiz>" } } }
```

No `.clinerules/maia.md` (arquivo de projeto), `<raiz>` é escrito como o texto literal
`<absolute path of this project>`, nunca como o caminho real (FR-008). Na saída do CLI,
o caminho real aparece.

## Situação `registered` no `.clinerules/maia.md`

`The \`maia\` MCP proxy is registered for this agent in Cline's global MCP settings (entry \`maia-<slug>-<hash8>\`); the capabilities below are reachable through it.`
