# Security and trust policy

Maia installs capability metadata and can execute MCP packages with the permissions of the operating-system user running the CLI. Treat every remote source, registry result, skill, tool, and executable package as untrusted until it has been reviewed for the intended workspace.

## Meaning of `trusted`

The `trusted` source flag is an explicit provenance decision recorded in `maia.lock.json`. It is not a sandbox, signature, malware scan, or guarantee that a package is safe. Remote sources default to `trusted: false`; Maia's bundled local registry is trusted because it is shipped with the installed CLI.

Set `--trusted true` only after reviewing the source owner, repository URL, selected ref, executable commands, install scripts, dependency graph, requested credentials, network destinations, and filesystem access. Prefer immutable commit references over moving branches or tags.

## Installing from a search

Skill instructions are followed by agents, so nothing is installed implicitly:

- `--help` / `-h` on any command only prints help; it never searches a catalog or installs.
- A query that is not an exact identifier (`owner/repo@skill`, or a name matching exactly one result) is shown as a list with each source marked `[trusted]` / `[untrusted]`, and only the entry the user picks is installed. Without an interactive terminal the command fails instead of choosing.
- A capability from an untrusted source is not authorized for any agent (`allowedLlms: []`) unless the user consents: an interactive confirmation (default *no*) or an explicit `--all-llms` / `--llms <ids>`. Re-running `add` with those flags grants access later.
- A trust decision already recorded for a source (`maia source add --trusted ...`) is kept; installing never changes it.

## Lock and integrity guarantees

`maia.lock.json` binds package metadata to its source URL, ref, trust decision, resolved commit, and materialized artifact hash when one is available. A skill is locked as its whole folder with one hash per file, so `maia verify` names the file that is missing, changed or unexpected. Skill folders are limited to 200 files and 5 MB; paths that escape the folder and symlinks are refused, and `.well-known` archives are checked against their published digest. `maia verify` detects metadata drift, missing files, and changed artifacts. `maia ci` first validates lock metadata and every existing artifact, restores only after that preflight succeeds, and then performs strict verification again.

These checks provide reproducibility and tamper evidence. They do not establish that the original source or package was benign.

## Credentials

MCP credentials live in the project's `.maia/mcp.env` (git-ignored) or, with `--env-g`, in a per-user file (`${XDG_CONFIG_HOME:-~/.config}/maia/mcp.env`) created with mode `0600` in a `0700` directory; Maia warns if an existing global file is readable by other users. Neither file is ever written by `maia i` / `maia ci` with real values, and no project file written for an agent contains a machine path.

## Executable MCP packages

Stdio and NPX MCP entries execute local commands. Maia limits inherited environment variables and passes declared MCP credentials explicitly, but the child process still has the filesystem and network permissions of the current user unless the operating system or CI runner adds stronger isolation.

For executable packages:

- pin package versions and source commits;
- inspect commands, arguments, lifecycle scripts, and transitive dependencies;
- run CI installations in an isolated, least-privilege environment;
- provide narrowly scoped credentials only through declared placeholders;
- restrict `allowedLlms` and disable unused capabilities;
- review lockfile changes before merging them.

Registry descriptions and credential hints are discovery metadata, not security attestations. A registry entry must receive the same review as a direct remote source.

## Toolkits

`maia toolkit i` runs a toolkit's native installer (for Spec Kit: `uv`/`uvx`/`specify`), which is
third-party code executed with the current user's permissions. Maia mitigates this by:

- running commands from argv only, never through a shell, and validating `--version` as `x.y.z`;
- printing the exact commands and source before running them and asking for confirmation
  (`-y` is an explicit opt-out);
- making `maia ci` use only the version and source pinned in `maia.lock.json`;
- evaluating the guardrails on every toolkit path before a native command that may overwrite
  (version switch) or delete (`maia toolkit rm`) files; blocked paths are never touched;
- never uninstalling a globally installed toolkit tool.

## Reporting

Do not include secrets, tokens, or private source contents in a public report. Use the repository's private security-reporting channel when available; otherwise contact the maintainers before disclosing exploitable details.

## Runtime guarantees

These are enforced by the CLI and covered by tests. They constrain blast radius; they
do not make an untrusted package safe to run.

### Environment isolation

An MCP process inherits only the variables its own runtime needs plus those the package
explicitly declares. There is no ambient inheritance of the parent environment, so a
compromised or misbehaving MCP cannot read unrelated secrets from the shell that
launched Maia. A declared variable that does not resolve fails the start before the
process spawns, naming every missing variable at once and never printing a value.

### Secret redaction

Credential values are never echoed during entry, never written outside the variables an
installed MCP references, and never committed. A child MCP's stderr is relayed to the
user with injected values replaced by `[REDACTED:<NAME>]`, because servers in debug mode
commonly print their effective configuration.

Known limit: redaction matches the literal value Maia injected. A server that transforms
a credential before printing it — base64, truncation, hashing — is not caught. Literal
matching is not a cryptographic barrier; environment isolation above remains the primary
control.

### Destructive-action guardrails

Destructive file operations are blocked by a deny list rather than by declared intent,
at four enforcement points: the `maia guardrail check` command, a pre-commit hook, the
CI gate, and `maia remove` before it deletes a materialized artifact.

A malformed guardrail config blocks every destructive action rather than falling back to
permissive behavior. There is no runtime override: a blocked path is permitted only by
editing the deny list, which is a versioned, reviewable change. The pre-commit hook is
bypassable with `--no-verify`, so CI repeats the check as the gate that cannot be skipped.
