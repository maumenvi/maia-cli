# Implementation Plan: Tag de release só para publicação real

**Branch**: `007-fix-package-version` (o script reporta `008-fix-tag-dry-run`; a correção
entra na branch da 007, ainda não mesclada) | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-fix-tag-dry-run/spec.md`

## Summary

O `postpublish` da feature 007 (`scripts/tag-release.mjs`) cria e envia `vX.Y.Z` também em
`npm publish --dry-run` e em `npm stage publish`. Nos dois casos a versão ainda não foi
publicada. Uma sonda no npm 12.0.2 confirmou que o npm expõe `npm_config_dry_run='true'` e
`npm_command='stage'` ao script.

A correção adiciona uma função pura `decidePublishSkip(env)`, chamada antes de qualquer
comando git. Em prévia ou stage, o script imprime o motivo e termina com exit 0. O resto do
fluxo da 007 fica igual. Detalhes em [research.md](./research.md).

## Technical Context

**Language/Version**: JavaScript ESM (`.mjs`) com declaração `.d.mts`; testes em TypeScript sobre Node ≥ 26

**Primary Dependencies**: nenhuma nova

**Storage**: N/A

**Testing**: `node:test` (`tests/shared/tag.release.test.ts`), mais a validação ponta a ponta
com `npm … --dry-run` num repositório temporário

**Target Platform**: máquina da pessoa mantenedora, durante `npm publish` e `npm stage publish`

**Project Type**: script de release do CLI

**Performance Goals**: N/A

**Constraints**: zero chamadas ao git nos casos pulados; nunca apagar nem mover tags; exit 0
ao pular

**Scale/Scope**: 1 script, 1 declaração, 1 arquivo de teste, `AGENT.md`, CHANGELOG

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Como |
|-----------|--------|------|
| pt-BR | ✅ | Artefatos em pt-BR; mensagens do script em inglês, como o restante |
| I. Test-First | ✅ | Teste de `decidePublishSkip` (tabela completa) escrito antes; os testes da 007 continuam |
| II. Security by Default | ✅ | Remove uma ação externa indevida (push de tag); nada apaga nem força |
| III. Spec-Driven | ✅ | Achado do code review → spec 008 → plan → tasks |
| IV. Small & Reversible | ✅ | Um commit de código + teste e um de documentação |
| V. Single Responsibility | ✅ | Script fora de `src/`; uma função exportada por decisão, todas com JSDoc |
| VI–IX | ✅ | Sem novos diretórios; o teste segue o nome `.test.ts` |

**Resultado**: passa. Re-check pós-design: igual.

## Project Structure

### Documentation (this feature)

```text
specs/008-fix-tag-dry-run/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/release.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
scripts/
├── tag-release.mjs      # MODIFICADO: decidePublishSkip + saída antecipada em main()
└── tag-release.d.mts    # MODIFICADO: declara decidePublishSkip
tests/shared/
└── tag.release.test.ts  # MODIFICADO: casos de decidePublishSkip
AGENT.md                 # MODIFICADO: seção Release explica prévia e stage
CHANGELOG.md             # MODIFICADO: nota em [1.6.2]
```

**Structure Decision**: mudança local ao script de release da 007. Como a 1.6.2 ainda não
foi publicada, a nota entra na mesma entrada do CHANGELOG.

## Complexity Tracking

Sem violações.
