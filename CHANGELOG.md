# Changelog (Maia CLI)

All notable changes to the Maia CLI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Agent configuration now registers every installed skill and MCP server **natively** in each
  configured agent, not only the aggregating `maia` proxy:
  - installed MCP servers are injected individually into the agent's native MCP config
    (`.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json`, `.codex/config.toml`, …) next to `maia`;
  - authorized skills are copied into the agent's native skills directory (`.claude/skills/<name>/SKILL.md`);
  - an idempotent `maia:capabilities` block is upserted into the agent's instruction file
    (`CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`, `.cursor/rules/maia.mdc`, `.clinerules/maia.md`).
- `AgentTarget` gained `configFormat`, `skillsDir`, and `instructionsFile` descriptors so agent
  wiring is data-driven instead of branching on the agent id.

### Changed
- The `claude` target now prefers `.mcp.json` (Claude Code project scope), falling back to the
  legacy `.claude/claude_desktop_config.json`, and is labelled `Claude`.
- Per-agent registration respects the existing `allowedLlms` / `llmAccessDefault` policy — only
  capabilities authorized for that agent are delivered.

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
