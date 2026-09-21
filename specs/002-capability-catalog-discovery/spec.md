# Feature Specification: Capability Catalog & Discovery

**Feature Branch**: `002-capability-catalog-discovery`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Split from .specs/001-maia-cli.spec.md — the catalog,
discovery, and source-management scope: maintaining a local inventory of skills, MCPs,
and tools, querying it, querying configured remote/Git sources, and handling
unavailable or empty results gracefully."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - List installed capabilities (Priority: P1)

As a developer, I want to list the skills, MCPs, and tools currently known to my
project, so I can see what is available without reading configuration files by hand.

**Why this priority**: Listing is the most frequently used, lowest-risk entry point into
the catalog and underlies every other discovery flow.

**Independent Test**: With at least one capability installed, run the listing command
and verify it appears with correct type and identifying metadata; run it in an empty
project and verify an empty, non-error result.

**Acceptance Scenarios**:

1. **Given** a project with installed capabilities, **When** the developer runs the
   listing command, **Then** all installed skills, MCPs, and tools are shown grouped by
   type.
2. **Given** a project with installed capabilities, **When** the developer requests JSON
   output, **Then** the system emits a valid JSON payload containing the same inventory.
3. **Given** a project with no installed capabilities, **When** the developer lists them,
   **Then** the system reports an empty inventory rather than an error.

---

### User Story 2 - Search the catalog by query (Priority: P1)

As a developer, I want to search for skills, MCPs, or tools by keyword, so I can find
relevant capabilities without knowing exact identifiers in advance.

**Why this priority**: Query-based discovery is the primary way developers find new
capabilities to install; it is the main value driver of having a catalog at all.

**Independent Test**: Run a listing/search command with a query term known to match an
existing local or remote capability, and verify matching results are returned with
canonical identifiers usable for installation.

**Acceptance Scenarios**:

1. **Given** a query that matches one or more known capabilities, **When** the developer
   searches, **Then** matching results are returned with a canonical identifier for each.
2. **Given** a query that matches nothing, **When** the developer searches, **Then** the
   system clearly states that no results were found rather than returning an empty list
   indistinguishable from an error or from "not searched."
3. **Given** a query, **When** the developer requests JSON output, **Then** the results
   are emitted as valid JSON.

---

### User Story 3 - Manage Git sources (Priority: P2)

As a maintainer, I want to add and list the Git sources my project trusts for remote
capabilities, so discovery and installation can pull from a known, auditable set of
origins.

**Why this priority**: Needed to extend discovery beyond the local catalog, but a
project can operate on local-only capabilities without it, so it ranks below core
listing/search.

**Independent Test**: Add a Git source, list sources, and verify the new source appears
with its reference and trust state.

**Acceptance Scenarios**:

1. **Given** a valid Git source reference, **When** the maintainer adds it, **Then** the
   source appears in the source list with its reference and trust state.
2. **Given** one or more configured sources, **When** the maintainer lists sources,
   **Then** each is shown with enough information to identify its origin and trust
   state.

---

### User Story 4 - Graceful handling of unavailable remote sources (Priority: P2)

As a developer, I want discovery to degrade gracefully when a remote source is
unreachable, so a single flaky source doesn't block me from finding capabilities
elsewhere.

**Why this priority**: Reliability concern that affects trust in the tool under normal
network conditions, but only matters once remote sources exist (Story 3).

**Independent Test**: Configure a source that is intentionally unreachable alongside a
reachable one, run discovery, and verify results come from the reachable source with a
clear indication of the failure — not a silent hang or crash.

**Acceptance Scenarios**:

1. **Given** one unreachable source and one reachable source, **When** the developer
   runs discovery, **Then** results from the reachable source are returned and the
   unavailable source's failure is reported.
2. **Given** all configured sources are unreachable, **When** the developer runs
   discovery, **Then** the system clearly reports that no results were found and does
   not fabricate results.

### Edge Cases

- What happens when a query returns matches from both the local catalog and a remote
  source with the same identifier?
- How does the system handle a Git source reference that is syntactically invalid?
- What happens when a remote source's response is malformed or exceeds an expected size?
- How does the system handle a source that was previously trusted but has since become
  untrusted or revoked?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a local inventory of installed skills, MCPs, and
  tools.
- **FR-002**: System MUST provide commands to list the local inventory, filterable by
  capability type (skills, MCPs, tools, or all).
- **FR-003**: Listing commands MUST accept a free-text query and MUST support a
  machine-readable (JSON) output mode.
- **FR-004**: System MUST query configured remote sources to discover capabilities not
  present in the local inventory, and MUST use canonical identifiers when presenting
  results for installation.
- **FR-005**: System MUST provide commands to add a Git source and to list configured
  Git sources, including each source's reference and trust state.
- **FR-006**: When a remote result is unavailable, discovery MUST attempt any other
  available alternative source and MUST clearly report when no result was found, rather
  than silently returning nothing indistinguishable from "not searched."
- **FR-007**: Discovery and listing MUST NOT report a successful match when no
  capability actually satisfies the query.

### Key Entities

- **Catalog**: The local inventory of known skills, MCPs, and tools available to a
  project, independent of whether each entry is currently installed.
- **Source**: A configured Git origin (or other provider) that discovery queries for
  remote capabilities, carrying a reference and a trust state.
- **Capability Identifier**: The canonical, source-qualified name used to unambiguously
  reference a skill, MCP, or tool during discovery and installation (see
  [[003-capability-install-lifecycle]]).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can find a known capability by keyword search in under 5
  seconds on a warm local catalog.
- **SC-002**: 100% of "no results found" cases are reported distinctly from error
  conditions and from successful-but-empty results.
- **SC-003**: A single unreachable remote source never prevents discovery from returning
  results available from other configured sources.
- **SC-004**: Every result returned by search or listing carries a canonical identifier
  that can be used directly for installation without further lookup.

## Assumptions

- "Remote sources" in this iteration means Git-based sources; other provider types may
  be added later without changing this spec's intent.
- Trust state for a source is a simple attribute (e.g. trusted/untrusted) rather than a
  full permissions model; fine-grained authorization is covered by agent/LLM
  restrictions in [[003-capability-install-lifecycle]] and [[005-mcp-server-security]].
- Local catalog queries do not require network access; only remote discovery does.
