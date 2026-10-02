# Contract: saída do CLI e identidade exposta

**Feature**: 007-fix-package-version

## `maia --version` / `maia -v` / `maia version`

Sem mudança de comportamento: imprime a `version` do `package.json`, sozinha numa linha, no
stdout. Agora usa o mesmo leitor compartilhado dos demais pontos.

Erros (stderr, exit ≠ 0): `package.json not found` | `package version not found`.

## `maia init`

Num diretório sem `maia.json`, o manifesto criado tem:

```json
"sources": {
  "local": {
    "type": "registry",
    "url": "npm:@maumenvi/maia-cli",
    "ref": "<versão de maia --version>",
    "trusted": true
  }
}
```

## `maia i` (sem argumentos): projeto com `ref: 1.5.2`

Antes das linhas atuais de resumo, uma linha no **stdout**:

```text
Updated maia.json source "local" ref from 1.5.2 (never published) to <versão>; maia.lock.json regenerated.
```

Depois disso, `maia.json` e `maia.lock.json` passam a ter `ref: "<versão>"`. Exit code 0.

Se o `ref` já estiver correto ou for qualquer outro valor: nenhuma linha extra e nenhum
arquivo alterado além do que o `maia i` já faz hoje.

## `maia ci`: projeto com `ref: 1.5.2`

Uma linha no **stderr**, antes de reinstalar:

```text
warning: maia.json source "local" pins ref 1.5.2, a Maia version that was never published. Run "maia i" and commit maia.json and maia.lock.json to fix it.
```

- Não altera `maia.json` nem `maia.lock.json`.
- O exit code segue as regras atuais do `ci`: com lock e manifesto consistentes, termina com 0.

## `maia i <nome>`

Sem mudança, nem migração nem aviso.

## `maia mcp-server [--version <v>]`

| Chamada | `serverInfo.version` em `initialize` e em `_meta` dos resultados |
|---------|-------------------------------------------------------------------|
| sem `--version` | versão de `maia --version` |
| `--version 9.9.9` | `9.9.9` (sobrescrita explícita, como já funciona) |

## Maia como cliente MCP

`clientInfo.version` enviado em `initialize` (legado) e em
`io.modelcontextprotocol/clientInfo` (moderno) = versão de `maia --version`.
