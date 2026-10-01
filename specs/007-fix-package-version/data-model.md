# Data Model: Versão do Maia com fonte única

**Feature**: 007-fix-package-version | **Date**: 2026-10-01

Nenhum formato persistido muda: `maia.json` e `maia.lock.json` continuam no mesmo schema
(`lockfileVersion` 1/2 sem mudança). O que muda são os **valores** e a **origem** deles.

## Entidades

### Versão do Maia (`MaiaPackageVersion`)

| Campo | Tipo | Origem | Regras |
|-------|------|--------|--------|
| valor | `string` | `version` do `package.json` do pacote em execução | Não vazio; propagado literalmente, sem normalizar (pré-release como `1.7.0-beta.1` vale como está) |

- **Fonte única**: `readMaiaPackageVersion()` em `src/shared/package/`. Nenhum outro arquivo
  de `src/` guarda a versão como literal.
- **Resolução do caminho**: tenta, nesta ordem, `<here>/../../../package.json` (layout
  `src/shared/package/`) e `<here>/../../../../package.json` (layout
  `dist/src/shared/package/`). Fica com o primeiro que existir.
- **Falha**: nenhum candidato existe → `package.json not found`. JSON sem `version` ou com
  `version` vazio → `package version not found`. Nenhum valor padrão é inventado (FR-009).
- **Cache**: é lido uma vez por processo.

### Identidade do pacote (`MAIA_PACKAGE_METADATA`)

| Campo | Valor | Muda? |
|-------|-------|-------|
| `name` | `@maumenvi/maia-cli` | Não |
| `source` | `npm:@maumenvi/maia-cli` | Não |
| ~~`version`~~ | ~~`1.5.2`~~ | **Removido** |

### Fonte `local` do manifesto (`maia.json → sources.local`)

| Campo | Valor em manifesto novo | Regras |
|-------|-------------------------|--------|
| `type` | `registry` | sem mudança |
| `url` | `MAIA_PACKAGE_METADATA.source` | sem mudança |
| `ref` | `readMaiaPackageVersion()` | antes era `1.5.2` fixo |
| `trusted` | `true` | sem mudança |

**Detecção de `ref` desatualizado** (`hasStaleLocalSourceRef`), ou seja, tudo isto verdadeiro:
`sources.local` existe ∧ `type === 'registry'` ∧ `url === MAIA_PACKAGE_METADATA.source` ∧
`ref === STALE_LOCAL_SOURCE_REF ('1.5.2')`.

### Proveniência no lockfile (`maia.lock.json → packages[*].provenance`)

Sem mudança de formato. `provenance.ref` de pacotes da fonte `local` passa a refletir o `ref`
do manifesto. Ele entra no payload de integridade, então trocar o `ref` exige regenerar o
lockfile inteiro (`store.buildLock()`).

### Identidade MCP

| Contexto | Campo | Valor |
|----------|-------|-------|
| Servidor (`maia mcp-server`): `initialize` | `serverInfo.version` | `--version` se informado; senão `readMaiaPackageVersion()` |
| Servidor: `_meta` de resultados modernos | `io.modelcontextprotocol/serverInfo.version` | igual à linha acima |
| Cliente: `initialize` legado | `clientInfo.version` | `readMaiaPackageVersion()` |
| Cliente: envelope de requisição moderna | `io.modelcontextprotocol/clientInfo.version` | `readMaiaPackageVersion()` |

Os nomes (`maia`, `maia-mcp-server`) não mudam.

### Tag de release

| Campo | Regra |
|-------|-------|
| nome | `v` + `version` do `package.json` (ex.: `v1.6.2`) |
| tipo | anotada |
| alvo | `HEAD` no momento do `npm publish` (igual ao `gitHead` registrado no npm) |
| remoto | enviada para `origin` |

## Transições de estado: fonte `local` de um projeto existente

```text
                   maia i (sem args)
 [ref = 1.5.2] ─────────────────────────────▶ [ref = versão real]
   │   manifesto + lock com 1.5.2               manifesto gravado, lock regenerado,
   │                                            mensagem "Updated ..." no stdout
   │
   │ maia ci        → continua em [ref = 1.5.2]; aviso no stderr; exit code inalterado
   │ maia i <nome>  → continua em [ref = 1.5.2]; sem aviso
   │ maia verify    → continua em [ref = 1.5.2]; sem mudança
   ▼
 [ref = outro valor]  → nunca é tocado (FR-010b)
```
