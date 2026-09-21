# Feature Specification: Project Initialization & Agent Configuration

**Feature Branch**: `001-project-init-agents`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Split from .specs/001-maia-cli.spec.md — the initialization
and agent-configuration scope: creating the Maia manifest/lockfile structure in a project,
selecting one or more AI-agent clients, and writing each agent's native configuration
without clobbering content Maia does not own."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initialize a new project (Priority: P1)

As a developer, I want to initialize Maia in a project so that I get a reproducible
structure for capabilities and agents without manually creating config files.

**Why this priority**: Initialization is the entry point to every other Maia workflow;
nothing else in the system is reachable without it.

**Independent Test**: Run the init command in an empty project directory and verify the
manifest, lockfile, and fallback capability directories exist in the expected shape,
with no agent-specific files created when no agent was selected.

**Acceptance Scenarios**:

1. **Given** an uninitialized project directory, **When** the developer runs the init
   command, **Then** the system creates the project manifest and lockfile and reports
   that initialization succeeded.
2. **Given** an uninitialized project directory and no agent selection, **When** init
   completes, **Then** no fallback capability directory is created until a capability of
   that kind is actually installed.
3. **Given** an already-initialized project, **When** the developer re-runs init with no
   new agents, **Then** existing manifest and lockfile content is preserved and no
   duplicate entries are added.

---

### User Story 2 - Select and configure one or more agents (Priority: P1)

As a developer, I want to choose which AI-agent clients (e.g. Claude, Copilot, Cursor,
Zed, Cline, Continue, Codex) my project should support, so I can configure them without
hand-editing each client's native files.

**Why this priority**: Multi-agent support is the core value proposition — without it,
Maia offers no advantage over configuring each agent manually.

**Independent Test**: Run the init or agent-add command with an explicit agent name and
verify that only that agent's native configuration files are created, correctly
populated, and idempotent on re-run.

**Acceptance Scenarios**:

1. **Given** a project without any configured agents, **When** the developer passes one
   or more supported agent names to the init command, **Then** the system configures
   each named agent exactly once.
2. **Given** a project without any configured agents, **When** the developer runs init
   with no agent arguments, **Then** the system offers an interactive selection of
   supported agents.
3. **Given** a supported agent name with known aliases, **When** the developer uses an
   alias, **Then** the system resolves it to the correct agent.
4. **Given** an invalid or unsupported agent name, **When** the developer attempts to
   configure it, **Then** the system rejects the request with a usage message and makes
   no file changes.
5. **Given** a project with agents already configured, **When** the developer re-runs
   the agent-configuration command for the same agents, **Then** the system recreates
   any missing native files for those agents without duplicating existing entries.

---

### User Story 3 - Preserve hand-written agent instructions (Priority: P2)

As a developer, I want Maia to only touch the portion of my agent's native configuration
that it manages, so my own custom instructions and settings are never overwritten.

**Why this priority**: Losing hand-written configuration would break trust in the tool
and cause real damage to a developer's existing setup; this must hold on every write,
but it is a constraint on Story 2 rather than a separately reachable flow.

**Independent Test**: Add custom content to an agent's native instruction file outside
any Maia-managed markers, run agent configuration again, and verify the custom content
is untouched while the managed block is updated.

**Acceptance Scenarios**:

1. **Given** an agent's native instruction file with content outside Maia's managed
   markers, **When** the agent is reconfigured, **Then** the content outside the markers
   is preserved unchanged.
2. **Given** an agent whose native format uses multiple files (for example a dedicated
   MCP config file, a skills directory, and an instructions file), **When** the agent is
   configured, **Then** each native location receives only the content appropriate to
   it.

---

### User Story 4 - List configured agents (Priority: P3)

As a developer, I want to see which agents are currently configured for my project, so
I can audit or adjust my setup.

**Why this priority**: A read-only convenience that supports the other stories but
delivers no capability on its own.

**Independent Test**: Configure two agents, run the agent-list command, and verify both
appear with accurate status.

**Acceptance Scenarios**:

1. **Given** a project with two configured agents, **When** the developer lists agents,
   **Then** both configured agents are shown.

### Edge Cases

- What happens when the developer selects an agent that has no native configuration
  format recognized by the system yet?
- How does the system handle re-running init in a project directory that contains a
  manifest from an incompatible/newer schema version?
- What happens when a fallback capability directory exists but becomes empty after a
  capability is removed — is the empty directory cleaned up?
- How does the system handle configuring an agent when the project directory is not
  writable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an initialization command that creates or updates the
  project manifest and lockfile at the project root, along with the MCP environment
  template needed by the project.
- **FR-002**: System MUST create fallback capability directories (for skills, MCPs, and
  tools) only when a capability of that kind is actually materialized, never
  speculatively.
- **FR-003**: Initialization MUST accept one or more target agents as arguments and,
  when none are provided, MUST offer an interactive agent selection.
- **FR-004**: System MUST recognize a defined set of supported agent clients and their
  aliases.
- **FR-005**: System MUST provide commands to add agents to a project and to list
  currently configured agents.
- **FR-006**: Configuring an agent MUST register the Maia proxy, the authorization
  profile, and the authorized capabilities in that agent's native configuration
  locations, without overwriting content outside the block Maia manages.
- **FR-007**: Each supported agent MUST be configured using its own native file formats
  and locations (for example, separate files for MCP registration, skill discovery, and
  free-form instructions), rather than a single shared format.
- **FR-008**: When no agent is selected, capabilities MUST remain available only in the
  project's fallback directories, with no native agent configuration created.
- **FR-009**: Re-running initialization or agent configuration MUST be idempotent: it
  MUST NOT duplicate manifest entries, lockfile entries, or native configuration blocks.
- **FR-010**: Re-running initialization on a project with agents already configured, and
  no new agents specified, MUST recreate any missing native configuration files for the
  already-configured agents.
- **FR-011**: System MUST reject an unsupported or misspelled agent name with a usage
  message and MUST NOT make any file changes in that case.

### Key Entities

- **Manifest**: The project-level declaration of configured agents, installed
  capabilities, and their authorization scope; the source of truth for what a project
  intends to have installed.
- **Lockfile**: The reproducible record of exact capability versions, sources, and
  metadata derived from the manifest, used to restore or verify an installation (see
  [[004-lockfile-integrity-ci]]).
- **Agent**: A supported AI coding client (Claude, Copilot, Cursor, Zed, Cline,
  Continue, Codex, etc.) with its own native configuration format and file locations.
- **Managed Block**: The portion of an agent's native configuration file that Maia owns
  and may rewrite; content outside it is preserved verbatim.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can initialize a new project and configure at least one agent
  in a single command invocation, in under 30 seconds on a typical local machine.
- **SC-002**: Re-running initialization or agent configuration any number of times on an
  unchanged project produces zero duplicate entries and zero changes to files outside
  Maia's managed blocks.
- **SC-003**: 100% of supported agents receive configuration only in their documented
  native file locations — no cross-agent file leakage.
- **SC-004**: Developers can identify, without reading source code, which agents are
  configured for a project via a single listing command.

## Assumptions

- The set of initially supported agents is: Claude, VS Code/Copilot, Cursor, Zed, Cline,
  Continue, and OpenAI Codex; additional agents may be added later without changing this
  spec's intent.
- "Native configuration format" for each agent is whatever that agent's own tooling
  reads (e.g. `.mcp.json` and `CLAUDE.md` for Claude, `.vscode/mcp.json` and
  `.github/copilot-instructions.md` for Copilot).
- Interactive agent selection is only needed in interactive terminal sessions; CI and
  non-interactive usage always pass agents explicitly or accept the fallback-only
  behavior.
- This spec covers configuration surface only; the catalog of what capabilities exist
  and how they are discovered is covered separately in
  [[002-capability-catalog-discovery]].
