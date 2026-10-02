# Contract: variáveis globais de MCP (US5)

## Flags

- `--env-g` (sinônimo `--env-global`; `-env-g` é aceito e normalizado) em `maia mcp
  i|add|install` e `maia mcp find`.
- A flag não faz parte do termo de busca.

## Saída

| Situação | Saída |
|----------|-------|
| MCP pede credenciais, com `--env-g` | `MCP "<nome>" may require specific credentials. We will configure them in the global Maia env: <caminho global>` |
| MCP pede credenciais, sem `--env-g` | como hoje (`.maia/mcp.env`) |
| variável já tem valor no global | não é pedida nem listada |
| `--env-g` e MCP sem credenciais | `--env-g: <nome> requires no credentials; nothing was written.` |
| arquivo global existente com permissão mais aberta que `0600` (POSIX) | `warning: <caminho> is readable by other users; run "chmod 600 <caminho>".` |

## Arquivo global

- Criado com diretório `0700` e arquivo `0600`.
- Formato idêntico a `.maia/mcp.env`.
- Nunca é escrito por `maia i`/`maia ci`.

## Runtime (`maia mcp-server` e transportes)

Ordem: processo (não vazio) > projeto (não vazio) > global. `X=` vazio no projeto **não**
mascara o global.

## `maia mcp i`

Alias exato de `maia mcp add`.
