# AGENT.md

## Overview

This repository contains **Maia CLI** only.

The project is focused on:
- bootstrapping the `skills/`, `mcps/`, and `tools/` capability folders in a workspace
- installing and tracking agent capabilities through the local catalog and lock file
- exposing installed capabilities through the built-in MCP server (the `maia` proxy)
- configuring one or more compatible agents/editors (Claude, VS Code/Copilot, Cursor, Zed, Cline, Continue, OpenAI Codex) and wiring the authorized capabilities into each agent's native locations

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
- Open follow-ups are tracked in `doc/falta.md` (e.g. `maia rm` / `maia mcp sync` should re-run `restoreConfiguredAgents`; multi-file skills only copy `SKILL.md`).


# Agents
Os agents estão na pasta .agents importar ele para o padrão usado.