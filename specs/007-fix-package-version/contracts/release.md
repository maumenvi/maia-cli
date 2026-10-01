# Contract: build de publicação e tag de release

**Feature**: 007-fix-package-version

## `npm run build:publish` (também via `prepack`)

Passos existentes, mais um passo final:

- **check de versão do dist** (`scripts/check-dist-version.mjs`). Importa de `dist/` o leitor
  de versão, `createDefaultManifest` e `createModernResultMeta`, e compara cada valor com a
  `version` do `package.json` da raiz.
  - Tudo igual → `Dist version check passed: <versão>`, exit 0.
  - Algo divergente → stderr com `Dist version mismatch: <ponto> reports <x>, package.json has <y>`
    (uma linha por ponto), exit 1, e o `npm pack`/`npm publish` é abortado.
  - `--expected <versão>` (opcional) substitui a versão do `package.json`; só serve para
    testar o caminho de falha.

## `npm publish` → `postpublish` → `scripts/tag-release.mjs`

| Situação | Comportamento | Exit |
|----------|---------------|------|
| Árvore git com mudanças não commitadas | `Refusing to tag: working tree is not clean` | 1 |
| Tag `vX.Y.Z` não existe | cria a tag anotada `vX.Y.Z` (mensagem `Release X.Y.Z`) em `HEAD` e executa `git push origin vX.Y.Z` | 0 |
| Tag existe e aponta para `HEAD` | `Tag vX.Y.Z already points to HEAD` e push idempotente | 0 |
| Tag existe e aponta para outro commit | `Tag vX.Y.Z already exists on <sha>; refusing to move it` | 1 |

Os comandos git rodam com argv (`spawnSync`, sem shell). O script nunca força nada: sem
`-f` e sem `--force`.
