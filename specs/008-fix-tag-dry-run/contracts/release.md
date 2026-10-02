# Contract: `scripts/tag-release.mjs` (delta sobre a feature 007)

**Feature**: 008-fix-tag-dry-run. Base: [007 contracts/release.md](../../007-fix-package-version/contracts/release.md).

## Novas linhas, avaliadas **antes** de qualquer comando git

| Situação | Saída (stdout) | Exit |
|----------|----------------|------|
| `npm_config_dry_run === 'true'` | `Skipping release tag vX.Y.Z: npm --dry-run does not publish the package` | 0 |
| `npm_command === 'stage'` (sem dry-run) | `Skipping release tag vX.Y.Z: the version is only staged. After "npm stage approve", run "node scripts/tag-release.mjs".` | 0 |

## Linhas existentes (sem mudança)

Fora dos dois casos acima, incluindo `npm publish` real e execução manual
(`node scripts/tag-release.mjs`, `npm run postpublish`), valem os quatro casos da 007:
árvore suja → exit 1; tag nova → cria e envia; tag no HEAD → idempotente; tag em outro
commit → exit 1.

## Funções exportadas (para teste)

| Função | Assinatura |
|--------|------------|
| `releaseTagName` | `(version: string) => string` (sem mudança) |
| `decideTagAction` | sem mudança |
| `decidePublishSkip` | **nova**: `(env: { npm_config_dry_run?: string; npm_command?: string }) => 'dry-run' \| 'staged' \| null` |
