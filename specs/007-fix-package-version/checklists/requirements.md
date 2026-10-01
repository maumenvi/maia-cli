# Specification Quality Checklist: Versão do Maia com fonte única

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-01
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- A seção Contexto cita arquivos e campos (`package.json`, `serverInfo`, `clientInfo`, `ref`)
  porque o próprio defeito é sobre esses artefatos visíveis ao usuário; a escolha de *como*
  sincronizar (build vs. runtime) foi deixada explicitamente para o plano.
- Resolvido em 2026-10-01: projetos existentes com `ref: 1.5.2` são corrigidos pelo `maia i`
  (opção C; ver Clarifications, FR-010, FR-010a, FR-010b).
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`

## Validação da implementação (T019, 2026-10-01)

- §1 gates: typecheck, 353 testes, check:architecture, check:naming e guardrails verdes. A busca
  por literais de versão só encontra `version: '0.1.0'` em `defaults.ts`, que é a versão do
  projeto do usuário, não a do Maia.
- §2 projeto novo pelo código-fonte: `--version` 1.6.2; `maia.json` e `maia.lock.json` com
  `ref` 1.6.2; `maia ci` com exit 0.
- §3 projeto com `1.5.2`: `maia ci` avisa, termina com exit 0 e não muda o `ref` (a única
  diferença no `maia.json` foi a quebra de linha final, que o `ci` já normalizava antes desta
  feature); `maia i` corrige para 1.6.2 e o `ci` seguinte não avisa. Controle com `1.5.7`:
  nada muda e nenhum aviso aparece.
- §4 `maia mcp-server` → `serverInfo` `{ name: 'maia-mcp-server', version: '1.6.2' }`.
- §5 `npm pack` → "Dist version check passed: 1.6.2"; o tarball mostra 1.6.2 instalado
  localmente, via `npx --package <tgz>` e com `npm i -g --prefix`; manifesto novo com `ref` 1.6.2.
- §6 tag: script validado num repositório temporário com remoto bare (os quatro casos do
  contrato). A tag real só existe depois do `npm publish`, que fica com a pessoa mantenedora.
