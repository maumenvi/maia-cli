# Phase 1 Data Model: Lockfile, Integridade & Restauração em CI

Esta feature faz **uma** alteração de formato em entidade persistida (remoção de
`generatedAt` de `SourceLock`) e introduz três tipos em memória para o relato
agregado de verificação e para o gate de staleness.

## Existing Entities

### SourceLock (`src/agent/catalog/types/lock/source-lock.ts`) — ALTERADO

| Campo | Tipo | Notas |
|---|---|---|
| `name` | `string` | Inalterado |
| `lockfileVersion` | `number` | Literal `1`. Hoje escrito mas nunca lido; passa a ser lido pelo gate do FR-010. **Permanece `1`** — a remoção de `generatedAt` não quebra leitura (ver Decision 1) |
| ~~`generatedAt`~~ | ~~`string`~~ | **REMOVIDO** (FR-001, Clarification 2) — nenhum consumidor o lê; sua presença tornava SC-003 falso |
| `sources` | `Record<string, CatalogSource & { commit, commitResolved? }>` | Inalterado |
| `packages` | `Record<string, LockPackage>` | Inalterado |

**Regra de escrita adicionada**: o lockfile não é reescrito quando o conteúdo
serializado for idêntico ao que já está em disco (FR-001, Clarification 10) —
preserva o timestamp de modificação.

**Compatibilidade de leitura**: um lockfile pré-existente que ainda contenha
`generatedAt` continua sendo parseado sem erro (campo extra ignorado, como já
acontece hoje com qualquer campo desconhecido).

### LockPackage (`src/agent/catalog/types/lock/lock-package.ts`) — inalterado

Formato inalterado, mas dois campos ganham papel novo nesta feature:

- **`artifactHash?: string`** — gravado por `createPackageDescriptor` **somente
  quando o arquivo já existe em disco** no momento do lock. Sua **ausência** passa
  a ser um erro de verificação (FR-002, Decision 2), e ele é **excluído** da
  comparação de staleness (FR-008, Decision 4), por depender do disco e não do
  manifesto.
- **`integrity: string`** — computado incluindo `artifactHash`
  (`create-lock-integrity-payload.ts`), portanto igualmente dependente do disco e
  igualmente **excluído** da comparação de staleness.

Todos os demais campos (`name`, `type`, `version`, `source`, `resolvedFrom`,
`path`, `enabled`, `capabilities`, `constraints`, `allowedLlms`, `sourceCommit`,
`provenance`, `vscode`, `inputSchema`) derivam do manifesto + registro local +
resolução de fonte, e por isso **compõem** a projeção comparável.

## New In-Memory Types

Nenhum é persistido; todos vivem apenas durante uma invocação de comando.

### `LockVerificationProblem` (FR-002, Decision 3)

```ts
interface LockVerificationProblem {
  packageId: string;
  kind: 'metadata' | 'missing-artifact' | 'hash-mismatch' | 'missing-artifact-hash' | 'empty-artifact';
  message: string;
}
```

Um problema encontrado durante a verificação. `packageId` é a chave
`${tipo}:${nome}` usada em `lock.packages`. Os cinco valores de `kind` mapeiam
exatamente os casos que `verifySourceLock` hoje trata (os quatro primeiros já
existem como lançamentos; `missing-artifact-hash` é o caso novo do FR-002).

### `LockVerificationResult` (FR-002, Decision 3)

```ts
type LockVerificationResult =
  | { ok: true }
  | { ok: false; problems: LockVerificationProblem[] };
```

Novo tipo de retorno de `verifySourceLock`, substituindo o atual `{ ok: true }`
com lançamento no primeiro problema. Permite ao chamador reportar todos de uma vez
(Clarification 9).

### `LockComparableProjection` (FR-008, Decision 4)

```ts
type LockComparableProjection = {
  name: string;
  sources: SourceLock['sources'];
  packages: Record<string, Omit<LockPackage, 'artifactHash' | 'integrity'>>;
};
```

A parte do lockfile determinada pelo manifesto, usada para decidir staleness.
Exclui exatamente os dois campos que dependem do estado do disco — sem essa
exclusão, todo checkout de CI limpo seria reportado como desatualizado (ver
Decision 4 em research.md para o raciocínio completo).

## State Transitions

O lockfile não ganha ciclo de vida novo. A única transição relevante introduzida é
a do **veredito de verificação**, que deixa de ser binário-por-interrupção
(sucesso, ou exceção no primeiro problema) e passa a ser binário-por-agregação
(sucesso, ou falha com a lista completa de problemas) — uma mudança na forma do
resultado, não uma máquina de estados.
