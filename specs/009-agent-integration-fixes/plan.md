# Implementation Plan: Integração com o Claude Code, skills completas, instalação segura e variáveis globais

**Branch**: `009-agent-integration-fixes`, criada a partir da `develop` depois do merge da
`007-fix-package-version` (merge `246e7e2`) | **Date**: 2026-10-02 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-agent-integration-fixes/spec.md`

## Summary

Seis user stories independentes a partir do relato de uso do 1.6.1:

1. **US1 (P1)**: o alvo `claude` passa a escrever **só** em `.mcp.json`, migra a entrada
   `maia` do arquivo legado `.claude/claude_desktop_config.json`, para de gravar `cwd`
   absoluto (Claude, e `${workspaceFolder}` no Copilot) e o bloco do `CLAUDE.md` reflete o
   registro real.
2. **US2 (P1)**: `--help`/`-h` é interceptado em `src/cli/index.ts` antes de qualquer handler.
3. **US3 (P1)**: busca ambígua pede escolha ou falha sem TTY. Fonte não confiável só é
   autorizada para agentes com consentimento (Clarification B).
4. **US4 (P2)**: skill vira pasta. Os backends trazem a árvore, o lock ganha `files` e
   `lockfileVersion` 3, o verify aponta o arquivo e o agente recebe a pasta inteira.
5. **US5 (P2)**: credenciais globais em `${XDG_CONFIG_HOME:-~/.config}/maia/mcp.env` com
   `--env-g` e precedência processo > projeto > global; alias `maia mcp i`.
6. **US6 (P3)**: aviso de colisão com comandos nativos e `--as <nome>`.

Causas e decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 7 sobre Node.js ≥ 26 (TS nativo no dev)

**Primary Dependencies**: nenhuma nova; `node:fs`, `node:path`, `node:os`, `node:crypto`,
`node:readline/promises`, `node:child_process` (backend git)

**Storage**: arquivos: `.mcp.json`, `.maia/`, `maia.json`, `maia.lock.json` (passa para a v3
quando há skill de pasta) e o arquivo global `mcp.env`

**Testing**: `node:test`, com `fetch` falso, repositório git local temporário, TTY simulado
por injeção (`isInteractive`, `ConfirmFn`, `selectFn`) e `MAIA_CONFIG_HOME` temporário

**Target Platform**: CLI em Linux, macOS e Windows. Permissões `0600`/`0700` só em POSIX.

**Project Type**: CLI + servidor MCP stdio

**Performance Goals**: instalar uma skill de 50 arquivos com no máximo 1 chamada à API de
árvore do GitHub + N downloads de conteúdo bruto; ajuda em menos de 100 ms (sem I/O de projeto)

**Constraints**: nenhuma rede nos testes; nunca apagar arquivo que o Maia não criou; nada de
caminho absoluto nos arquivos de projeto do Claude e do Copilot; limite de 200 arquivos e 5 MB
por skill

**Scale/Scope**: cerca de 40 arquivos novos ou alterados em `src/`, testes correspondentes,
README (en/pt-BR), SECURITY, AGENT, CHANGELOG e versão 1.7.0

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Como |
|-----------|--------|------|
| pt-BR | ✅ | Artefatos em pt-BR; mensagens do CLI em inglês, como o resto |
| I. Test-First | ✅ | Cada tarefa traz o próprio teste; toda E/S é injetável (fetch, TTY, confirm, config home) |
| II. Security by Default | ✅ | O próprio objetivo de US2/US3. Arquivo global `0600`. Caminhos de skill validados (sem `..`, sem symlink). O Maia não apaga arquivos que não criou nem altera configs globais de agentes. Nenhum segredo em arquivo versionado |
| III. Spec-Driven | ✅ | spec → (clarificação B adotada) → plan → tasks |
| IV. Small & Reversible | ✅ | Seis fatias independentes, cada uma em vários commits pequenos (ver Ordem) |
| V. Single Responsibility | ✅ | Funções puras novas em arquivos próprios: `wants.help`, `command.help`, `is.exact.catalog.identifier`, `resolve.effective.trust`, `decide.allowed.llms`, `hash.skill.files`, `resolve.global.config.dir`, `merge.env.layers`, … |
| VI. Scope-Organized | ✅ | `src/cli/help/` (novo), `src/config/core/` (env global), `src/cli/shared/remote-skill/` (árvore), `src/agent/agents/` (registro), `src/agent/catalog/lock/` (files/v3) |
| VII. Clean Code | ✅ | `help.ts` passa a usar o mapa `command.help` (fonte única); o loop de "tentar o próximo candidato" do `skills add` é removido |
| VIII. Pure Functions | ✅ | Decisões puras; I/O só nas bordas (comandos, backends, loaders) |
| IX. Naming | ✅ | Nomes com ponto e `.test.ts` |

**Resultado**: passa. Pontos de atenção registrados (não são violações):

- A spec dizia que o FR-004 valia para "todos os agentes"; o plano restringiu a Claude e
  Copilot (research D3). A mudança está nas Clarifications da spec.
- A integridade normaliza `allowedLlms: []` para `['*']` (research D7). O comportamento não
  muda, mas o hash de integridade não distingue os dois casos. Verificar no code review.

*Re-check pós-design*: igual.

## Project Structure

### Documentation (this feature)

```text
specs/009-agent-integration-fixes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── agent.registration.md
│   ├── cli.install.md
│   ├── skill.directory.md
│   └── env.global.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── cli/
│   ├── index.ts                                   # intercepta --help/-h (US2)
│   ├── help/                                      # NOVO
│   │   ├── wants.help.ts                          # puro
│   │   └── command.help.ts                        # mapa comando → linhas; help.ts usa
│   ├── commands/
│   │   ├── help.ts                                # usa command.help
│   │   ├── skills/run.skills.cli.ts               # exato/ambíguo/TTY, --as, --llms (US3, US6)
│   │   ├── mcp/mcp.command.ts                     # alias i, parseFlags, --env-g, exato/ambíguo (US3, US5)
│   │   ├── agent/configure.agents.ts              # .mcp.json, migração do legado, registro → bloco (US1)
│   │   ├── agent/materialize.agent.skills.ts      # espelha a pasta (US4)
│   │   ├── agent/render.agent.capability.block.ts # recebe AgentRegistration (US1)
│   │   ├── agent/write.agent.instructions.ts      # idem
│   │   └── install/install.command.ts             # migração de skill de arquivo → pasta (US4)
│   ├── install/
│   │   ├── external/install.catalog.result.ts     # allowedLlms por confiança (US3), sourceName (US6)
│   │   ├── external/is.exact.catalog.identifier.ts   # NOVO, puro
│   │   ├── external/resolve.effective.trust.ts       # NOVO, puro
│   │   ├── external/decide.allowed.llms.ts           # NOVO, puro
│   │   ├── mcp-credentials/configure.mcp.credentials.from.result.ts  # scope project|global (US5)
│   │   ├── mcp-credentials/ensure.env.file.entries.ts                # não cria placeholder se há global (US5)
│   │   └── skill/install.skill.ts                 # pasta + sourceName (US4, US6)
│   └── shared/
│       ├── flags/normalize.legacy.flags.ts        # NOVO: -env-g → --env-g
│       ├── select/select.catalog.result.ts        # mostra [trusted|untrusted]
│       ├── remote-skill/*                         # backends devolvem SkillFiles (US4)
│       └── workspace/materialize.remote.skill.ts  # grava a árvore com espelho (US4)
├── agent/
│   ├── agents/
│   │   ├── contracts/agent.target.ts              # legacyConfigPaths, projectDir, nativeCommands
│   │   ├── contracts/agent.registration.ts        # NOVO tipo
│   │   ├── registry/claude.ts, copilot.ts, mcp.entry.ts   # (US1, US6)
│   │   └── profiles/write.agent.capability.profile.ts     # sem cwd (US1)
│   └── catalog/lock/
│       ├── package.descriptor.ts                  # files + artifactHash de pasta (US4)
│       ├── hash.skill.files.ts                    # NOVO, puro
│       ├── build.ts                               # lockfileVersion 3 (US4)
│       ├── integrity/create.lock.integrity.payload.ts   # files/sourceName quando presentes
│       └── verify/verify.source.lock.ts           # missing/changed/unexpected-file (US4)
└── config/core/
    ├── resolve.global.config.dir.ts               # NOVO, puro (env, platform, home injetados)
    ├── global.mcp.env.path.ts                     # NOVO
    ├── merge.env.layers.ts                        # NOVO, puro
    └── load.mcp.env.from.current.project.ts       # camadas processo > projeto > global (US5)

tests/ …                                           # um .test.ts por arquivo puro + cenários de CLI
README.md, README.pt-BR.md, SECURITY.md, AGENT.md, CHANGELOG.md, package.json (1.7.0)
```

**Structure Decision**: projeto único que já existe; cada mudança fica no escopo em que o
comportamento vive hoje. `src/cli/help/` é o único diretório novo.

## Ordem sugerida

1. **US2** (ajuda): pequena, isolada, fecha a brecha mais grave na hora.
2. **US3** (exato/ambíguo + autorização): depende de nada; reaproveita o seletor.
3. **US1** (Claude): independente; precisa da mudança no `AgentTarget`.
4. **US5** (env global + `mcp i`): independente; mexe em credenciais e no runtime.
5. **US4** (skills como pasta): a maior; mexe em lock e verify (v3).
6. **US6** (colisão + `--as`): depende do `sourceName` da US4 para não duplicar a mudança no
   lock.
7. Documentação, versão 1.7.0 e validação do quickstart.

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Lock v3 recusado por Maia antigo em outro clone | Mensagem de compatibilidade que já existe; CHANGELOG avisa para atualizar o Maia junto |
| API de árvore do GitHub truncada em repositórios enormes (`truncated: true`) | Se truncada e os arquivos da pasta não vierem completos, falhar com mensagem clara em vez de instalar parcial |
| Formato do `index.json` well-known diferente do esperado | Fallback para só `SKILL.md`, com aviso; fixture na implementação |
| Usuário com `.mcp.json` editado à mão com comentários (JSONC) | `readJson` falha → mensagem "invalid JSON" sem escrever (contrato) |
| Lista de comandos nativos do Claude desatualizada | Aviso só informativo, não bloqueia |
| `allowedLlms: []` × integridade normalizada | Registrado para o code review (Constitution Check) |

## Complexity Tracking

Sem violações; nada a registrar.
