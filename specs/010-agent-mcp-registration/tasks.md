---
description: "Tarefas de implementação do registro do proxy Maia por agente"
---

# Tasks: Registro do proxy `maia` no Cursor, Cline, Continue e demais agentes

**Input**: Design documents from `specs/010-agent-mcp-registration/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Test-first is required by the feature plan. Write each focused test before its implementation and verify that it fails for the intended reason.

**Organization**: Tasks are grouped by user story and dependency. The shared registration and migration foundation is completed before story work.

## Phase 1: Setup

**Purpose**: Prepare safe test isolation for platform-specific Cline settings.

- [X] T001 Add Cline global-path fixtures and explicit assertions that tests use temporary settings paths in `tests/cli/cline.global.registration.test.ts`
- [X] T002 Isolate Cline, XDG, and APPDATA settings paths for the test process in `scripts/run-tests.mjs`

---

## Phase 2: Foundational

**Purpose**: Implement shared project-root resolution, idempotent config writes, and legacy migration used across agent stories.

- [X] T003 [P] Add tests for `MAIA_PROJECT_DIR` precedence, invalid values, and existing Claude/cwd fallbacks in `tests/shared/resolve.mcp.server.project.root.test.ts`
- [X] T004 Resolve the MCP project root from `MAIA_PROJECT_DIR` before `CLAUDE_PROJECT_DIR` in `src/config/core/resolve.mcp.server.project.root.ts`
- [X] T005 [P] Add tests for unchanged writes and format-aware removal that preserves unrelated config entries in `tests/agents/inject/inject.agent.config.test.ts` and `tests/agents/inject/remove.proxy.entry.test.ts`
- [X] T006 Add `LegacyProxyLocation` and generalized legacy-location metadata to `src/agent/agents/contracts/legacy.proxy.location.ts` and `src/agent/agents/contracts/agent.target.ts`
- [X] T007 Add pure format-aware proxy removal for `mcp-servers`, `servers`, `zed-settings`, and TOML registries in `src/agent/agents/inject/remove.proxy.entry.ts`
- [X] T008 Add migration I/O that removes only Maia's legacy entries, reports source and destination, and preserves invalid/unrelated files in `src/agent/agents/inject/migrate.legacy.proxy.locations.ts`
- [X] T009 Add the `changed` result contract and avoid rewriting byte-identical agent config in `src/agent/agents/inject/inject.result.ts` and `src/agent/agents/inject/inject.agent.config.ts`
- [X] T010 Migrate Claude legacy config handling to `legacyProxyLocations` without changing its behavior in `src/agent/agents/registry/claude.ts` and `src/cli/commands/agent/configure.agents.ts`

**Checkpoint**: Shared root resolution, safe/idempotent config writes, and migration are tested before Cursor, Continue, and Cline implementation.

---

## Phase 3: User Story 1 - Cursor proxy registration (Priority: P1)

**Goal**: Register the Maia proxy in Cursor's documented stdio format, find the project via the workspace environment variable, and migrate old `servers.maia` entries.

**Independent Test**: Run `maia init cursor` in a temporary project with and without a legacy config; verify literal `mcpServers.maia`, preservation of other entries, no absolute project path, and idempotent rerun.

### Tests for User Story 1

- [X] T011 [P] [US1] Add a literal Cursor registration contract test for path, stdio type, workspace environment, and absence of absolute paths in `tests/agents/contract/cursor.registration.contract.test.ts`
- [X] T012 [P] [US1] Add Cursor legacy migration tests for `servers.maia`, duplicate entries, malformed JSON, and unrelated entries in `tests/agents/migration/cursor.legacy.migration.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Register Cursor using `mcp-servers`, `workspace-env`, and `stdioType` in `src/agent/agents/registry/cursor.ts` and `src/agent/agents/registry/mcp.entry.ts`
- [X] T014 [US1] Migrate Cursor's old `.cursor/mcp.json` `servers` entry to `mcpServers` through `legacyProxyLocations` in `src/agent/agents/registry/cursor.ts` and `src/cli/commands/agent/configure.agents.ts`
- [X] T015 [US1] Verify Cursor contract and migration tests, typecheck, and the independent test scenario from `specs/010-agent-mcp-registration/quickstart.md`

**Checkpoint**: Cursor creates the documented config, retains other server entries, and reports migration only when one occurs.

---

## Phase 4: User Story 2 - Continue proxy registration (Priority: P1)

**Goal**: Write Continue's project-scoped YAML server file and migrate only the old Maia entry out of `.continue/config.json`.

**Independent Test**: Run `maia init continue` with old and new project configs; verify the literal YAML contract, preservation of other JSON settings and sibling YAML files, and safe idempotent rerun.

### Tests for User Story 2

- [X] T016 [P] [US2] Add a literal Continue YAML registration contract test and path-safety assertion in `tests/agents/contract/continue.registration.contract.test.ts`
- [X] T017 [P] [US2] Add Continue legacy migration tests for preserving unrelated config and sibling server files, retaining an otherwise empty config, and malformed JSON in `tests/agents/migration/continue.legacy.migration.test.ts`
- [X] T018 [P] [US2] Add YAML rendering tests for quoting and escaping every generated string in `tests/agents/inject/render.continue.mcp.block.test.ts`

### Implementation for User Story 2

- [X] T019 [US2] Add the pure Continue YAML serializer in `src/agent/agents/inject/render.continue.mcp.block.ts`
- [X] T020 [US2] Add the `continue-mcp-block` format and write `.continue/mcpServers/maia.yaml` in `src/agent/agents/inject/agent.config.format.ts` and `src/agent/agents/inject/inject.agent.config.ts`
- [X] T021 [US2] Configure the Continue target and old `.continue/config.json` migration in `src/agent/agents/registry/continue.agent.ts` and `src/cli/commands/agent/configure.agents.ts`
- [X] T022 [US2] Verify Continue registration and migration tests, typecheck, and the independent test scenario from `specs/010-agent-mcp-registration/quickstart.md`

**Checkpoint**: Continue receives only Maia's generated YAML file; existing user configuration and other MCP files remain intact.

---

## Phase 5: User Story 3 - Cline confirmed global registration and agent removal (Priority: P2)

**Goal**: Add safe, confirmed Cline global registration and complete `maia agent rm` cleanup without modifying global files unless the user explicitly confirms in an interactive terminal.

**Independent Test**: Use temporary Cline settings with multiple project entries; test confirm, refusal, no TTY, malformed files, repeat registration, orphan cleanup, and removal while preserving all unrelated settings.

### Tests for User Story 3

- [X] T023 [P] [US3] Add tests for Cline settings candidate ordering and OS-specific paths in `tests/agents/global/cline.settings.candidates.test.ts`
- [X] T024 [P] [US3] Add tests for stable project-specific entry keys and Cline proxy entry shape in `tests/agents/global/cline.entry.key.test.ts` and `tests/agents/global/cline.global.entry.test.ts`
- [X] T025 [P] [US3] Add tests for current, stale, upsert, removal, and preservation of Cline global settings in `tests/agents/global/cline.global.entry.state.test.ts`
- [X] T026 [P] [US3] Add tests for registration pending/manual guidance rendering and Codex registration notes in `tests/cli/agent.capability.block.test.ts`
- [X] T027 [P] [US3] Add Cline global registration tests for consent, no-TTY behavior, local-only projects, repeated registration, malformed JSON, and multiple project entries in `tests/cli/cline.global.registration.test.ts`
- [X] T028 [P] [US3] Add `maia agent rm` tests for valid/unknown/unconfigured agents, config cleanup, managed instructions, capability profiles, and retained native skills in `tests/cli/agent.rm.test.ts`
- [X] T029 [P] [US3] Add Cline migration tests for removing `.cline/mcp.json` Maia entry while preserving unrelated entries in `tests/agents/migration/cline.legacy.migration.test.ts`

### Implementation for User Story 3

- [X] T030 [US3] Add global registration contracts, `pending` state, and optional registration note types in `src/agent/agents/contracts/global.registration.ts`, `src/agent/agents/contracts/agent.registration.ts`, and `src/agent/agents/contracts/agent.target.ts`
- [X] T031 [US3] Implement pure Cline settings candidate resolution, project-specific keys, entry construction, and state inspection in `src/agent/agents/global/cline.settings.candidates.ts`, `src/agent/agents/global/cline.entry.key.ts`, `src/agent/agents/global/cline.global.entry.ts`, and `src/agent/agents/global/inspect.cline.global.entry.ts`
- [X] T032 [US3] Implement Cline global upsert/removal preserving unrelated fields and atomic JSON writes in `src/agent/agents/global/upsert.cline.global.entry.ts`, `src/agent/agents/global/remove.cline.global.entry.ts`, and shared atomic writer `src/shared/fs/write.file.atomic.ts`
- [X] T033 [US3] Render `pending` manual steps and registration notes without persisting absolute project paths into project instruction files in `src/cli/commands/agent/render.agent.capability.block.ts` and `src/cli/commands/agent/write.agent.instructions.ts`
- [X] T034 [US3] Resolve the read-only Cline registration status and remove `.cline/mcp.json` legacy entries in `src/cli/commands/agent/resolve.cline.registration.ts`, `src/agent/agents/registry/cline.ts`, and `src/cli/commands/agent/configure.agents.ts`
- [X] T035 [US3] Add the consent-gated Cline registration flow using injected interaction, only for interactive init/agent-add commands, in `src/cli/commands/agent/offer.cline.global.registration.ts`, `src/cli/commands/init/init.command.ts`, and `src/cli/commands/agent/agent.command.ts`
- [X] T036 [US3] Add removal of selected agents from the manifest and managed instruction blocks in `src/agent/catalog/store/agent.catalog.store.ts` and `src/cli/shared/remove.marked.block.ts`
- [X] T037 [US3] Implement `maia agent rm|remove` config/profile/global cleanup while retaining native skill copies in `src/cli/commands/agent/remove.agents.ts` and `src/cli/commands/agent/agent.command.ts`
- [X] T038 [US3] Add `maia agent rm` usage and command help in `src/cli/help/command.help.ts`
- [X] T039 [US3] Verify Cline consent, removal, migration, and registration tests; run typecheck and ensure no test accesses real Cline global settings via `scripts/run-tests.mjs`

**Checkpoint**: The Cline global config changes only after explicit interactive consent; agent removal is scoped to the selected project and preserves all other agent state.

---

## Phase 6: User Story 5 - Verifiable registration contract for every agent (Priority: P2)

**Goal**: Add literal registration contracts for all supported agents so agent-specific file paths, keys, formats, and project path safety cannot regress silently.

**Independent Test**: Run all seven contract tests and verify that changing an expected path, key, shape, or absolute-path safety rule causes its corresponding test to fail.

### Tests and shared assertion

- [X] T040 [P] [US5] Add a reusable assertion rejecting project and home absolute paths from generated files in `tests/support/assert.no.absolute.path.ts`
- [X] T041 [P] [US5] Add a literal Claude registration contract test citing its official configuration format in `tests/agents/contract/claude.registration.contract.test.ts`
- [X] T042 [P] [US5] Add a literal Copilot registration contract test citing its official configuration format in `tests/agents/contract/copilot.registration.contract.test.ts`
- [X] T043 [P] [US5] Add a literal Zed registration contract test citing its official configuration format in `tests/agents/contract/zed.registration.contract.test.ts`
- [X] T044 [P] [US5] Add a literal Codex registration contract test citing its official configuration format and trusted-project note in `tests/agents/contract/codex.registration.contract.test.ts`
- [X] T045 [P] [US5] Add a literal Cline registration contract test for pending/registered state, global entry, and project-file path safety in `tests/agents/contract/cline.registration.contract.test.ts`
- [X] T046 [US5] Verify contracts for agents already implemented and record that the seven-agent pass depends on US4 completion in `specs/010-agent-mcp-registration/quickstart.md`

**Checkpoint**: Literal contracts are written for all supported agents; their complete green run follows US4 because Zed and Codex format corrections are prerequisites.

---

## Phase 7: User Story 4 - Codex and Zed documented formats (Priority: P3)

**Goal**: Use documented Zed and Codex config structures, preserve unrelated settings, and explain Codex trusted-project requirements.

**Independent Test**: Run `maia init zed` and `maia init codex` in temporary projects; verify flat Zed command fields, TOML server tables, preservation of other settings, and trusted-project guidance.

### Tests for User Story 4

- [X] T047 [P] [US4] Add tests for flat Zed `context_servers` output and preservation of existing settings in `tests/agents/migration/zed.legacy.migration.test.ts`
- [X] T048 [P] [US4] Add tests for Codex TOML server tables, inline legacy entry replacement, and preservation of unrelated tables in `tests/agents/migration/codex.legacy.migration.test.ts`
- [X] T049 [P] [US4] Add assertions for trusted-project registration guidance in `tests/cli/agent.capability.block.test.ts`

### Implementation for User Story 4

- [X] T050 [US4] Write Zed's documented flat command structure while preserving unrelated `context_servers` in `src/agent/agents/inject/inject.zed.settings.ts`
- [X] T051 [US4] Write Codex MCP registrations as `[mcp_servers.maia]` tables and replace old inline entries without changing other TOML tables in `src/agent/agents/inject/inject.toml.mcp.servers.ts`
- [X] T052 [US4] Add the trusted-project registration note to the Codex target and CLI/instruction output in `src/agent/agents/registry/codex.ts`, `src/cli/commands/agent/configure.agents.ts`, and `src/cli/commands/agent/render.agent.capability.block.ts`
- [X] T053 [US4] Verify Zed and Codex migration/contract tests and run typecheck

**Checkpoint**: Zed and Codex use their documented config structures and Codex clearly reports the trust prerequisite.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Complete the manual validation record, update user-facing documentation, and run full feature validation.

- [X] T054 [P] Create the per-agent real-client manual validation guide with expected results and official documentation sources in `docs/agents/validation.md`
- [X] T055 [P] Update Cursor, Continue, Cline, Codex, and `maia agent rm` guidance in `README.md` and `README.pt-BR.md`
- [X] T056 [P] Update feature follow-ups and `MAIA_PROJECT_DIR` MCP-server behavior in `AGENT.md`
- [X] T057 Update technical research and manual-client validation limitations with verified implementation behavior in `specs/010-agent-mcp-registration/research.md` and `specs/010-agent-mcp-registration/quickstart.md`
- [X] T058 Run the complete test suite, coverage thresholds, typecheck, architecture/naming checks, guardrails, and feature quickstart scenarios from `package.json` and `specs/010-agent-mcp-registration/quickstart.md`
- [X] T059 Mark completed implementation tasks `[X]` and record any agent-real validation that could not be run in `specs/010-agent-mcp-registration/tasks.md` and `docs/agents/validation.md`

**Validation record**: `npm run test:coverage` passed (519 tests; 92.06% statements,
82.98% branches, 91.40% functions); typecheck, architecture, naming, and guardrails passed.
The seven literal contracts and the quickstart migration/idempotence scenario passed.
Validation inside the real agent clients remains pending; see
[`docs/agents/validation.md`](../../docs/agents/validation.md).

**Checkpoint**: Feature behavior, documentation, checks, and validation limitations agree with the spec and plan.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; test isolation must be in place before Cline tests.
- **Foundational (Phase 2)**: Depends on setup and blocks all agent registration stories.
- **US1 (Phase 3)** and **US2 (Phase 4)**: Depend on the shared foundation; their registration work can otherwise proceed independently.
- **US3 (Phase 5)**: Depends on the shared foundation and test isolation. The `agent rm` command also removes configurations introduced by US1, US2, and US4, so verify it after those config formats are present.
- **US5 (Phase 6)**: Contract suite depends on the corresponding agent registration implementations; build contracts alongside their feature stories, then verify the complete seven-agent set here.
- **US4 (Phase 7)**: Depends on shared injection and removal formats; contract and migration tests precede Zed/Codex implementation.
- **Polish (Phase 8)**: Depends on implementation stories and all focused tests.

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2.
- **US2 (P1)**: Independent after Phase 2.
- **US3 (P2)**: Depends on shared config migration, CLI interaction, and test isolation; its Cline removal behavior also depends on global-entry contracts.
- **US5 (P2)**: Cross-cutting verification of US1-US4 and the existing Claude/Copilot behavior; full completion follows all registration implementations.
- **US4 (P3)**: Independent format correction after Phase 2, but removal tests must be verified after US3's generic `agent rm` is added.

### Parallel Opportunities

- T001 and independent shared-root tests T003 can start in parallel.
- Cursor contract/migration tests T011-T012 and Continue tests T016-T018 can be authored independently after the foundation test patterns are available.
- Cline pure helper tests T023-T025 and instruction rendering tests T026 can be authored in parallel.
- The Claude, Copilot, Zed, Codex, and Cline contract tests T041-T045 target separate files and are parallelizable.
- Documentation files T054-T056 are independent; integration in T057-T059 follows their completion.

## Parallel Example: User Story 1

```text
T011 cursor.registration.contract.test.ts
T012 cursor.legacy.migration.test.ts
```

Write both focused tests before T013-T014; then run them with the focused test runner.

## Parallel Example: User Story 3

```text
T023 cline.settings.candidates.test.ts
T024 cline.entry.key.test.ts and cline.global.entry.test.ts
T025 cline.global.entry.state.test.ts
T028 agent.rm.test.ts
```

These tests use separate files; global write-path tests must use temporary settings and only proceed after T001-T002.

## Implementation Strategy

1. Finish the shared safety and migration foundation before touching agent-specific formats.
2. Deliver the P1 Cursor and Continue behavior as independently testable increments.
3. Implement Cline consent/global handling and agent removal without real user config access in tests.
4. Add and verify all seven literal agent contracts; correct Zed and Codex formats.
5. Finish documentation, run full validation, and record manual-client validation as pending where actual clients are unavailable.
