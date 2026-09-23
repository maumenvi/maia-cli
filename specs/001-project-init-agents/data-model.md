# Phase 1 Data Model: Inicialização do Projeto & Configuração de Agentes

Esta feature não introduz novas entidades persistentes — ela fecha gaps de correção
ao redor de entidades que já existem no código (`SourcesManifest`,
`AgentManifestEntry`, `AgentTarget`). Este documento descreve essas entidades
existentes conforme elas se relacionam com os quatro gaps em escopo, mais os
pequenos tipos de resultado em memória que as correções introduzem.

## Existing Entities (formato inalterado, gaps de comportamento fechados)

### Manifest (`SourcesManifest`, `src/agent/catalog/types/manifest/sources-manifest.ts`)

| Campo | Tipo | Notas |
|---|---|---|
| `name` | `string` | Nome-base do diretório do projeto por padrão |
| `version` | `string` | Versão do projeto, não versão de schema |
| `maiaVersion` | `string` | **Campo de compatibilidade de schema** — range semver (ex.: `'^1.0.0'`); lido mas ainda não validado (Decisão 2, FR-012) |
| `config` | `{ registryStrategy, strictVerify, llmAccessDefault }` | Não relacionado a esta feature |
| `registries` | `Record<string, CatalogRegistryConfig>` | Não relacionado a esta feature |
| `sources` | `Record<string, CatalogSource>` | Não relacionado a esta feature |
| `skills` / `mcps` / `tools` | `Record<string, ...Dependency>` | Não relacionado a esta feature |
| `agents` | `Record<string, AgentManifestEntry>` | Populado por `configureAgents`; lido pela "listagem de agentes configurados" (FR-005) |

**Regra de validação adicionada por esta feature**: antes de um manifesto parseado
ser normalizado e mesclado com os padrões, `maiaVersion` DEVE ser checado contra o
range suportado pela CLI em execução. Incompatível → recusar continuar (FR-012),
sem alteração de formato em nenhum campo existente.

### Agent Manifest Entry (`AgentManifestEntry`)

Inalterado. `{ id, name, enabled, addedAt }` — uma entrada por agente configurado,
indexada pelo id do agente em `manifest.agents`.

### Agent Target (`AgentTarget`, `src/agent/agents/contracts/agent-target.ts`)

Inalterado. Descreve os locais de arquivo nativos de cada agente suportado
(`configPaths`, `skillsDir`, `instructionsFile`) e como construir sua entrada de MCP
(`buildEntry`). Este é o registro que FR-004/FR-007 já implementam.

### Diretórios Fallback de Capacidade (convenção de sistema de arquivos, não uma entidade tipada)

`.maia/skills/`, `.maia/mcp/`, `.maia/tools/` sob a raiz de workspace resolvida
(`resolveSkillsDir`, `resolveToolsDir`, e o equivalente de MCP). A existência do
diretório é tratada como um sinal ("este tipo de capacidade está materializado").
Esta feature adiciona a regra de ciclo de vida do lado da remoção: o diretório DEVE
ser apagado assim que sua última entrada for removida (FR-013), mantendo o invariante
"existe ⇔ materializado" intacto em ambas as direções.

## New In-Memory Types (introduzidos pelas correções deste plano)

Estes são pequenos tipos de resultado/erro introduzidos para implementar as quatro
decisões de fechamento de gap de `research.md`. Nenhum é persistido.

### `AgentSelectionOutcome` (substitui o retorno bruto `string[]` de `promptForAgentIds`)

```ts
type AgentSelectionOutcome =
  | { kind: 'selected'; agentIds: string[] }
  | { kind: 'skipped' }          // TTY interativo, usuário apertou Enter sem entrada
  | { kind: 'non-interactive' }; // não é TTY — chamador deve falhar conforme FR-003/FR-014
```

Usado por `init-command.ts` para distinguir "usuário escolheu explicitamente
fallback-only" de "nenhum terminal interativo estava disponível para perguntar" — os
dois casos que a sessão de Clarifications do spec separou.

### `ManifestSchemaCompatibilityError` (lançado pelo gate do FR-012)

```ts
interface ManifestSchemaCompatibilityError extends Error {
  manifestVersion: string;
  supportedRange: string;
}
```

Carrega detalhe suficiente para `init-command.ts` imprimir uma mensagem dizendo ao
desenvolvedor qual versão o manifesto declara e qual a CLI em execução suporta,
conforme a exigência do FR-012 de "reportar a incompatibilidade de schema
explicitamente".

### `AtomicWriteFailure` (exposto pelo helper do FR-014)

Nenhum tipo novo necessário — `writeFileAtomic` relança o erro `fs` subjacente
inalterado (ex.: `EACCES`, `ENOSPC`) depois de garantir que o arquivo temporário (se
houver) foi limpo, de forma que os chamadores recebam o erro nativo do Node com seu
`code` intacto em vez de um erro envolvido/opaco. Isso mantém o tratamento de erro
consistente com o resto do código (ex.: o padrão já existente de `safeParseJson` de
expor o erro original com contexto adicional).

## State Transitions

Nenhuma entidade nesta feature tem um ciclo de vida multi-estado além de simples
presença/ausência (manifesto existe ou não; diretório fallback existe ou não; agente
configurado ou não) — todos os quatro comportamentos de fechamento de gap são
validações ou limpezas de passo único, não máquinas de estado.
