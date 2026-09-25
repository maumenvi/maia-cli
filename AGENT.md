# AGENT.md

## Overview

This repository contains **Maia CLI** only.

The project is focused on:
- bootstrapping the `skills/`, `mcps/`, and `tools/` capability folders in a workspace
- installing and tracking agent capabilities through the local catalog and lock file
- exposing installed capabilities through the built-in MCP server (the `maia` proxy)
- configuring one or more compatible agents/editors (Claude, VS Code/Copilot, Cursor, Zed, Cline, Continue, OpenAI Codex) and wiring the authorized capabilities into each agent's native locations
- installing third-party **toolkits** (starting with the GitHub Spec Kit) through their native installers and tracking them in the manifest and lock file

There is no HTTP framework, pipeline engine, or general-purpose SDK surface in this repository.

## Stack and runtime

- Node.js >= 26
- TypeScript with ESM (`"type": "module"`)
- CLI entrypoint: `src/cli/index.ts` (published as `maia` -> `dist/src/cli/index.js`)
- Source is run directly with `node src/cli/index.ts` in development

## Main commands

```bash
node src/cli/index.ts help
node src/cli/index.ts init [agent...]            # bootstrap folders + configure agents
node src/cli/index.ts agent add <name...>        # add/configure an agent target
node src/cli/index.ts agent ls
node src/cli/index.ts install <skill|mcp|tool> <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
node src/cli/index.ts remove <skill|mcp|tool> <name>
node src/cli/index.ts ls [skill|mcp|tool]
node src/cli/index.ts list-capabilities [query] [--json]   # alias: capabilities, discover
node src/cli/index.ts list-tools [query] [--json]
node src/cli/index.ts list-skills [query] [--json]
node src/cli/index.ts lock
node src/cli/index.ts ci
node src/cli/index.ts verify
node src/cli/index.ts toolkit i|install <name> [-g|--global] [--version <x.y.z>] [-y|--yes]
node src/cli/index.ts toolkit ls|list [--json]
node src/cli/index.ts toolkit rm|remove <name> [-y|--yes]
node src/cli/index.ts source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]
node src/cli/index.ts context build
node src/cli/index.ts context show --for dev|llm
node src/cli/index.ts mcp-server [--name <name>] [--version <ver>] [--dynamic true] [--agent <id>]
```

Development scripts (`npm run <script>`): `dev`, `maia`, `typecheck`, `check:architecture`, `test`, `test:coverage`.

## Capability discovery protocol

When an agent needs to know which skills, tools, or MCP servers are available in the
workspace, it must not guess from the runtime or from local project files alone.

The canonical discovery path is the CLI:

```bash
maia list-capabilities --json   # aliases: maia capabilities / maia discover
maia list-tools --json
maia list-skills --json
```

Use `list-capabilities` as the primary command for inventory and discovery. It returns the
installed entries, the local registry inventory, and remote catalog matches in one
machine-readable payload.

This matters because the project may register capabilities in the manifest while the active
agent runtime only exposes the subset authorized for that agent (via `allowedLlms` /
`llmAccessDefault`). The list commands are the authoritative source for the currently
available Maia inventory.

The built-in MCP server also exposes this discovery flow via tool descriptions so external
agents and editors can call it automatically without repeated prompting.

## Native agent registration

`configureAgents` does two things for every configured agent:

1. writes the `maia` MCP proxy entrypoint and an authorization profile under
   `.maia/agents/<id>/`;
2. writes the authorized capabilities directly into the agent's canonical locations so the
   agent recognizes them without extra prompting.

| Agent | MCP config | Skills | Instructions file |
| --- | --- | --- | --- |
| Claude | `.mcp.json` (fallback `.claude/claude_desktop_config.json`) | `.claude/skills/<name>/SKILL.md` | `CLAUDE.md` |
| VS Code Copilot | `.vscode/mcp.json` | — | `.github/copilot-instructions.md` |
| Cursor | `.cursor/mcp.json` | — | `.cursor/rules/maia.mdc` |
| Zed | `.zed/settings.json` | — | `AGENTS.md` |
| Cline | `.cline/mcp.json` | — | `.clinerules/maia.md` |
| Continue | `.continue/config.json` | — | `AGENTS.md` |
| OpenAI Codex | `.codex/config.toml` | — | `AGENTS.md` |

The agent's native MCP config receives the `maia` proxy only; installed MCP servers are
reached through it rather than being written in individually. A direct entry would be
spawned by the agent itself, which does not load `.maia/mcp.env` and so cannot resolve the
`${env:...}` placeholders credentials rely on, nor inherit the shell where the server's
runtime is resolvable. A managed capability block delimited by
`<!-- maia:capabilities:start -->` / `<!-- maia:capabilities:end -->` is upserted into the
instruction file; content outside the markers is never touched, and re-runs are idempotent.

The descriptors driving this are `configFormat`, `skillsDir`, and `instructionsFile` on each
`AgentTarget`.

## Toolkits

A toolkit is a third-party agent workflow with its own installer (the built-in catalog
currently holds only `speckit`, the GitHub Spec Kit). Unlike skills, MCPs, and tools, Maia
never materializes a toolkit's files:

- `src/agent/toolkits/` is the pure core: `catalog/` (one `ToolkitDefinition` per file plus
  `toolkit.catalog.ts`), `plan/` (effective scope, agent → integration mapping, argv
  building, version normalization, state classification), `lock/` (manifest → lock entry)
  and `view/`.
- `src/cli/commands/toolkit/` holds the I/O edges: the `maia toolkit` handler, the native
  process runner (argv only, never `shell: true`), confirmation, GitHub release resolution,
  install/restore/verify/remove flows and guardrail checks on toolkit paths. Side effects
  are injected through `ToolkitIo`, so tests use `tests/support/fake.toolkit.io.ts` and
  never call `uv`, `specify` or the network.
- `maia.json` declares `toolkits.<name> = { version, scope }` with an exact version;
  `maia.lock.json` pins them under `toolkits` and uses `lockfileVersion: 2` only when
  toolkits exist, so the lock stays a pure function of the manifest.
- `maia i` / `maia ci` install missing toolkits without prompting and **fail** on a version
  mismatch instead of overwriting user edits; `maia verify` checks presence and version,
  never file hashes.
- Native commands that overwrite or delete files (version switch, `maia toolkit rm`) run
  only after the guardrail allows every declared toolkit path. A global tool is never
  uninstalled by Maia.
- The MCP server exposes the read-only `maia_toolkits` tool (reserved name) and the agent
  instruction block lists installed toolkits under `### Toolkits`.

To add a toolkit, create `src/agent/toolkits/catalog/<name>.ts` with its definition (verify
its integration keys, multi-install safety and created paths against the real tool) and
register it in `toolkit.catalog.ts`. Specs live in `specs/006-toolkit-install/`.

## Project structure

```text
src/
  cli/
    commands/
    install/
    shared/
  agent/
    access/
    agents/
      contracts/
      inject/
      profiles/
      registry/
    catalog/
    llm/
    mcp/
    skills/
    tools/
    toolkits/
  config/
data/
tests/
```

## Development rules

1. Keep the repository CLI-focused.
2. Keep each named top-level function, function-valued constant, class, interface, type alias, or enum in its own scoped file under `src/`.
3. Import declarations directly from their owner files; do not add barrels, re-exports, or empty subclass compatibility shims.
4. Group imports as Node built-ins, external packages, and project-relative modules, sorting each group alphabetically.
5. Add JSDoc to functions, classes, and class/interface methods.
6. Preserve current command behavior unless the task explicitly changes UX.
7. Avoid adding dependencies unless they are clearly necessary.
8. Validate with `typecheck`, `check:architecture`, and the test/coverage scripts before concluding work.

## Notes for future changes

- If a new module does not support the CLI directly, it probably should not live in this repository.
- When adding agent compatibility, wire it through the existing agent registry and config injection flow. Set `configFormat` and, where the agent supports them, `skillsDir` / `instructionsFile` on the `AgentTarget` so `configureAgents` can register MCPs and skills in that agent's standard locations.
- When adding runtime features, keep them compatible with the built-in MCP server and local catalog layout.
- Known open follow-ups: `maia mcp sync` only syncs `.vscode/mcp.json` and does not re-run `restoreConfiguredAgents` for the other agents; native skill materialization copies only `SKILL.md`, so multi-file skills lose their extra files.


# Agents
Os agents estão na pasta .agents importar ele para o padrão usado.