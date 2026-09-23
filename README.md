# Maia

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D26.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

English | [Português](./README.pt-BR.md)

Maia is the fastest way to turn agent tooling into a repeatable, production-ready workflow.

Instead of manually wiring every client, hunting down config files, duplicating integrations, and maintaining isolated setups for Claude, Copilot, Cursor, Zed, Cline, and Continue, Maia gives you a single control layer for discovering, installing, and exposing skills, MCPs, and tools across your project.

**Maia is now a CLI-only project.** This repository is intentionally focused on the command-line workflow for bootstrapping agent-ready projects, managing capability catalogs, and exposing them through a built-in MCP server. It is not a general SDK, HTTP framework, or pipeline engine.

With just a few commands, you can:

- initialize an agent-ready project structure;
- install and organize skills, MCPs, and tools;
- expose everything through one MCP server;
- connect one or many agents to the same project;
- reduce setup friction and accelerate AI adoption for your team.

If you want one operational hub for agent capabilities, reproducible setup, faster onboarding, and practical integration with the leading AI clients on the market, Maia is built for that.

## Why use Maia?

Because working with agents in real projects should not mean manually configuring every client, duplicating integrations, and maintaining multiple sources of truth.

Maia solves that by providing:

- one workflow to install and organize skills, MCPs, and tools;
- one central MCP server to expose installed capabilities;
- automatic setup for different agents and editors;
- faster onboarding for entire teams;
- a more predictable, reproducible, and scalable foundation for AI-powered development.

In practice, Maia shortens the path between "I want this agent in my project" and "the agent is already working with the right capabilities."

## CLI-only by design

Maia has a single goal: make agent capability setup operational, reproducible, and shareable from the terminal.

That means this repository is centered on:

- project initialization with centralized `.maia/skills`, `.maia/tools`, and MCP state;
- agent/editor setup for one or many clients;
- catalog-driven installation and lock/verify workflows;
- a built-in MCP server that exposes installed capabilities.

If a feature does not support that CLI workflow directly, it does not belong in this repository.

## Use cases

Maia is useful in scenarios such as:

- teams standardizing agent usage across Claude, Copilot, Cursor, and other clients;
- projects that need to distribute the same set of skills and MCPs to multiple developers;
- environments where agents must access real project tooling without repeated manual setup;
- product teams and labs comparing multiple agents over the same operational stack;
- organizations that need a central point to govern AI capabilities, access, and integrations.

## Comparison: manual setup vs Maia

### Without Maia

- each agent must be configured separately;
- MCP files end up scattered across the environment;
- onboarding new developers takes longer;
- consistency between environments drops;
- maintaining skills, tools, and MCPs becomes operational overhead.

### With Maia

- one workflow installs and organizes capabilities;
- one MCP server exposes everything to agents;
- multiple agents can be connected to the same project at the same time;
- configuration becomes more predictable and reproducible;
- teams move faster when adopting, testing, and evolving AI workflows.

## Table of contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Getting started (CLI)](#getting-started-cli)
- [Catalogs and credentials](#catalogs-and-credentials)
  - [Skills](#skills)
  - [MCP](#mcp)
  - [MCP credentials](#mcp-credentials)
- [Security and source trust](#security-and-source-trust)
- [Command reference](#command-reference)
  - [Catalog bootstrap](#catalog-bootstrap)
  - [npm-style installation](#npm-style-installation)
  - [Lock and context](#lock-and-context)
  - [Other commands](#other-commands)
- [Documentation in `/doc`](#documentation-in-doc)

## Requirements

- Node.js >= 26

## Installation

To use `maia` directly from your shell as a plain command, install it globally:

```bash
npm install -g @maumenvi/maia-cli
```

This is the supported path for making `maia` available without `npx`, `npm exec`, or `npm run` prefixes.

If you are installing from a local checkout, use either:

```bash
npm install -g .
# or
npm link
```

A plain `npm install` inside a project does not add `node_modules/.bin` to the shell PATH by default, so `maia` will not be found as a direct command unless that directory is already on your PATH. In a local project, the binary is still available at `node_modules/.bin/maia` and can be invoked explicitly or added to PATH.

## Basic usage

```bash
maia init
maia init claude
maia init claude vscode
maia add claude vscode
maia list-tools
maia list-tools react
maia skills find react
maia mcp find filesystem
maia lock
maia verify
```

## Guardrails for destructive actions

Maia blocks destructive file operations by policy rather than by intent. The check
runs at four points: the `maia guardrail check` command, a pre-commit hook, the CI
gate, and `maia remove` before it deletes a materialized artifact.

```bash
maia guardrail check <path...>   # exit 0 allowed, 1 blocked, 2 malformed config
npm run guardrails:install       # enables the pre-commit hook
```

The policy lives in `.maia/guardrails.json`:

```json
{
  "version": 1,
  "denyPatterns": ["build/**", "**/*.secret"]
}
```

Behavior:

- **No config**: built-in defaults apply (`**/*.env`, `**/credentials/**`). Not an error.
- **Valid config**: your patterns are added to the defaults. A config never loosens the baseline.
- **Malformed config**: every destructive action is blocked (fail-closed) and the parse error is reported. A guardrail that fails open gives false confidence.

There is **no runtime override**. No flag, token, or confirmation turns a block into an
allow; the only way to permit a blocked path is to edit `denyPatterns`, and that edit is
versioned and reviewable. The decision is made from the target path alone.

The pre-commit hook can be bypassed with `git commit --no-verify`, which cannot be
disabled — that is why CI runs the same check as the gate that cannot be skipped.

## Getting started (CLI)

Quick flow:

```bash
maia init
maia init copilot
maia init claude copilot
maia add agent claude copilot
maia list-tools
maia skills find react
maia mcp find filesystem
maia lock
maia verify
```

Typical result:

- your project gets the Maia capability folders;
- each selected agent receives an identified MCP entrypoint and an authorization profile under `.maia/agents/<id>/`;
- each selected agent is also wired natively: installed MCP servers are registered individually in the agent's own MCP config next to the `maia` proxy, authorized skills are copied into the agent's native skills directory when supported (for example `.claude/skills/`), and otherwise remain available through the Maia MCP server; a managed `maia:capabilities` block is upserted into the agent's instruction file (`CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`, …);
- installed skills, MCPs, and tools become easier to version, share, and reproduce.

Update the local CLI in this repository:

```bash
maia-update-local /home/marco/Documentos/projetos/maia-cli
```

## Catalogs and credentials

### Skills

The CLI can discover skills through:

- `provider: "skills.sh"` (`https://skills.sh`)
- `provider: "github-skills"` (`https://api.github.com`)

Resilience behavior:

- uses the canonical identifier to install a skill;
- if one entry is stale or unavailable, `maia skills add <query>` automatically tries the next match;
- in `maia skills find`, you can select another result if the chosen source fails.

### MCP

MCP entries are discovered from the configured registry (`provider: "mcp"`), by default:

- `https://registry.modelcontextprotocol.io`

The built-in MCP runtime negotiates the legacy `initialize`/`initialized` revisions `2025-06-18` and `2024-11-05`, and supports the modern stateless `2026-07-28` discovery flow. Unsupported revisions are rejected explicitly instead of being silently rewritten.

For stdio and NPX servers, Maia passes only a small set of OS/runtime variables plus values explicitly declared in that MCP's `env` config. The rest of the parent process environment, including undeclared credentials, is not inherited.

### MCP credentials

In `maia mcp find`:

- shows `Requer chave/token: ...`;
- shows `Onde obter: ...` when the registry metadata includes a description or URL.

In `maia mcp add` (or installation through selection in `find`):

- detects required variables;
- prompts for values without echoing secrets in the interactive terminal;
- creates or updates `.maia/mcp.env` with only the variables referenced by installed MCP configs;
- preserves custom entries and removes obsolete auto-generated defaults from older templates;
- rebuilds those MCP variables during `maia install` and `maia ci` from `maia.lock.json`, without overwriting the real project `.env`.

Opening an MCP transport reads only `.maia/mcp.env`; it does not load or modify the project's `.env`. Maia stores its manifest and lock in `maia.json` and `maia.lock.json`, and fallback capabilities under `.maia/mcp`, `.maia/skills`, and `.maia/tools`, with per-agent authorization profiles under `.maia/agents`.

Each native agent bootstrap runs `maia mcp-server --agent <id>`. This identity lets the aggregate MCP expose only the skills, tools, and proxied MCPs authorized for that selected agent. Native bootstrap files such as `.vscode/mcp.json` or `.codex/config.toml` remain in the client-required locations; all Maia-owned state stays under `.maia/`.

In addition to the `maia` proxy, `configureAgents` writes the authorized capabilities directly into each agent's canonical locations so the agent recognizes them without extra prompting:

| Agent | MCP config | Skills | Instructions |
| --- | --- | --- | --- |
| Claude | `.mcp.json` (fallback `.claude/claude_desktop_config.json`) | `.claude/skills/<name>/SKILL.md` | `CLAUDE.md` |
| VS Code Copilot | `.vscode/mcp.json` | — | `.github/copilot-instructions.md` |
| Cursor | `.cursor/mcp.json` | — | `.cursor/rules/maia.mdc` |
| Zed | `.zed/settings.json` | — | `AGENTS.md` |
| Cline | `.cline/mcp.json` | — | `.clinerules/maia.md` |
| Continue | `.continue/config.json` | — | `AGENTS.md` |
| OpenAI Codex | `.codex/config.toml` | — | `AGENTS.md` |

Only capabilities authorized for the agent (via `allowedLlms` / `llmAccessDefault`) are delivered, and the instruction block sits between `<!-- maia:capabilities:start -->` / `<!-- maia:capabilities:end -->` markers so re-runs never duplicate or clobber your own content.

## Security and source trust

Remote sources default to untrusted. The `trusted` flag records a reviewed provenance decision; it does not sandbox or attest a package. Stdio and NPX entries execute with the current operating-system user's permissions, even though Maia limits inherited environment variables.

Review executable commands and dependencies, prefer immutable refs, pin versions, restrict credentials and LLM access, and run CI in an isolated least-privilege environment. See the complete [security and trust policy](./SECURITY.md).

## Command reference

### Catalog bootstrap

```bash
maia init [agent...]
maia add <agent...>
maia add agent <agent...>
maia source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]
maia source ls
```

Supported agents:

- `claude`
- `copilot`
- `vscode` (alias for `copilot`)
- `code` (alias for `copilot`)
- `cursor`
- `cursor-ide` (alias for `cursor`)
- `zed`
- `cline`
- `continue`
- `continue-dev` (alias for `continue`)

You can configure multiple agents at the same time:

```bash
maia init claude vscode
maia add claude copilot
maia add agent claude cursor zed
```

Selected agents are always persisted in `maia.json`; no additional save flag is required. Install and CI flows regenerate each saved agent profile and native MCP bootstrap. When no agent is selected, Maia keeps fallback capabilities under `.maia`.

### Skills

```bash
maia skills find <query>
maia skills add <skill-name|owner/repo@skill>
```

### MCP

```bash
maia mcp find <query>
maia mcp add <name>
maia mcp sync
```

### npm-style installation

```bash
maia i skill <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
maia i mcp <name> [--source <alias>] [--transport <stdio|npx|http|sse|ws>] [...]
maia i tool <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
```

### Lock and context

```bash
maia lock
maia verify
maia ci
maia context build
maia context show --for dev
maia context show --for llm
```

New manifests enable `strictVerify` by default. `maia ci` validates lock metadata and integrity before writing files, restores the locked artifacts, and then verifies their hashes.

### Other commands

```bash
maia ls [skill|mcp|tool]
maia list-tools [query]
maia rm <skill|mcp|tool> <name>
maia version
```

## Documentation in `/doc`

- [Source architecture](./doc/architecture.md)
- [Updated technical assessment](./doc/avaliação.md)
- [Open follow-up items](./doc/falta.md)
