# Contrato: ferramenta MCP `maia_toolkits`

Exposta pelo MCP agregado do Maia (`maia mcp-server`) para **todos** os agentes.
Somente leitura. Nenhuma outra ferramenta MCP relacionada a toolkits existe (FR-021,
SC-005).

## `tools/list`

```json
{
  "name": "maia_toolkits",
  "description": "Lists Maia toolkits (available and installed): what each does, version, scope, file paths and docs. Read-only; install with the maia CLI.",
  "inputSchema": {
    "type": "object",
    "properties": { "name": { "type": "string", "description": "Optional toolkit name to filter" } },
    "additionalProperties": false
  }
}
```

`origin` interno: `toolkit:catalog`. O nome `maia_toolkits` é reservado: skills/tools
com esse nome são ignoradas pelo servidor e recusadas por `maia i`.

## `tools/call`

Entrada `{}` ou `{ "name": "speckit" }`. Resposta (texto JSON):

```json
{
  "toolkits": [
    {
      "name": "speckit",
      "title": "GitHub Spec Kit",
      "description": "Spec-driven development: specify → plan → tasks → implement",
      "docsUrl": "https://github.github.com/spec-kit/installation.html",
      "supportsGlobal": true,
      "installed": true,
      "version": "1.0.11",
      "scope": "global",
      "integrations": ["claude"],
      "paths": [".specify", ".claude/skills/speckit-*"],
      "installCommand": "maia toolkit i speckit"
    }
  ],
  "note": "Maia MCP does not install toolkits. Use the CLI command shown or the toolkit docs."
}
```

| Caso | Resposta |
|---|---|
| `name` desconhecido | `isError: true`, `Unknown toolkit "<n>". Available: speckit` |
| Sem lock | lista catálogo com `installed: false` |

Implementação: `collect.toolkit.entries.ts` (entrada da lista) e ramo em
`router.ts` para `origin === 'toolkit:catalog'`, chamando a função pura
`toToolkitView` sobre catálogo + `store.loadLock()?.toolkits`.
