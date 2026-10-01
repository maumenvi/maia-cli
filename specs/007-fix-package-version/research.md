# Research: Versão do Maia com fonte única

**Feature**: 007-fix-package-version | **Date**: 2026-10-01

## Levantamento do estado atual

Todos os pontos que expõem a versão do Maia hoje, conferidos no código-fonte:

| # | Ponto | Arquivo | Valor hoje |
|---|-------|---------|------------|
| 1 | `maia --version` | `src/cli/commands/version/version.command.ts` | lê `package.json` → `1.6.1` ✅ |
| 2 | `sources.local.ref` do manifesto novo → proveniência e integridade do lock | `src/agent/catalog/manifest/defaults.ts:30` | `MAIA_PACKAGE_METADATA.version` → `1.5.2` ❌ |
| 3 | `serverInfo` em `_meta` dos resultados modernos (valor padrão do parâmetro) | `src/agent/mcp/runtime/protocol/json-rpc/create.modern.result.meta.ts:7` | `1.5.2` ❌ |
| 4 | `clientInfo` no envelope de requisição moderna | `src/agent/mcp/runtime/protocol/json-rpc/create.modern.request.meta.ts:10` | `1.5.2` ❌ |
| 5 | `clientInfo` no `initialize` legado | `src/agent/mcp/runtime/client/json-rpc-client/json.rpc.mcp.client.ts:152` | `1.5.2` ❌ |
| 6 | `serverInfo` do servidor MCP do Maia (`maia mcp-server`) | `src/cli/commands/mcp.server.ts:12` | `flags.version ?? '1.0.0'` ❌ |
| 7 | Valor padrão do servidor stdio quando nenhuma versão é passada | `src/agent/mcp/server/stdio.ts:36` | `options.version ?? '1.0.0'` ❌ |

Observações:

- Na prática, o servidor MCP do Maia informa **`1.0.0`**, não `1.5.2`: o comando `mcp-server`
  sempre passa `'1.0.0'`, e esse valor tem prioridade sobre o padrão de
  `createModernResultMeta`. A issue viu `1.5.2` no valor padrão da função, mas o valor que de
  fato sai é outro, e também errado.
- `tests/tools/catalog.store.test.ts:19` afirma `manifest.sources.local.ref === '1.5.2'`, ou
  seja, um teste garante o comportamento com defeito. Ele precisa mudar junto com a correção.
- `sources.local.ref` entra em `provenance.ref` de cada pacote
  (`src/agent/catalog/lock/package.descriptor.ts:43`), no payload de integridade
  (`create.lock.integrity.payload.ts:21`) e é comparado com o manifesto em
  `verify.source.lock.metadata.ts:35`. Trocar o `ref` exige regenerar o lockfile por inteiro;
  não basta editar um campo.
- `normalizeManifest` mantém o `sources` que está gravado no `maia.json`. O padrão só vale para
  manifestos novos, e por isso projetos existentes continuam com `1.5.2`.

## Registro npm e commits

`npm view @maumenvi/maia-cli versions` → `1.0.0, 1.5.3, 1.5.5, 1.5.7, 1.6.0, 1.6.1`.
`npm view @maumenvi/maia-cli@1.5.2` → **404**, o que confirma a issue.

O npm grava o `gitHead` de cada publicação, e todos os commits abaixo existem no repositório
local:

| Versão | gitHead |
|--------|---------|
| 1.0.0 | `e6344c631f512f2cc8ce331d95e9fc385a960d9d` |
| 1.5.3 | `1101988ebfeb2bde4a354e727bef04d7dd3a8271` |
| 1.5.5 | `ccf1e55c35e984ad2aa33c442b60aff5bd13ccbc` |
| 1.5.7 | `f521bc90fca0146782683c73bb1daecd14ed53e0` |
| 1.6.0 | `16f8f6dee001a78df2ba680ba8a932635c4846ea` |
| 1.6.1 | `a35cc6e309c0ff36d7edcbe73f245cce0f9c7b68` |

Não existe nenhuma tag no repositório.

---

## D1 — De onde vem a versão: leitura em runtime

**Decision**: ler a versão do `package.json` em tempo de execução, com o mesmo mecanismo que
`maia --version` já usa: uma lista de caminhos candidatos relativa ao arquivo, que cobre o
layout de código-fonte e o layout de `dist/`. A leitura fica num módulo compartilhado em
`src/shared/package/`, faz cache em memória e é a **única** forma de obter a versão. O
`maia --version` passa a usar esse mesmo módulo.

**Rationale**:
- Atende o FR-006 em todas as formas de execução, inclusive `node src/cli/index.ts` sem build.
  Gerar no build só funcionaria no `dist/`.
- Não exige passo de build nem arquivo gerado versionado, então não há o que esquecer
  (SC-003: subir a versão é editar só o `package.json`).
- Reaproveita uma estratégia que já funciona em produção (`resolve.package.json.path.ts`).
- O `package.json` está sempre no tarball do npm, então o arquivo sempre existe numa
  instalação íntegra.

**Alternatives considered**:
- *Gerar `package.metadata.ts` no `build:publish`*: não funciona a partir do código-fonte
  sem um passo extra. Ou o arquivo gerado fica versionado e volta a divergir (é o defeito de
  hoje), ou ele não fica versionado e o `typecheck` e os testes quebram num clone novo.
- *`import pkg from '../../package.json' with { type: 'json' }`*: o tsc copiaria o
  `package.json` para `dist/package.json` (por causa de `rootDir: "."`), o que cria uma segunda
  cópia dentro do tarball. Também exigiria `resolveJsonModule` e mudaria a profundidade
  relativa entre `src` e `dist`. Fica frágil.
- *`process.env.npm_package_version`*: só existe quando o processo roda via `npm run`. Não
  serve para o binário instalado.

## D2 — Formato do módulo de versão (pureza e arquitetura)

**Decision**: separar em três arquivos, um símbolo por arquivo (Princípios V e VIII):

- `resolve.maia.package.json.path.ts`: função pura `(here, exists) → caminho`. Recebe o
  diretório e o verificador de existência, o que a torna testável sem I/O real.
- `parse.maia.package.version.ts`: função pura `(conteúdo JSON) → versão`. Lança
  `package version not found` quando a versão falta ou é vazia (FR-009).
- `read.maia.package.version.ts`: borda de I/O. Chama as duas funções acima com
  `import.meta.url`/`existsSync`/`readFileSync` e guarda o resultado em cache no módulo.

`MAIA_PACKAGE_METADATA` perde o campo `version` e fica só com identidade fixa (`name`,
`source`). O compilador então aponta qualquer uso remanescente de `.version`.

**Rationale**: remover o campo transforma o esquecimento em erro de compilação. Os
caminhos ficam testáveis para os dois layouts.

**Alternatives considered**: um getter em `MAIA_PACKAGE_METADATA.version`. Rejeitado porque
esconde I/O atrás de um acesso a propriedade, contra o Princípio VIII.

## D3 — Identidade MCP

**Decision**:
- `createModernResultMeta` e `createModernRequestMeta` usam `readMaiaPackageVersion()`.
- `json.rpc.mcp.client.ts` (initialize legado) usa `readMaiaPackageVersion()`.
- `mcp.server.ts` passa `flags.version ?? readMaiaPackageVersion()`. A flag `--version`
  continua permitindo uma sobrescrita explícita.
- `stdio.ts` usa `options.version ?? readMaiaPackageVersion()` como padrão.

**Rationale**: cobre os pontos 3 a 7 da tabela. O `'1.0.0'` não estava na issue, mas é o
valor que o servidor efetivamente informa (Edge Case da spec).

## D4 — Correção de projetos existentes (Clarification C)

**Decision**:
- Módulo puro `has.stale.local.source.ref.ts`: retorna `true` quando
  `manifest.sources.local` existe, `type === 'registry'`,
  `url === MAIA_PACKAGE_METADATA.source` e `ref === '1.5.2'` (constante
  `STALE_LOCAL_SOURCE_REF` em arquivo próprio).
- Módulo puro `migrate.stale.local.source.ref.ts`: `(manifest, version) → manifest` novo, só
  com `sources.local.ref` trocado.
- **`maia i` sem argumentos**: depois de `ensureInitialized` e **antes** de `store.buildLock()`,
  se o manifesto estiver desatualizado, grava o manifesto migrado e mostra a mensagem do
  contrato ([contracts/cli.output.md](./contracts/cli.output.md)). Em seguida o `buildLock()`
  regenera o lockfile, com a proveniência e a integridade novas.
- **`maia ci`**: só detecta e mostra o aviso no stderr. Não grava nada e não muda o código de
  saída. Lock e manifesto antigos continuam consistentes entre si (ambos `1.5.2`), então
  `isLockStale` e `verifyLock` continuam passando.
- **`maia i <nome>`** (instalação nomeada): sem migração nem aviso. Ele roda dentro de um
  rollback próprio. Migrar ali e falhar no meio deixaria o manifesto novo com o lock antigo,
  e o `maia ci` seguinte quebraria.

**Rationale**: atende FR-010, FR-010a e FR-010b. Exigir `url` e `type` além do `ref` evita
mexer numa fonte `local` que o usuário tenha redirecionado para outro lugar.

**Alternatives considered**: migrar em qualquer comando que leia o manifesto, em
`normalizeManifest`. Rejeitado: isso faria o `maia ci` e o `maia verify` alterarem arquivos,
contra a decisão C.

## D5 — Guarda contra divergência (FR-007, FR-008)

**Decision**:
1. **Teste de sincronização** `tests/shared/maia.version.sync.test.ts`. Lê o `package.json`
   da raiz direto do disco, sem usar o módulo testado, e confere que estes valores são iguais
   a ele: `readMaiaPackageVersion()`, `createDefaultManifest().sources.local.ref`, o
   `serverInfo` de `createModernResultMeta()`, o `clientInfo` de `createModernRequestMeta()`,
   o `serverInfo` do handshake do servidor stdio criado sem versão e a saída de `maia --version`.
   Também confere que `MAIA_PACKAGE_METADATA` não tem a chave `version`.
2. **Verificação do artefato** `scripts/check-dist-version.mjs`, chamada no fim do
   `build-publish.mjs`. Importa os módulos compilados em `dist/` (leitor de versão, defaults
   do manifesto, result meta) e falha o build se algum divergir do `package.json`. Como
   `prepack` roda `build:publish`, o `npm pack` do CI e o `npm publish` passam por essa
   checagem.

**Rationale**: o teste roda no `npm test` a cada mudança. A checagem de dist cobre a forma
compilada sem deixar a suíte mais lenta com um `tsc` completo.

**Alternatives considered**: um teste que roda o build dentro da suíte. Rejeitado pelo custo,
já que o CI faz `npm pack` de qualquer forma.

## D6 — Tags de release (FR-011, User Story 4)

**Decision**:
- Script `scripts/tag-release.mjs`, ligado ao `postpublish` do `package.json`:
  1. lê `version` do `package.json` → `vX.Y.Z`;
  2. falha se a árvore git tiver mudanças não commitadas;
  3. se a tag já existe e aponta para `HEAD`, não faz nada (idempotente); se aponta para outro
     commit, falha;
  4. cria a tag anotada `vX.Y.Z` em `HEAD` e faz `git push origin vX.Y.Z`.
  Usa `spawnSync` com argv (sem `shell: true`), no mesmo padrão do resto do projeto.
- **Tags retroativas** (opcional): usar a tabela de `gitHead` acima. O quickstart documenta
  os comandos. É uma ação manual e única, feita pela pessoa mantenedora, porque cria tags
  remotas.
- Documentar o processo de release numa seção "Release" do `AGENT.md`: subir a versão,
  CHANGELOG, `npm publish` (que faz o build, a checagem de dist e a tag).

**Rationale**: o `npm publish` sai do mesmo commit do `gitHead`, e o `postpublish` só roda se
a publicação deu certo. Assim a tag nunca aponta para uma versão que não foi publicada.

**Alternatives considered**: um workflow do GitHub Actions publicando no push de tag. Ficou
fora do escopo (Assumptions da spec), porque exigiria um token npm no CI.

## D7 — Versão desta correção

**Decision**: release patch **1.6.2**, com entrada `### Fixed` no CHANGELOG explicando o
`ref: 1.5.2`, a correção automática no `maia i` e o aviso no `maia ci` (FR-012). A entrada
vazia `## [1.6.0]` duplicada no topo do CHANGELOG é removida.
