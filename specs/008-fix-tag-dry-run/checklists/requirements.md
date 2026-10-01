# Specification Quality Checklist: Tag de release só para publicação real

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

- A spec cita `npm publish --dry-run`, `npm stage` e `AGENT.md` porque o defeito é sobre esses
  fluxos de publicação, que são visíveis para quem mantém o pacote. Os nomes das variáveis de
  ambiente e o desenho do código ficam para o plano.
- Nenhuma clarificação foi necessária. Os padrões escolhidos são: pular com exit 0 e
  mensagem; a execução manual equivale a publicação real; no stage, orientar a criar a tag
  manualmente depois de aprovar.
- O comportamento do npm foi conferido no código do npm 12.0.2 instalado: o dry-run executa o
  `postpublish` e o `stage approve` não executa scripts.

## Validação da implementação (T006, 2026-10-01)

- §1 gates: typecheck, 358 testes, check:architecture e check:naming verdes.
- §2 npm real (12.0.2) num repositório temporário com remoto bare; pacote de sonda inexistente,
  só `--dry-run`, nada enviado ao registro:
  - `npm publish --dry-run` → `Skipping release tag v9.9.9: npm --dry-run does not publish the package`, exit 0;
  - `npm stage publish --dry-run` → mesma mensagem (o dry-run tem prioridade);
  - árvore suja + `--dry-run` → mensagem de prévia, sem "not clean";
  - `npm_command=stage` → mensagem de stage com o comando para depois da aprovação, exit 0;
  - nenhuma tag local nem remota depois desses passos.
- §3 regressão da 007 com `node scripts/tag-release.mjs`: cria e envia; idempotente no HEAD;
  recusa mover (exit 1); recusa árvore suja (exit 1).
