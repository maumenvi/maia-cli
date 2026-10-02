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

## Validação da implementação (T041, 2026-10-02)

CLI rodado do código-fonte em diretórios temporários, com `MAIA_CONFIG_HOME` temporário.
Catálogo e GitHub **reais** nos itens 4–6 (só leitura).

- **§1**: typecheck, 475 testes, architecture, naming e guardrails verdes; `build:publish` →
  "Dist version check passed: 1.7.0".
- **§2 Claude**:
  - projeto novo → `.mcp.json` com `maia` sem `cwd`, mensagem de aprovação, `capabilities.json`
    sem `cwd`, e o `CLAUDE.md` diz "registered for this agent in `.mcp.json`";
  - legado → "Moved the \"maia\" proxy…", o arquivo antigo fica só com `other`;
  - `.mcp.json` inválido → exit 1, mensagem "invalid JSON" e arquivo intacto;
  - os 7 agentes juntos → nenhum caminho absoluto, e Copilot/Cursor com `${workspaceFolder}`;
  - `mcp-server` responde de uma subpasta e via `CLAUDE_PROJECT_DIR`; fora de projeto →
    exit 1 e nada é criado.
- **§3**: 7 variações de `--help`/`-h` → exit 0, nenhum arquivo alterado e nenhuma skill
  instalada.
- **§4**: `skills add caveman` sem TTY → exit 1, listando os 4 identificadores exatos
  (`juliusbrussee/caveman@…`).
- **§5** (o caso do relato, `getsentry/skills@security-review`):
  - instalação → **22 arquivos** (references/, languages/, infrastructure/, LICENSE…),
    `allowedLlms: []`, aviso de colisão com `/security-review` e lock v3;
  - `--all-llms` → 22 arquivos também em `.claude/skills/security-review/`;
  - arquivo apagado e `SKILL.md` alterado → verify aponta `missing-file`/`changed-file`;
  - depois do `maia i` → verify OK;
  - clone limpo → `maia ci` restaura as duas skills (22 arquivos cada);
  - `--as sentry-security-review` → "Installed skill:sentry-security-review (from
    security-review)".
- **§6**:
  - `mcp i io.github.upstash/context7 -env-g` → arquivo global `0600` em diretório `0700`,
    nada no projeto;
  - outro projeto com a chave no global → `mcp add` não pede credencial nem cria placeholder.
- **Defeito achado e corrigido durante a validação** (commit `7a845df`): o `maia i` gerava o
  lock antes de restaurar os artefatos, então uma pasta adulterada ficava com hashes errados.
  Agora o lock é gerado de novo depois da restauração (teste `tests/cli/install.relock.test.ts`).
- **Pendente (manual)**: abrir o Claude Code num projeto real, aprovar o servidor `maia` e ver as
  ferramentas listadas.
