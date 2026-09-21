# Feature Specification: Capability Install Lifecycle

**Feature Branch**: `003-capability-install-lifecycle`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Split from .specs/001-maia-cli.spec.md — the install and
removal scope: installing skills, MCPs, and tools with version/source/LLM-scope options,
materializing them into fallback and native agent locations, removing capabilities, and
restoring the full set from the lockfile."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install a capability (Priority: P1)

As a developer, I want to install a skill, MCP, or tool by name, so my project and
configured agents gain that capability without manual file placement.

**Why this priority**: Installation is the central action of the whole system — every
other flow exists to support or protect it.

**Independent Test**: Install a known skill by name and verify it is materialized in the
fallback skills directory and, if an agent is configured, in that agent's native
location, with the manifest and lockfile updated accordingly.

**Acceptance Scenarios**:

1. **Given** a valid, discoverable capability identifier, **When** the developer installs
   it, **Then** the manifest, lockfile, materialized artifacts, and configured agents are
   all updated consistently.
2. **Given** an install command with an explicit version, **When** the install runs,
   **Then** the specified version is installed rather than the latest available.
3. **Given** an install command with an explicit source, **When** the install runs,
   **Then** the capability is fetched from that source rather than the default.
4. **Given** an installed skill, **When** installation completes, **Then** the skill is
   materialized in the fallback skills directory and, for each configured agent that
   supports skills, in that agent's native skills location.

---

### User Story 2 - Scope a capability to specific LLMs (Priority: P1)

As an administrator, I want to restrict which LLMs/agents are authorized to use an
installed capability, so untrusted or irrelevant runtimes cannot access it.

**Why this priority**: Authorization scope is a security-relevant control that must be
available at install time, not bolted on afterward.

**Independent Test**: Install a capability scoped to a specific agent and verify the
manifest records that scope; verify a differently-scoped agent's configuration does not
receive the capability.

**Acceptance Scenarios**:

1. **Given** an install command with no LLM scope specified, **When** installation
   completes, **Then** the capability is authorized for all configured agents by
   default.
2. **Given** an install command with an explicit list of LLMs, **When** installation
   completes, **Then** only the named LLMs are authorized to use the capability.

---

### User Story 3 - Install MCPs with credentials and transports (Priority: P2)

As a developer, I want an MCP's declared transport and required credential variables to
be respected during installation, so the MCP works correctly in my configured agents
without me hand-writing connection details.

**Why this priority**: MCP-specific mechanics are a real subset of installs but narrower
in scope than the general install flow (Story 1).

**Independent Test**: Install an MCP that declares a required credential variable and a
specific transport, and verify the native agent configuration reflects that transport
and that the credential variable is registered without its value being exposed.

**Acceptance Scenarios**:

1. **Given** an MCP catalog entry declaring a transport and configuration, **When** it is
   installed, **Then** the installed configuration matches what the catalog declares.
2. **Given** an MCP catalog entry declaring a required credential variable, **When** it
   is installed, **Then** the variable is registered as required without its value being
   persisted or displayed by the install command itself.
3. **Given** an installed MCP, **When** installation completes, **Then** each configured
   agent's native configuration is synchronized to include the MCP.

---

### User Story 4 - Restrict tools to the local registry (Priority: P2)

As a security-conscious maintainer, I want tools to be installable only from the local
registry, never from a remote source, so tool execution can't be redirected to
unvetted code.

**Why this priority**: A narrower security constraint on top of general install
behavior; important, but only relevant once install (Story 1) exists.

**Independent Test**: Attempt to install a tool with an explicit remote source and
verify the operation is rejected with a clear message.

**Acceptance Scenarios**:

1. **Given** a tool install request specifying a remote source, **When** the developer
   runs it, **Then** the system rejects the operation and states that tools accept only
   the local registry.
2. **Given** a tool install request with no source specified, **When** it targets an
   entry in the local registry, **Then** the install proceeds normally.

---

### User Story 5 - Remove a capability (Priority: P2)

As a developer, I want to remove an installed skill, MCP, or tool, so I can keep my
project's capability set accurate as needs change.

**Why this priority**: The natural counterpart to install; necessary for a complete
lifecycle but only exercised after something has been installed.

**Independent Test**: Remove a previously installed capability and verify it disappears
from the manifest, lockfile-derived state, and materialized locations.

**Acceptance Scenarios**:

1. **Given** an installed capability, **When** the developer removes it, **Then** the
   manifest and derived installation state no longer reference it.
2. **Given** a capability materialized in both a fallback directory and native agent
   locations, **When** it is removed, **Then** it is removed from all of those locations.

---

### User Story 6 - Restore capabilities from the lockfile (Priority: P1)

As an operator, I want running install with no specific capability named to restore
everything recorded in the lockfile, so I can reproduce an environment without manually
reinstalling each item.

**Why this priority**: This is the reproducibility guarantee that makes the lockfile
useful in practice (e.g. after a fresh checkout); it is as fundamental as Story 1.

**Independent Test**: Delete all materialized capability artifacts but keep the
lockfile, run install with no arguments, and verify every capability from the lockfile
is restored and every configured agent is resynchronized.

**Acceptance Scenarios**:

1. **Given** a valid lockfile and no materialized artifacts, **When** the developer runs
   install with no capability specified, **Then** every capability recorded in the
   lockfile is restored.
2. **Given** a successful restore, **When** it completes, **Then** all configured agents
   are synchronized to reflect the restored capabilities.

### Edge Cases

- What happens when an install is requested for a capability identifier that doesn't
  exist in any configured source?
- How does the system handle installing a capability whose declared version conflicts
  with an already-installed version required by something else?
- What happens when removal is requested for a capability that isn't installed?
- How does the system handle a partially completed install (e.g. process interrupted
  mid-materialization)?
- What happens when an MCP's declared transport is not supported by a given agent?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an install command accepting a capability identifier,
  with optional version, source, and LLM-scope options.
- **FR-002**: System MUST allow scoping an installed capability's authorization to all
  configured agents (default) or to an explicit list of named agents/LLMs.
- **FR-003**: Installed skills MUST be materialized in the fallback skills directory
  and, where applicable, in the native directories of configured agents that support
  skills.
- **FR-004**: Installed MCPs MUST honor the transport and configuration declared by the
  catalog entry, MUST register any required credential variables without persisting or
  displaying their values during install, and MUST synchronize the native configuration
  of each configured agent.
- **FR-005**: Tools MUST be installable only from the local registry; an install request
  specifying a remote source for a tool MUST be rejected with a clear explanatory
  message.
- **FR-006**: System MUST provide a remove command that deletes a capability's manifest
  entry and derived installation state, and MUST update all locations where that
  capability was materialized.
- **FR-007**: Running the install command with no capability specified MUST restore all
  capabilities recorded in the lockfile and MUST synchronize all configured agents
  afterward.
- **FR-008**: Install and remove operations MUST leave the manifest, lockfile-derived
  state, materialized artifacts, and agent configurations mutually consistent — no
  operation may update only a subset of these.

### Key Entities

- **Installed Capability**: A skill, MCP, or tool that has been materialized into the
  project, with a recorded version, source, and LLM authorization scope.
- **LLM Scope**: The set of agents/LLMs authorized to use a given installed capability;
  defaults to all configured agents.
- **Credential Variable**: A named environment variable required by an installed MCP,
  registered as required without its value being stored in the manifest or displayed
  during install (see [[005-mcp-server-security]] for runtime handling).
- **Local Registry**: The trusted, non-remote source that tools must be installed from
  (contrast with the Git sources in [[002-capability-catalog-discovery]], which apply to
  skills and MCPs).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Installing a capability updates manifest, lockfile, materialized files,
  and agent configuration in a single command invocation, with zero manual follow-up
  steps required.
- **SC-002**: 100% of tool-install attempts specifying a remote source are rejected
  before any file is written.
- **SC-003**: A full lockfile-based restore of a typical project completes without any
  capability being silently skipped or left un-synchronized with configured agents.
- **SC-004**: Removing a capability leaves zero residual materialized files in any
  previously-populated location.

## Assumptions

- "Local registry" for tools refers to the project- or Maia-maintained local tool
  listing, not a remote package index.
- Credential values themselves (as opposed to variable names) are supplied by the
  developer through a mechanism outside this spec's install command (e.g. environment or
  a secrets prompt) and are never written to the manifest.
- This spec assumes the catalog/discovery flow in [[002-capability-catalog-discovery]]
  has already resolved a valid canonical identifier before install is invoked.
