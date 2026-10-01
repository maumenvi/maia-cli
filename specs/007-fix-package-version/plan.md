# Implementation Plan: Versão do Maia com fonte única

**Branch**: `007-fix-package-version` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-fix-package-version/spec.md`

## Summary

O Maia expõe a própria versão em 7 pontos, mas só o `maia --version` lê o `package.json`. Os
demais usam `1.5.2`, escrito à mão e nunca publicado, ou `1.0.0`, no caso do servidor MCP. A
correção cria uma fonte única **lida em runtime** do `package.json`
(`src/shared/package/read.maia.package.version.ts`), reaproveitando a resolução de caminhos
que o `maia --version` já usa. Isso funciona tanto do código-fonte quanto do `dist/`. O campo
`version` sai de `MAIA_PACKAGE_METADATA`, o que torna qualquer uso esquecido um erro de
compilação.

Projetos existentes com `sources.local.ref: 1.5.2` são corrigidos automaticamente no próximo
`maia i` sem argumentos, que regrava o manifesto e regenera o lock. O `maia ci` só avisa.
Para impedir que o problema volte: um teste de sincronização compara todos os pontos com o
`package.json`, uma checagem pós-build valida o `dist/`, e um `postpublish` cria e envia a tag
`vX.Y.Z`. Detalhes em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 7 sobre Node.js ≥ 26 (TS nativo no dev, `tsc` só no
`build:publish`)

**Primary Dependencies**: nenhuma nova; só `node:fs`, `node:path`, `node:url` e
`node:child_process` (script de tag)

**Storage**: arquivos `maia.json` e `maia.lock.json`, sem mudança de schema; `package.json` do
pacote só para leitura

**Testing**: `node:test` via `npm test` (`scripts/run-tests.mjs`); `npm run typecheck`,
`check:architecture`, `check:naming`

**Target Platform**: CLI Node (Linux/macOS/Windows), instalado via npm local, global ou `npx`

**Project Type**: CLI + servidor MCP stdio

**Performance Goals**: leitura da versão uma vez por processo (cache); sem impacto
mensurável na inicialização

**Constraints**: funcionar sem build a partir de `src/`; não alterar arquivos no `maia ci`;
não forçar tags; comandos git com argv, sem shell

**Scale/Scope**: cerca de 10 arquivos de `src/` tocados, 3 arquivos novos em
`src/shared/package/`, 3 em `src/agent/catalog/manifest/migrate/`, 2 scripts, 1 teste de
sincronização mais testes unitários, CHANGELOG e AGENT.md

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Como |
|-----------|--------|------|
| Idioma pt-BR | ✅ | Artefatos em pt-BR; mensagens do CLI seguem o inglês já usado no código |
| I. Test-First | ✅ | Cada mudança tem teste: sync test (FR-007), unitários de resolve/parse/migrate/detect, CLI `install`/`ci` com `1.5.2`; o teste de `catalog.store` que fixava `1.5.2` é corrigido |
| II. Security by Default | ✅ | Script de tag recusa árvore suja, nunca move nem força tag e usa argv sem shell; nenhum segredo envolvido |
| III. Spec-Driven | ✅ | spec → clarify (C) → plan → tasks |
| IV. Small & Reversible | ✅ | Fatias independentes: (1) fonte única + pontos de uso, (2) migração `maia i`/`ci`, (3) checagem de dist, (4) script de tag e doc, (5) CHANGELOG e release |
| V. Single Responsibility | ✅ | Um símbolo por arquivo: resolve, parse e read separados; detect, migrate e constante separados |
| VI. Scope-Organized Dirs | ✅ | Leitura do pacote em `src/shared/package/`; migração de manifesto em `src/agent/catalog/manifest/migrate/` |
| VII. Clean Code | ✅ | `resolve.package.json.path.ts` do comando `version` é **movido** para `src/shared/package/`, sem duplicar |
| VIII. Pure Functions | ✅ | resolve (com `here` e `exists` injetados), parse, detect e migrate são puros; I/O só em `read.maia.package.version.ts` e nos comandos |
| IX. Naming | ✅ | Nomes com ponto; testes `.test.ts` |

**Resultado**: passa. Sem violações a justificar.

*Re-check pós-design*: igual, sem mudança. O design não adicionou dependências nem
diretórios fora dos escopos existentes.

## Project Structure

### Documentation (this feature)

```text
specs/007-fix-package-version/
├── plan.md              # este arquivo
├── research.md          # Phase 0: levantamento + decisões D1–D7
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── cli.output.md    # saída de init/i/ci/mcp-server/--version
│   └── release.md       # build:publish + postpublish/tag
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (ainda não criado)
```

### Source Code (repository root)

```text
src/
├── shared/
│   ├── package.metadata.ts                         # MODIFICADO: remove `version`
│   └── package/                                    # NOVO
│       ├── resolve.maia.package.json.path.ts       # movido de cli/commands/version/resolve.package.json.path.ts; puro
│       ├── parse.maia.package.version.ts           # puro; lança "package version not found"
│       └── read.maia.package.version.ts            # borda de I/O + cache
├── cli/
│   ├── commands/version/version.command.ts         # MODIFICADO: usa readMaiaPackageVersion
│   ├── commands/version/resolve.package.json.path.ts  # REMOVIDO (movido)
│   ├── commands/install/install.command.ts         # MODIFICADO: migra 1.5.2 antes do buildLock
│   ├── commands/ci.ts                              # MODIFICADO: aviso no stderr
│   └── commands/mcp.server.ts                      # MODIFICADO: padrão = versão real
└── agent/
    ├── catalog/manifest/
    │   ├── defaults.ts                             # MODIFICADO: ref = readMaiaPackageVersion()
    │   └── migrate/                                # NOVO
    │       ├── stale.local.source.ref.ts           # constante '1.5.2'
    │       ├── has.stale.local.source.ref.ts       # puro
    │       └── migrate.stale.local.source.ref.ts   # puro
    └── mcp/
        ├── server/stdio.ts                         # MODIFICADO: padrão = versão real
        └── runtime/
            ├── protocol/json-rpc/create.modern.result.meta.ts   # MODIFICADO
            ├── protocol/json-rpc/create.modern.request.meta.ts  # MODIFICADO
            └── client/json-rpc-client/json.rpc.mcp.client.ts    # MODIFICADO

scripts/
├── build-publish.mjs        # MODIFICADO: chama check-dist-version no fim
├── check-dist-version.mjs   # NOVO
└── tag-release.mjs          # NOVO

tests/
├── shared/
│   ├── maia.version.sync.test.ts               # NOVO: guarda FR-007
│   ├── resolve.maia.package.json.path.test.ts  # NOVO
│   ├── parse.maia.package.version.test.ts      # NOVO
│   ├── has.stale.local.source.ref.test.ts      # NOVO
│   └── migrate.stale.local.source.ref.test.ts  # NOVO
├── cli/install.test.ts, ci.test.ts, version.test.ts   # MODIFICADOS: cenários 1.5.2 / igualdade exata
└── tools/catalog.store.test.ts                 # MODIFICADO: ref == versão do package.json

package.json   # version → 1.6.2; script "postpublish": "node scripts/tag-release.mjs"
CHANGELOG.md   # [1.6.2] Fixed; remove "## [1.6.0]" vazio duplicado
AGENT.md       # nova seção "Release"
```

**Structure Decision**: projeto único existente. A leitura da versão vai para
`src/shared/package/` porque é usada por `cli/` e `agent/`. A migração do manifesto fica junto
das outras operações de manifesto em `src/agent/catalog/manifest/`.

## Ordem sugerida (fatias de commit)

1. **Fonte única**: `src/shared/package/*` + testes de resolve e parse; `version.command`
   passa a usar o leitor; remover o arquivo antigo.
2. **Pontos de uso**: remover `version` de `MAIA_PACKAGE_METADATA`; atualizar defaults, os
   meta de resultado e requisição, o cliente JSON-RPC, `stdio.ts` e `mcp.server.ts`; teste de
   sincronização; corrigir `catalog.store.test.ts`.
3. **Migração**: constante, detect, migrate e testes; integração em `maia i` e `maia ci` com
   testes de CLI.
4. **Checagem de dist**: `check-dist-version.mjs` + chamada no `build-publish.mjs`.
5. **Tag**: `tag-release.mjs` + `postpublish` + seção Release no `AGENT.md`.
6. **Release**: versão 1.6.2 + CHANGELOG.

As tags retroativas são opcionais e manuais. Os comandos estão no
[quickstart.md](./quickstart.md#tags-retroativas-opcional-manual-uma-vez).

## Riscos

| Risco | Mitigação |
|-------|-----------|
| `createDefaultManifest()` é chamado por `normalizeManifest` em toda leitura de manifesto; numa instalação sem `package.json` tudo passa a falhar | É o comportamento desejado (FR-009) e a mensagem é clara. Na prática o npm sempre inclui o `package.json` |
| Testes que fazem snapshot de `maia.json`/lock com `1.5.2` | Busca por `1.5.2` em `tests/`: só `catalog.store.test.ts:19` usa |
| `postpublish` falha depois do publish (rede ou tag existente) | A publicação já aconteceu e o script é idempotente; basta rodar `node scripts/tag-release.mjs` de novo |
| `maia i` migrado e reinstalação falha depois | Manifesto e lock já foram gravados juntos e estão consistentes; o próximo `maia i` ou `maia ci` funciona |

## Complexity Tracking

Sem violações; nada a registrar.
