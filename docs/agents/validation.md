# Agent registration validation

Use a clean, disposable project for each client. The automated contracts validate the
generated files; this guide records the separate check in the real agent UI. Do not use a
production project for these checks.

## Common setup

```sh
mkdir /tmp/maia-agent-check && cd /tmp/maia-agent-check
maia init <agent-id>
```

Confirm the Maia server is visible, connected, and exposes only the capabilities authorized
for that agent. Install one harmless test capability first if the client needs a tool to show
in its list. Check generated project files for machine-specific paths:

```sh
grep -rn "$PWD\|$HOME" .mcp.json .vscode .cursor .zed .codex .continue .clinerules AGENTS.md 2>/dev/null || echo ok
```

Record the client version, Maia version, date, project configuration, and result below. A
successful file contract does not imply the real client has been tested.

## Claude Code

- **Prerequisite:** Claude Code installed and able to open the disposable project.
- **Command:** `maia init claude`
- **Inspect:** `.mcp.json`, then Claude Code's MCP list.
- **Expected:** `maia` appears as a project server; approve the project server if prompted.
- **Reference:** [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp)

## VS Code Copilot

- **Prerequisite:** VS Code with Copilot Chat enabled; open the disposable folder as a workspace.
- **Command:** `maia init copilot`
- **Inspect:** `.vscode/mcp.json` and the MCP servers list in Copilot Chat.
- **Expected:** `maia` starts with the workspace as its project context and its tools are listed.
- **Reference:** [VS Code MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

## Cursor

- **Prerequisite:** Cursor installed with the disposable project opened as a workspace.
- **Command:** `maia init cursor`
- **Inspect:** `.cursor/mcp.json` and Cursor's MCP settings.
- **Expected:** `mcpServers.maia` is connected and tools are listed. The generated entry uses
  `type: "stdio"` and `MAIA_PROJECT_DIR="${workspaceFolder}"`.
- **Reference:** [Cursor MCP](https://cursor.com/docs/mcp)

## Zed

- **Prerequisite:** Zed installed with the disposable project opened at its root.
- **Command:** `maia init zed`
- **Inspect:** `.zed/settings.json` and the Agent Panel's context servers.
- **Expected:** `context_servers.maia` is connected with flat `command` and `args` fields.
  Verify that Zed loads the project-level settings file.
- **Reference:** [Zed context servers](https://zed.dev/docs/ai/mcp)

## Cline

- **Prerequisite:** Cline extension installed in VS Code or a supported editor. Open the
  disposable project and allow Maia to detect an existing Cline settings file.
- **Command:** `maia init cline`, then explicitly confirm the global registration prompt.
- **Inspect:** Cline → MCP Servers, and `cline_mcp_settings.json`.
- **Expected:** a `maia-<folder>-<hash>` entry connects and exposes project-authorized tools.
  Open a second project and confirm the project-specific entry still resolves to the first
  project's Maia manifest. Cline has no per-workspace server settings, so the entry is visible
  in all Cline windows; remove it with `maia agent rm cline` when done.
- **Reference:** [Cline MCP configuration](https://docs.cline.bot/mcp/configuring-mcp-servers);
  [Cline settings-path reference](https://github.com/cline/cline/issues/11671)

## Continue

- **Prerequisite:** Continue installed and the disposable project opened in the client.
- **Command:** `maia init continue`
- **Inspect:** `.continue/mcpServers/maia.yaml` and Continue's tools panel.
- **Expected:** the Maia server is connected; existing `.continue/config.json` settings and
  sibling server files remain intact.
- **Reference:** [Continue MCP servers](https://docs.continue.dev/customize/deep-dives/mcp)

## OpenAI Codex

- **Prerequisite:** Codex installed and the disposable project marked trusted when prompted.
- **Command:** `maia init codex`
- **Inspect:** `.codex/config.toml`, then `/mcp` in a Codex session started in the project.
- **Expected:** `[mcp_servers.maia]` appears as connected after the project is trusted.
- **Reference:** [Codex MCP](https://developers.openai.com/codex/mcp)

## `maia agent rm`

- **Command:** `maia agent rm <agent-id>`
- **Expected:** only Maia's project config entry, managed instruction block, manifest
  selection, and agent capability profile are removed. Surrounding user instructions and
  native skill copies remain. For Cline, verify that declining or running without a TTY keeps
  the global registration; accepting removes only the current project's entry.

## Validation record

Real-client validation has not been run as part of the automated implementation checks.

| Agent | Client/version | Date | Result |
| --- | --- | --- | --- |
| Claude Code | Not run | — | Pending |
| VS Code Copilot | Not run | — | Pending |
| Cursor | Not run | — | Pending |
| Zed | Not run | — | Pending |
| Cline | Not run | — | Pending |
| Continue | Not run | — | Pending |
| OpenAI Codex | Not run | — | Pending |
