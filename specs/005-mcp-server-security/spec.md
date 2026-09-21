# Feature Specification: MCP Server & Runtime Security

**Feature Branch**: `005-mcp-server-security`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Split from .specs/001-maia-cli.spec.md — the MCP server
and runtime-security scope: discovering/adding/syncing MCPs, exposing installed
capabilities over stdio with protocol validation, environment isolation for MCP
processes, secret handling, and destructive-action guardrails."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover, add, and sync MCPs (Priority: P1)

As a developer, I want to discover available MCPs, add one to my project, and keep it
synchronized with the project's registry, so my MCP setup stays consistent with what's
declared.

**Why this priority**: This is the entry point for getting any MCP into a working state;
without it there's nothing for the server (Story 2) to expose.

**Independent Test**: Discover an MCP by query, add it, then run sync and verify the
project registry and the MCP's registered state match.

**Acceptance Scenarios**:

1. **Given** a query matching a known MCP, **When** the developer searches for MCPs,
   **Then** matching MCPs are returned.
2. **Given** a discovered MCP, **When** the developer adds it, **Then** it is registered
   in the project's MCP registry.
3. **Given** a project with registered MCPs, **When** the developer runs sync, **Then**
   the registered state and the project's registry are reconciled to match.

---

### User Story 2 - Expose installed capabilities via the MCP server (Priority: P1)

As a user of an AI agent, I want to query the capabilities Maia has installed through a
standard MCP server, so I can use them from my agent without duplicated configuration.

**Why this priority**: This is the primary runtime surface of the whole system — the
point where installed capabilities actually become usable by an agent.

**Independent Test**: Start the MCP server over stdio, send a valid capability-listing
request, and verify installed capabilities are returned; verify dynamic discovery and
agent identification behave as configured.

**Acceptance Scenarios**:

1. **Given** a running MCP server with installed capabilities, **When** a client queries
   it over stdio, **Then** the installed and authorized capabilities are returned.
2. **Given** dynamic discovery is enabled, **When** a client queries the server, **Then**
   capabilities discoverable at query time are included, not just those known at server
   start.
3. **Given** a client that identifies itself as a specific agent, **When** it queries the
   server, **Then** only capabilities authorized for that agent are returned.

---

### User Story 3 - Reject invalid or incompatible protocol messages (Priority: P1)

As a maintainer, I want the MCP server to validate JSON-RPC messages structurally and
reject incompatible protocol revisions explicitly, so malformed or mismatched clients
fail loudly instead of causing undefined behavior.

**Why this priority**: Protocol robustness is a correctness and security baseline for
any server exposed to external clients; failures here would be silent and hard to
diagnose.

**Independent Test**: Send a structurally invalid JSON-RPC message and a message
declaring an incompatible protocol revision, and verify both are explicitly rejected
rather than silently ignored or causing a crash.

**Acceptance Scenarios**:

1. **Given** a structurally invalid JSON-RPC message, **When** it is sent to the server,
   **Then** the server rejects it explicitly with an identifiable error.
2. **Given** a message declaring an incompatible protocol revision, **When** it is sent
   to the server, **Then** the server rejects it explicitly rather than attempting a
   silent reinterpretation.

---

### User Story 4 - Isolate MCP process environment (Priority: P1)

As a security-conscious maintainer, I want MCP processes to inherit only the
environment variables they actually need, so a compromised or misbehaving MCP cannot
read unrelated secrets from the parent environment.

**Why this priority**: A concrete blast-radius control; without it, every MCP process
would have ambient access to the full parent environment, undermining the whole security
posture.

**Independent Test**: Configure an MCP declaring specific required environment
variables, start it, and verify from within the process (or via a controlled test
harness) that only the runtime-necessary and explicitly declared variables are present.

**Acceptance Scenarios**:

1. **Given** an MCP that declares a specific set of required environment variables,
   **When** its process starts, **Then** it receives only those variables plus the
   variables necessary for the runtime itself to function.
2. **Given** an MCP that declares no environment variables, **When** its process starts,
   **Then** it does not receive unrelated secrets present in the parent environment.

---

### User Story 5 - Protect secrets end-to-end (Priority: P1)

As a maintainer, I want secrets to never appear in the terminal, in version control, or
in files beyond the variables an MCP explicitly references, so credential exposure risk
is minimized.

**Why this priority**: Secret handling is a non-negotiable security guarantee that spans
every other story in this spec; a single leak here undermines all of them.

**Independent Test**: Configure an MCP requiring a credential, install and run it, and
verify the credential value never appears in command output, logs, or any versioned
file — only the variable name/reference does.

**Acceptance Scenarios**:

1. **Given** an MCP requiring a credential, **When** it is configured, **Then** the
   credential value is never printed to the terminal.
2. **Given** a project with configured MCP credentials, **When** the repository is
   inspected, **Then** no secret value is present in any versioned file — only variable
   references.

---

### User Story 6 - Guard destructive actions (Priority: P1)

As a maintainer, I want destructive actions and file changes to pass through automated
guardrails rather than relying on model or user intent alone, so accidental or malicious
destructive operations are blocked by policy.

**Why this priority**: This is a system-wide safety net; without it, every other
capability (install, remove, sync) could cause irreversible damage with no independent
check.

**Independent Test**: Trigger an action classified as destructive without an
explicit override, and verify it is blocked by the guardrail rather than completing
based solely on the requester's stated intent.

**Acceptance Scenarios**:

1. **Given** an action classified as destructive, **When** it is attempted without
   satisfying the configured guardrail (e.g. deny list, pre-commit check), **Then** the
   action is blocked.
2. **Given** an action classified as destructive with the required guardrail
   satisfied, **When** it is attempted, **Then** the action proceeds and is auditable
   afterward.

### Edge Cases

- What happens when an MCP client disconnects mid-request?
- How does the server behave when two clients identify as the same agent simultaneously?
- What happens when a declared required environment variable is missing at MCP process
  start?
- How does the system handle a guardrail configuration that itself is malformed?
- What happens when dynamic discovery finds a capability that is not authorized for the
  querying agent?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide commands to discover MCPs, add an MCP to the project,
  and synchronize registered MCPs with the project's registry.
- **FR-002**: System MUST provide an MCP server exposing installed capabilities over
  stdio.
- **FR-003**: The MCP server MUST support optional dynamic discovery of capabilities at
  query time and MUST support identifying the querying agent to scope results to that
  agent's authorizations.
- **FR-004**: The MCP server MUST structurally validate incoming JSON-RPC messages and
  MUST explicitly reject messages that are malformed or declare an incompatible protocol
  revision.
- **FR-005**: MCP processes MUST inherit only the environment variables required by the
  runtime itself plus those explicitly declared by that MCP — no ambient inheritance of
  the full parent environment.
- **FR-006**: Secrets MUST NOT be displayed in terminal output, MUST NOT be committed to
  the repository, and MUST NOT be written to any file other than the variables
  explicitly referenced by installed MCPs.
- **FR-007**: Destructive actions and file changes MUST pass through automated
  guardrails (such as a deny list and pre-commit validation) and MUST NOT rely solely on
  model or user-stated intent.

### Key Entities

- **MCP Server**: The stdio-based process that exposes a project's installed and
  authorized capabilities to connecting agent clients.
- **Protocol Message**: A JSON-RPC request/response exchanged between a client and the
  MCP server, subject to structural and version validation.
- **Guardrail**: An automated policy check (deny list, pre-commit hook, or equivalent)
  that must be satisfied before a destructive action is allowed to proceed.
- **Environment Scope**: The minimal set of environment variables an MCP process is
  permitted to inherit at start.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of structurally invalid or protocol-incompatible messages sent to the
  MCP server are rejected with an identifiable error, with zero silent failures.
- **SC-002**: 100% of MCP processes started by the system receive no environment
  variable outside the runtime-required set and their own declared set.
- **SC-003**: Zero secret values appear in terminal output, logs, or versioned files
  across a full install-and-run cycle involving credentialed MCPs.
- **SC-004**: 100% of actions classified as destructive are blocked unless their
  configured guardrail is explicitly satisfied.

## Assumptions

- "Destructive actions" include, at minimum, irreversible file deletions, force
  overwrites, and any operation explicitly flagged as destructive by a command's own
  definition.
- The MCP server's transport for this iteration is stdio only; network-exposed
  transports (HTTP/SSE) are out of scope.
- Agent identification at the protocol level is based on information the connecting
  client voluntarily provides; this spec does not require cryptographic client
  authentication.
- This spec assumes MCPs were already installed and registered per
  [[003-capability-install-lifecycle]]; it covers their discovery/sync and runtime
  exposure, not their initial installation mechanics.
