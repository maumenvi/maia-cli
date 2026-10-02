# Changelog (Maia CLI)

All notable changes to the Maia CLI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-10-02

### Fixed
- Claude Code: the `maia` proxy is registered in `.mcp.json`. Projects set up by older versions
  had it only in `.claude/claude_desktop_config.json`, which Claude Code never reads, so no MCP
  reached the agent; the next `maia i`, `maia init claude` or `maia mcp add` moves the entry
  (other entries and the old file are kept). An invalid `.mcp.json` is never overwritten.
- No project file written for any agent contains a machine path any more (`cwd` is
  `${workspaceFolder}` for Copilot/Cursor and omitted elsewhere); `maia mcp-server` finds the
  project from `CLAUDE_PROJECT_DIR` or by walking up from its working directory.
- The capability block in `CLAUDE.md`/`AGENTS.md` only claims the proxy is registered when it
  was, and names the file.
- Skills are installed as their whole folder (`SKILL.md` plus references, scripts and assets),
  in `.maia/skills/<name>/` and in the agent's skills directory. `maia i` upgrades skills
  installed as a single `SKILL.md`.
- `--help` / `-h` on any command only prints help. `maia skills add --help` used to search
  for "--help" and install the first result.

### Security
- A query that is not an exact identifier never installs the first search hit: it asks on a
  terminal (sources marked `[trusted]`/`[untrusted]`) and fails elsewhere, listing exact
  identifiers. This also applies to `maia i <skill|mcp> <name>`.
- Capabilities from untrusted sources are not authorized for agents without consent
  (confirmation, or `--all-llms` / `--llms`); they used to get `allowedLlms: ["*"]`.
  Installing no longer overrides the trust a user declared for a source.
- `maia mcp-server` started outside a project exits with an error instead of creating
  `.maia/` in that folder.

### Added
- Global MCP credentials: `--env-g` (also `-env-g`, `--env-global`) on `maia mcp i|add|install`
  and `maia mcp find` writes to `${XDG_CONFIG_HOME:-~/.config}/maia/mcp.env` (mode `0600`).
  Precedence: process > project `.maia/mcp.env` > global; an empty project entry never hides
  the global value.
- `maia mcp i` as an alias of `maia mcp add`.
- `maia skills add … --as <name>` and a warning when a skill shares its name with a built-in
  agent command (e.g. `/security-review` in Claude Code).
- `.well-known` skills: Agent Skills discovery index (`skill-md` or `archive` tar.gz with digest).

### Changed
- `maia.lock.json` uses `lockfileVersion: 3` when it has skill folders, with one hash per file;
  `maia verify` names the missing, changed or unexpected file. Older Maia versions refuse a v3
  lockfile, so upgrade every machine and CI together.

## [1.6.2] - 2026-10-01

### Fixed
- `maia.json`/`maia.lock.json` no longer pin the `local` source to `1.5.2`, a hand-written
  version that was never published to npm (`npm view @maumenvi/maia-cli@1.5.2` returned 404).
  New manifests record the running Maia version instead.
- Existing projects that still pin `1.5.2` are fixed automatically by the next bare `maia i`,
  which rewrites the `local` source ref and regenerates `maia.lock.json`; commit both files.
  `maia ci` never rewrites files: it only prints a warning and keeps passing. Any other `ref`
  is left untouched, and `maia i <name>` does not migrate.
- The Maia MCP server now reports the real version in `serverInfo` (it reported `1.0.0`;
  `--version` still overrides it), and Maia as an MCP client sends the real version in
  `clientInfo` (it sent `1.5.2`).

### Added
- `package.json` is the single source of Maia's version; a test fails if any exposed version
  drifts from it, and `build:publish` checks the compiled `dist/` before packing.
- `postpublish` creates and pushes the `vX.Y.Z` git tag of each published release; it is
  skipped on `npm publish --dry-run` and `npm stage publish`.

## [1.6.1] - 2026-09-24

### Added
- Toolkits: `maia toolkit i|install <name> [-g] [--version <x.y.z>] [-y]`, `maia toolkit ls`
  and `maia toolkit rm`, starting with the GitHub Spec Kit (`speckit`). Toolkits are installed
  by their native installer, recorded in `maia.json`/`maia.lock.json`, restored by `maia i`
  and `maia ci`, checked by `maia verify` (presence and version), and described by the
  read-only `maia_toolkits` MCP tool and a `### Toolkits` section in agent instructions.
- Single-letter boolean flags (`-g`, `-y`) with long forms `--global` and `--yes`.

### Changed
- `maia.lock.json` uses `lockfileVersion: 2` when it pins toolkits; lockfiles without toolkits
  stay at version 1. The CLI accepts both.

### Fixed
- README and AGENT.md links to the removed `doc/` folder now point to existing documentation.

## [1.6.0] - 2026-09-23

### Added
- **MCP server and runtime security** (feature 005):
  - the stdio MCP server rejects an `initialize` that declares an unsupported protocol
    revision with `-32602` and `data.supported`, instead of silently answering with a
    different revision;
  - credential values injected into an MCP process are redacted from its stderr as
    `[REDACTED:<NAME>]` before the output reaches the terminal;
  - a declared environment variable that does not resolve fails the start **before** the
    process spawns, naming every missing variable at once;
  - closing stdin now awaits session shutdown with a deadline, so child MCP processes
    cannot outlive the parent as orphans.
- **Guardrails for destructive actions** (`maia guardrail check <path...>`): a deny list
  evaluated at four enforcement points — the command, a pre-commit hook, the CI gate, and
  `maia remove` before it deletes a materialized artifact. Configured in
  `.maia/guardrails.json`; a malformed config blocks every destructive action
  (fail-closed), and there is **no runtime override**.
- `npm run guardrails:install` wires the versioned pre-commit hook via `core.hooksPath`.
- CI gates for guardrails and for file naming.

### Changed
- **Agent configuration registers only the `maia` proxy** (FR-006), not each installed MCP.
  This reverses the unreleased behavior below. A direct entry is spawned by the agent
  itself, which never loads `.maia/mcp.env` and therefore cannot resolve the `${env:...}`
  placeholders credentials rely on, nor inherit the shell where the runtime is resolvable —
  producing spawn failures and a credential the server never receives. Registering both
  also exposed every tool twice. Authorized skills are still copied into the agent's native
  skills directory, and the `maia:capabilities` instruction block is still upserted.
- Proxied tool names are sanitized to the identifier charset agents accept:
  `io.github.upstash/context7__query-docs` becomes `context7__query-docs`. The registry id
  carries dots and slashes, which agents reject during validation — surfacing to the user
  as the agent distrusting the tool rather than as a malformed name.
- Credentials are collected only from the transport actually installed. A server publishing
  both an npm package and a hosted remote no longer creates an env variable nothing reads.
- The credential prompt shows the pasted value, so a truncated or mistyped key can be
  spotted before it is written.
- `.maia/mcp.env` and the catalog resolve from the project root upwards, so running from a
  subdirectory addresses the same project instead of finding nothing.
- Installing via `maia mcp add/find` and `maia skills add` now propagates the capability to
  every configured agent, instead of only writing the manifest and lockfile.
- An MCP that fails to start is reported on stderr and skipped, instead of disappearing
  silently and looking identical to a server exposing no tools.
- All source file names migrated to the dot convention of Constitution Principle IX
  (436 files); directories keep their existing spelling.

## [1.5.3]

### Added
- Added `maia list-tools [query]` (alias: `maia discover [query]`) as a first-pass capability discovery command.
- `maia list-tools` now shows:
  - configured registries;
  - installed entries (skills, MCPs, and tools);
  - local registry inventory.
- `maia list-tools <query>` now also discovers remote catalog matches for skills and MCPs.
- Added a built-in `read_file` tool for workspace-local file reads, materialized as part of the CLI tool registry flow.

### Changed
- Reduced the repository to the CLI-essential modules only.
- Removed the legacy HTTP, pipeline, validation, LLM, and SDK-oriented surfaces.
- Simplified package metadata and CI to validate the published CLI flow directly.
- Read-only discovery commands no longer create `source.lock` or `.env.maia` side effects.
- `verify` now checks artifact hashes and flags missing materialized files instead of silently accepting incomplete lock state.
- `strictVerify` is enabled by default for new manifests and rejects unresolved source commits.
- Remote skills now reinstall from the pinned source commit recorded in the lock instead of reusing a mutable branch reference.
- MCP runtime support is explicitly limited to the `2025-06-18` and `2024-11-05` legacy protocol revisions; incompatible modern-era responses are rejected.

### Fixed
- Fixed the empty-list access bug where `deny` was incorrectly treated as wildcard access.
- Fixed false-positive installs for non-existent tools by refusing unknown local registry entries.
- Fixed `ci` flow ordering so lock metadata and integrity are validated before materialization, followed by artifact verification after rehydration.
- Fixed workspace containment checks for `read_file` to prevent escaping the project root via absolute paths and symlinks.
- Fixed MCP protocol negotiation by supporting a version list instead of hardcoding `2024-11-05`, while preserving fallback compatibility with legacy peers.
- Isolated stdio/NPX MCP child environments to a small operational allowlist plus variables explicitly declared in the MCP config.
- Blocked materialization through symlinked workspace paths and no longer follow a symlink at the output file.
- Hid credential values while they are entered in an interactive terminal.
- Removed the published `prepare` lifecycle script; `npm pack` now builds once through `prepack` and installs do not reference omitted build sources.

### Notes
- MCP `2026-07-28` uses the modern stateless era and is not implemented in this release. Maia fails closed instead of silently rewriting a modern version to a legacy one.

## [1.5.2] - 2026-08-26

### Added
- Bilingual documentation:
  - English README as the primary project landing page.
  - Portuguese README in [README.pt-BR.md](./README.pt-BR.md).

### Changed
- README was rewritten with stronger product positioning, use cases, and onboarding guidance.
- Portuguese documentation was corrected and split into a dedicated localized README.

## [1.5.1] - 2026-08-26

### Added
- Agent bootstrap commands:
  - `maia agent add <name...>`
  - `maia add agent <name...>`
  - `maia add <name...>`
- Agent-aware project bootstrap with `maia init [agent...]`.
- Multi-agent configuration support in a single command (for example `claude`, `copilot`, `zed`, `cursor`, `cline`, and `continue` together).
- Agent aliases:
  - `vscode` / `code` -> `copilot`
  - `cursor-ide` -> `cursor`
  - `continue-dev` -> `continue`

### Changed
- `maia init` now creates the project capability folders:
  - `skills/`
  - `mcps/`
  - `tools/`
- Automatic agent configuration now prioritizes the agent/editor's own config files instead of relying on project-local VS Code compatibility files for bootstrap.

## [1.5.0] - 2026-08-26

### Added
- Built-in Maia MCP server for exposing installed capabilities to external agent clients through a single stdio MCP endpoint.
- New `maia mcp-server` command.

## [1.4.9]

### Added
- Support for `github-skills` as an additional skills discovery provider (GitHub Code Search).
- MCP credential onboarding:
  - `maia mcp find` highlights required credential variables.
  - `maia mcp find` shows where to get credentials when metadata is available.
  - MCP install flow creates/updates project `.env` with required credential keys.

### Changed
- Skills install robustness:
  - canonical skill identifiers are used for installation (display names no longer break install).
  - `maia skills add <query>` falls back to next catalog entries when a result is stale/unavailable.
  - interactive `maia skills find` allows reselection when chosen result is unavailable at source.
- Remote skill resolution now includes fuzzy repository folder matching when catalog slug differs from repository folder name.

## [1.4.8] - 2026-08-26

### Fixed
- Skills installation failures when catalog display name differed from canonical skill slug.
- Skills installation failures caused by stale catalog entries that no longer resolve in source repositories.

## [1.4.7] - 2026-08-26

### Added
- Improved MCP discovery UX with credential hints (`Requer chave/token` and `Onde obter`).
- Automatic `.env` bootstrap/update for MCP credentials during install.

## [1.4.6] - 2026-08-25

### Changed
- Initial CLI catalog workflow stabilization for skills, tools, and MCP resources.
