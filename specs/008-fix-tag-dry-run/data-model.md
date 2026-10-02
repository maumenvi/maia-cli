# Data Model: Tag de release só para publicação real

**Feature**: 008-fix-tag-dry-run | **Date**: 2026-10-01

## Contexto de publicação

Vem do ambiente do processo. Nada é persistido.

| Entrada | Origem | Regra |
|---------|--------|-------|
| `npm_config_dry_run` | npm | prévia **somente** se `=== 'true'` |
| `npm_command` | npm | stage **somente** se `=== 'stage'` |

`decidePublishSkip(env) → 'dry-run' | 'staged' | null`:

| dry_run | command | Resultado |
|---------|---------|-----------|
| `'true'` | qualquer | `'dry-run'` |
| ≠ `'true'` | `'stage'` | `'staged'` |
| ≠ `'true'` | outro / ausente (`publish`, `run`, execução manual) | `null` → segue a 007 |

## Fluxo do `tag-release`

```text
início
  └─ decidePublishSkip(env)
       ├─ 'dry-run' → mensagem de prévia, exit 0       (nenhum git executado)
       ├─ 'staged'  → mensagem de stage, exit 0         (nenhum git executado)
       └─ null      → fluxo da 007: decideTagAction(...) → create / already-at-head / refuse-*
```

A tag de release (`vX.Y.Z`) segue igual à feature 007.
