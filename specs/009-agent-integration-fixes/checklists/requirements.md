# Specification Quality Checklist: Integração com o Claude Code, skills completas, instalação segura e variáveis globais

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

- A spec cita arquivos (`.mcp.json`, `CLAUDE.md`, `.maia/mcp.env`) e comandos do CLI porque são
  a interface visível para quem usa o Maia; o "como" fica para o plano.
- Marcador sobre `allowedLlms` de fontes não confiáveis resolvido no `/speckit-plan` com a
  opção recomendada B, porque a pergunta ficou sem resposta (ver Clarifications). Pode ser
  revista antes do `/speckit-tasks`.
- 2026-10-02: FR-004 passa a valer para todos os agentes (decisão da pessoa usuária no
  `/speckit-analyze`, achado I1); novo FR-004a sobre a descoberta da raiz pelo `maia mcp-server`.
- Escopo: a spec agrupa 4 correções e 1 funcionalidade nova em 6 user stories independentes.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
