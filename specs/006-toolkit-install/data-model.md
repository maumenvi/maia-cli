# Data Model: Instalação de Toolkits

**Feature**: 006-toolkit-install | **Date**: 2026-09-24

## 1. ToolkitDefinition (catálogo embutido)

Arquivo: `src/agent/toolkits/contracts/toolkit.definition.ts`. Uma instância por
toolkit em `src/agent/toolkits/catalog/<nome>.ts`. Imutável; todas as funções são
puras (recebem dados, retornam argv).

| Campo | Tipo | Regra |
|---|---|---|
| `name` | `string` | Chave única no catálogo; `^[a-z0-9-]+$` (ex.: `speckit`). |
| `title` | `string` | Nome legível ("GitHub Spec Kit"). |
| `description` | `string` | O que o toolkit faz (US4). |
| `docsUrl` | `string` | Documentação oficial de instalação. |
| `repository` | `string` | Origem (`https://github.com/github/spec-kit`); gravada no lock. |
| `supportsGlobal` | `boolean` | Se `-g` é suportado (FR-011/FR-012). |
| `prerequisites` | `ToolkitPrerequisite[]` | `{ command, args, hint }` — checagem antes de qualquer escrita (FR-007). |
| `integrations` | `Record<AgentId, ToolkitIntegration>` | `{ key, multiInstallSafe }`; agente ausente = não suportado. |
| `projectPaths` | `string[]` | Caminhos/globs relativos ao projeto que o toolkit cria (base; ex.: `.specify`). |
| `integrationPaths` | `Record<string, string[]>` | Caminhos por integração (ex.: `claude` → `.claude/skills/speckit-*`). |
| `commands` | `ToolkitCommandBuilder` | Constrói argv: `installGlobalTool(version)`, `initProject(ctx)`, `addIntegration(ctx, key)`, `removeIntegration(ctx, key)`, `globalToolVersion()`, `uninstallGlobalToolHint()`. |
| `readProjectVersion` | `(projectRoot) => string \| null` | Lê a versão inicializada no projeto (Spec Kit: `.specify/init-options.json#speckit_version`). É a única função com I/O e fica fora do núcleo puro (injetada). |

`ToolkitCommand` = `{ command: string; args: string[] }` — nunca string de shell.

## 2. ToolkitScope

`'project' | 'global'` — escopo **efetivo da ferramenta**. Em ambos o projeto é
inicializado (Clarification 1).

## 3. ToolkitDependency (manifesto `maia.json`)

Arquivo: `src/agent/catalog/types/dependencies/toolkit.dependency.ts`.

```jsonc
"toolkits": {
  "speckit": { "version": "1.0.11", "scope": "global" }
}
```

| Campo | Tipo | Regra |
|---|---|---|
| chave | `string` | Deve existir no catálogo embutido (FR-003a); caso contrário `maia i`/`ci` falham. |
| `version` | `string` | Exata, `^\d+\.\d+\.\d+$` (research Decision 4). |
| `scope` | `ToolkitScope` | Efetivo (FR-013); `global` só se `supportsGlobal`. |

`SourcesManifest.toolkits` é normalizado para `{}` quando ausente
(`normalize.manifest.ts`, `defaults.ts`).

## 4. LockToolkit (lockfile `maia.lock.json`)

Arquivo: `src/agent/catalog/types/lock/lock.toolkit.ts`. Derivado **puramente** de
manifesto + catálogo (`build.toolkit.lock.entries.ts`) — sem rede, sem disco.

```jsonc
"lockfileVersion": 2,
"toolkits": {
  "speckit": {
    "name": "speckit",
    "version": "1.0.11",
    "scope": "global",
    "source": "https://github.com/github/spec-kit",
    "ref": "v1.0.11",
    "integrations": ["claude"],
    "paths": [".specify", ".claude/skills/speckit-*"]
  }
}
```

| Campo | Origem |
|---|---|
| `name`, `version`, `scope` | manifesto |
| `source` | `definition.repository` |
| `ref` | `v${version}` |
| `integrations` | agentes habilitados do manifesto mapeados por `definition.integrations` (research D3): se houver alguma multi-install safe, todas as safe na ordem do manifesto (primeira = primária) e nenhuma não safe; senão, só a primeira não safe; omitidos: não suportados e incompatíveis |
| `paths` | `projectPaths` + `integrationPaths` das integrações efetivas |

`SourceLock.toolkits?` — ausente ou `{}` quando não há toolkits.
`lockfileVersion` = `2` se `toolkits` não vazio, senão `1`. Versões aceitas: `{1, 2}`.
`lockComparableProjection` inclui `toolkits` (staleness, US2.3).

## 5. Estado de instalação (runtime, não persistido)

`ToolkitInstallState` — resultado de detecção, usado por `maia i`, `ci`, `verify`:

| Estado | Condição | Ação em `i`/`ci` |
|---|---|---|
| `absent` | projeto sem versão detectada | executar instalador |
| `installed` | versão normalizada == lock | nada (FR-017) |
| `mismatch` | versão diferente | `i`, `ci` e `verify`: **falha** com as duas versões e orientação `maia toolkit i <n> --version <y>`; nunca reinstala (Clarification 6) |
| `global-tool-missing` | escopo global e `specify --version` falha/difere | instalar ferramenta global |

Transições de `maia toolkit i`:

```text
[validar nome] → [resolver escopo efetivo (+aviso -g)] → [resolver versão]
 → [checar pré-requisitos] → [detectar estado]
   ├─ installed (mesma versão) → "já instalado", fim
   ├─ presente sem registro, mesma versão → adotar (grava manifesto/lock, sem executar)
   ├─ mismatch (troca explícita via --version) → [guardrail 'file-overwrite' nos
   │     caminhos existentes; bloqueio aborta] → confirmação avisa sobrescrita ↓
   └─ absent → [exibir comando + confirmar (-y)] → [snapshot caminhos]
        → [executar instalador] ─ falha → [rollback caminhos novos] → erro
                                 └ ok → [manifesto] → [lock] → [agentes] → fim
```

## 6. ToolkitView (saída de `maia toolkit ls` e do MCP `maia_toolkits`)

| Campo | Tipo |
|---|---|
| `name`, `title`, `description`, `docsUrl` | `string` |
| `supportsGlobal` | `boolean` |
| `installed` | `boolean` |
| `version`, `scope` | presentes se instalado |
| `integrations`, `paths` | presentes se instalado (do lock) |
| `installCommand` | `maia toolkit i <name>` |

Construído por função pura `toToolkitView(definition, lockEntry?)`.

## 7. Relações

```text
maia.json.agents ──(ordem, mapeamento)──▶ LockToolkit.integrations
ToolkitDefinition ─1:N─ LockToolkit (por projeto)
maia.json.toolkits ─1:1─ maia.lock.json.toolkits (staleness)
```
