# Quickstart: validar que prévia e stage não criam tag

**Feature**: 008-fix-tag-dry-run · Contrato: [contracts/release.md](./contracts/release.md)

## 1. Gates

```bash
npm run typecheck && npm test && npm run check:architecture && npm run check:naming
```

O `tests/shared/tag.release.test.ts` cobre a tabela de `decidePublishSkip`
([data-model.md](./data-model.md)).

## 2. Ponta a ponta com o npm real (nada é enviado)

Repositório temporário com remoto bare e um pacote de nome inexistente cujo `postpublish` é
o script real:

```bash
S=$(mktemp -d) && git init -q --bare "$S/remote.git" && mkdir -p "$S/repo/scripts" && cd "$S/repo"
git init -q && cp <repo>/scripts/tag-release.mjs scripts/
echo '{"name":"@maumenvi/maia-tagprobe-zz9","version":"9.9.9","scripts":{"postpublish":"node scripts/tag-release.mjs"}}' > package.json
git add . && git commit -qm init && git remote add origin "$S/remote.git"

npm publish --dry-run 2>&1 | grep "Skipping release tag"        # → mensagem de prévia
npm stage publish --dry-run 2>&1 | grep "Skipping release tag"  # → mensagem de prévia (dry-run vence)
echo dirty > x && npm publish --dry-run 2>&1 | grep -c "not clean"; rm x   # → 0 (não consulta git)
git tag -l; git ls-remote --tags origin                          # → vazio

npm_command=stage node scripts/tag-release.mjs                    # → mensagem de stage, exit 0
git tag -l                                                        # → vazio
```

## 3. Regressão da 007 (execução manual = publicação real)

No mesmo repositório: `node scripts/tag-release.mjs` → `Created tag v9.9.9` + push; de novo →
`already points to HEAD`; depois de um commit novo → `refusing to move it` e exit 1.
