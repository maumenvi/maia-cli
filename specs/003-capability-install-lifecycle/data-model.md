# Phase 1 Data Model: Ciclo de Vida de Instalação de Capacidades

Esta feature não introduz novas entidades persistidas nem altera o schema de
manifesto/lockfile — fecha gaps de comportamento ao redor de entidades já
existentes (`SkillDependency`, `ToolDependency`, `McpDependency`,
`LockPackage`, `AgentTarget`) e introduz um pequeno conjunto de tipos em
memória para o mecanismo de rollback e a checagem de compatibilidade de
transporte.

## Existing Entities (formato inalterado)

### CatalogDependencyBase e suas 3 extensões (`SkillDependency`, `ToolDependency`, `McpDependency`)

| Campo | Tipo | Notas |
|---|---|---|
| `version` | `string` | Sobrescrita direta em reinstalação (FR-009) — sem mudança de formato |
| `source` | `string` | `'local'` para tools (FR-005, já imposto); alias de fonte para skill/MCP |
| `path?` | `string` | Path relativo do artefato materializado; usado por `remove.ts` para resolver o que apagar |
| `allowedLlms?` | `string[]` | Escopo de LLM (FR-002); `['*']` = todos, padrão |
| `enabled?`, `capabilities?`, `constraints?` | — | Inalterados, fora de escopo deste plano |
| `inputSchema?` (só Tool) | `Record<string, unknown>` | Inalterado |
| `vscode` (só MCP) | `MCPConfig` | Fonte de verdade do transporte/config; consumido por `agentSupportsTransport` (Decision 2) |

Nenhum campo novo. O rollback (Decision 1) opera sobre chamadas
existentes a `store.addDependency`/`store.removeDependency`, sem alterar a
forma desses tipos.

### LockPackage / AgentTarget

Inalterados. `AgentTarget.skillsDir?` continua sendo o gate usado tanto por
`materializeAgentSkills` (instalação) quanto pela nova
`removeNativeAgentSkillCopies` (Decision 5) para saber se um agente tem
diretório nativo de skills a limpar.

## New In-Memory Types (introduzidos pelas correções deste plano)

Nenhum destes é persistido no manifesto ou lockfile — todos são tipos de
coordenação, vivos apenas durante uma invocação de comando.

### `RollbackStep<T>` (Decision 1, FR-008)

```ts
interface RollbackStep<T> {
  run: () => T | Promise<T>;
  undo: () => void;
}
```

Um passo de uma sequência de instalação/remoção. `run()` executa a ação;
`undo()` desfaz especificamente o que aquele `run()` fez, sem depender do
estado de outros passos (cada `undo` deve ser independentemente correto,
mesmo que passos vizinhos nunca tenham rodado ou já tenham sido desfeitos).

### `InstallRollbackError` (Decision 1, FR-008)

Nenhum tipo de erro novo é necessário — `withRollback` relança o erro
original que causou a falha (preservando `code`/mensagem/stack), após
executar os `undo()` pendentes. Isso mantém consistência com o padrão já
usado por `writeFileAtomic` (relançar o erro nativo, não envolver em um
tipo opaco).

## State Transitions

Nenhuma entidade desta feature ganha um ciclo de vida multi-estado novo.
Uma capacidade instalada continua sendo simplesmente presente/ausente no
manifesto — o rollback garante que uma transição interrompida (instalando →
falha) sempre resulte em "ausente" (estado anterior restaurado) ou
"presente" (estado final atingido), nunca em um terceiro estado observável
intermediário. Isso é uma garantia sobre a *sequência de escrita*, não uma
máquina de estados nova na entidade em si.
