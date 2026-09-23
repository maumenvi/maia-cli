# Contract: `maia rm skill|tool|mcp <name>`

Contrato de comando CLI — descreve comportamento observável. Cobre apenas os
comportamentos alterados por este plano (FR-006, FR-008); a estrutura geral
do comando (`maia rm <kind> <name>`) permanece.

## Invocation

```text
maia rm skill <name>
maia rm tool <name>
maia rm mcp <name>
```

## Behavior 1 — Remoção de tool apaga o artefato materializado (FR-006)

**Given**: Uma tool instalada, materializada em `.maia/tools/<name>.mjs`
(ou path customizado gravado em `dependency.path`).

**Then**: `maia rm tool <name>` remove a entrada do manifesto, reconstrói o
lockfile, **e** apaga o arquivo materializado. Se esse arquivo era o único
em `.maia/tools/`, o diretório vazio resultante também é removido (mesmo
comportamento já existente para skills).

**Given** (regressão): mesmo cenário, mas para uma tool que nunca foi
instalada.

**Then**: comportamento inalterado — a remoção de uma entrada inexistente
não lança erro fatal (mesmo comportamento hoje aplicado a skill/mcp).

## Behavior 2 — Remoção de MCP sincroniza todos os agentes configurados (FR-006)

**Given**: Um MCP instalado e autorizado para múltiplos agentes
configurados (ex.: Claude e VS Code Copilot).

**Then**: `maia rm mcp <name>` remove a entrada do manifesto, reconstrói o
lockfile, e sincroniza a configuração nativa de **todos** os agentes
configurados (não apenas VS Code) — o MCP removido não aparece mais em
nenhuma configuração nativa após o comando terminar.

## Behavior 3 — Remoção de skill apaga cópias nativas órfãs (FR-006, SC-004)

**Given**: Uma skill instalada e materializada tanto no diretório fallback
(`.maia/skills/`) quanto no diretório nativo de um ou mais agentes
configurados (ex.: `.claude/skills/<name>/SKILL.md`).

**Then**: `maia rm skill <name>` remove a entrada do manifesto, reconstrói o
lockfile, apaga o arquivo do diretório fallback (comportamento já existente),
**e** apaga o diretório `<name>/` correspondente em cada agente configurado
que tem `skillsDir` — zero arquivos residuais em qualquer local previamente
populado, conforme SC-004.

## Behavior 4 — Rollback em interrupção durante remoção (FR-008)

**Given**: Uma remoção (qualquer kind) é interrompida por uma exceção após
`removeDependency` ter sido chamado mas antes de `buildLock()` completar
(ou em qualquer ponto intermediário da sequência de passos).

**Then**: o rollback reverte os passos já concluídos — a entrada removida
do manifesto é restaurada, e nenhum arquivo é deixado parcialmente
apagado/materializado de forma inconsistente com o manifesto resultante.

## Out of scope for this contract

- O formato de saída de `maia rm` (mensagens de confirmação) — inalterado.
- Remoção de fontes Git (`maia source rm`, se existir) — fora do escopo
  desta feature, coberto por [[002-capability-catalog-discovery]] se
  aplicável.
