# Phase 1 Data Model: Catálogo de Capacidades & Descoberta

Esta feature não introduz novas entidades persistidas — fecha gaps de
comportamento ao redor de entidades já existentes (`CatalogSearchResult`,
`LockPackage`, `GitCatalogSource`, `CatalogRegistryConfig`) e introduz um pequeno
conjunto de tipos em memória para carregar a informação de falha/dedup que hoje
se perde.

## Existing Entities (formato inalterado)

### CatalogSearchResult (`providers/contracts/catalog-search-result.ts`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | Identificador canônico qualificado pela fonte (ex.: `vercel-labs/skills/react`) — usado para instalação (FR-004) |
| `kind` | `CatalogKind` | `'skill' \| 'mcp' \| 'tool'` |
| `name` | `string` | Nome local da capacidade — campo comparado por FR-008 contra `LockPackage.name` |
| `displayName`, `description?`, `provider`, `source`, `version?`, `installs?` | — | Metadados de apresentação, inalterados |
| `credentials?` | `Array<{...}>` | Inalterado |
| `install` | `CatalogInstall` | Inalterado |

Nenhum campo novo. Usado como está tanto no array de `results` do novo
`CatalogSearchOutcome` (Decision 1) quanto como entrada/saída de
`excludeLocallyInstalled` (Decision 3).

### LockPackage (`types/lock/lock-package.ts`)

Inalterado. `name` + `type` (kind) formam o par de identidade usado por
`excludeLocallyInstalled` para decidir se um `CatalogSearchResult` já está
instalado localmente (mesmo par que `getInstalledPackages` já usa internamente).

### GitCatalogSource / CatalogSourceBase (`types/source/*.ts`)

Inalterado. `{ type: 'git', url, ref?, trusted? }`. A validação de FR-005
(Decision 4) acontece **antes** de um valor deste tipo ser construído/persistido
— `isValidGitSourceUrl` valida a string `url` recebida do CLI, não o objeto já
tipado.

### CatalogRegistryConfig (`types/manifest/catalog-registry-config.ts`)

Inalterado — continua sendo a fonte de verdade para `createCatalogProviders`
(provedores de busca, distintos de `sources` por decisão da Clarification 1).

## New In-Memory Types (introduzidos pelas correções deste plano)

Nenhum destes é persistido no manifesto ou lockfile — todos são tipos de
resultado de função, vivos apenas durante uma invocação de comando.

### `CatalogSearchFailure` (Decision 1, FR-006)

```ts
interface CatalogSearchFailure {
  providerId: string;
  kind: CatalogKind;
  message: string;
}
```

Uma entrada por provedor cuja `search()` rejeitou durante uma chamada de
`searchCatalog`. `message` é a mensagem do erro original (ex.: "skills.sh search
failed (503)" ou o texto de timeout do `AbortController`), sem envolvimento
adicional — mantém consistência com o padrão já usado no projeto de propagar
mensagens de erro nativas.

### `CatalogSearchOutcome` (Decision 1, FR-006)

```ts
interface CatalogSearchOutcome {
  results: CatalogSearchResult[];
  failures: CatalogSearchFailure[];
}
```

Novo tipo de retorno de `searchCatalog`, substituindo `CatalogSearchResult[]`
puro. Todo chamador existente de `searchCatalog` precisa ser atualizado para
desestruturar `{ results, failures }` em vez de tratar o retorno como array
diretamente — ver contracts/search-catalog.md para o contrato completo, incluindo
a lista dos chamadores afetados.

## State Transitions

Nenhuma entidade desta feature tem ciclo de vida multi-estado — `trusted` em uma
fonte Git é um atributo mutável simples sem histórico (Clarification 2: mudança
de confiança não dispara nenhuma transição de estado ou efeito colateral nesta
spec). Todas as correções deste plano são transformações de dados de leitura
única (buscar → filtrar/anotar → exibir), não máquinas de estado.
