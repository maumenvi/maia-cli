# Quickstart: validar a versão com fonte única

**Feature**: 007-fix-package-version

Contratos: [cli.output.md](./contracts/cli.output.md), [release.md](./contracts/release.md).
Modelo: [data-model.md](./data-model.md).

## 1. Gates locais

```bash
npm run typecheck
npm test                       # inclui tests/shared/maia.version.sync.test.ts
npm run check:architecture
npm run check:naming
grep -rnE "version: '[0-9]+\.[0-9]+\.[0-9]+'" src/shared src/agent/mcp src/cli/commands/mcp.server.ts
# esperado: nenhuma ocorrência
```

## 2. Projeto novo a partir do código-fonte (US1)

```bash
tmp=$(mktemp -d) && cd "$tmp"
node <repo>/src/cli/index.ts --version          # → X (= package.json)
node <repo>/src/cli/index.ts init               # (modo não interativo, se houver prompt)
node -p "require('./maia.json').sources.local.ref"   # → X
node <repo>/src/cli/index.ts i
grep -o '"ref": "[^"]*"' maia.lock.json | sort -u     # → só X (para a fonte local)
npm view @maumenvi/maia-cli@X version                # → X (sem 404, depois de publicado)
node <repo>/src/cli/index.ts ci                      # → passa
```

## 3. Projeto antigo com `1.5.2` (US1, cenários 5 e 6)

```bash
# Simular: no projeto do passo 2, trocar o ref para 1.5.2 e regenerar o lock
node -e "const f='maia.json',m=require('./'+f);m.sources.local.ref='1.5.2';require('fs').writeFileSync(f,JSON.stringify(m,null,2))"
node <repo>/src/cli/index.ts lock

node <repo>/src/cli/index.ts ci        # → aviso no stderr, exit 0, git diff vazio
node <repo>/src/cli/index.ts i         # → "Updated maia.json source "local" ref from 1.5.2 ..."
node -p "require('./maia.json').sources.local.ref"   # → X
node <repo>/src/cli/index.ts ci        # → passa sem aviso
```

Controle (FR-010b): repetir com `ref: "1.5.7"`. Nem `maia i` nem `maia ci` mudam esse valor ou
mostram aviso.

## 4. Identidade MCP (US2)

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}' \
  | node <repo>/src/cli/index.ts mcp-server | head -1
# → result.serverInfo.version == X
```

O `clientInfo` enviado pelo Maia é coberto pelo teste de sincronização, com transporte fake.

## 5. Artefato publicado (US3)

```bash
cd <repo>
npm pack                               # roda build:publish + check-dist-version
#   → "Dist version check passed: X"
tmp=$(mktemp -d) && cd "$tmp" && npm init -y >/dev/null
npm i <repo>/maumenvi-maia-cli-X.tgz
./node_modules/.bin/maia --version     # → X
```

Teste negativo: mudar só o `version` do `package.json` para Y, sem mais nada, e rodar
`npm test && npm pack`. Tudo continua verde e mostra Y (SC-003).

## 6. Tag de release (US4)

Após `npm publish`, o `postpublish` cria e envia `vX`:

```bash
git ls-remote --tags origin "vX"              # → aponta para o commit publicado
npm view @maumenvi/maia-cli@X gitHead         # → mesmo SHA
```

### Tags retroativas (opcional, manual, uma vez)

SHAs de [research.md](./research.md#registro-npm-e-commits) (via `npm view … gitHead`):

```bash
git tag -a v1.0.0 e6344c6 -m "Release 1.0.0"
git tag -a v1.5.3 1101988 -m "Release 1.5.3"
git tag -a v1.5.5 ccf1e55 -m "Release 1.5.5"
git tag -a v1.5.7 f521bc9 -m "Release 1.5.7"
git tag -a v1.6.0 16f8f6d -m "Release 1.6.0"
git tag -a v1.6.1 a35cc6e -m "Release 1.6.1"
git push origin v1.0.0 v1.5.3 v1.5.5 v1.5.7 v1.6.0 v1.6.1
```
