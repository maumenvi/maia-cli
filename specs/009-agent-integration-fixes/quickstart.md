# Quickstart: validar a feature 009

Contratos: [agent.registration](./contracts/agent.registration.md) ·
[cli.install](./contracts/cli.install.md) · [skill.directory](./contracts/skill.directory.md) ·
[env.global](./contracts/env.global.md). Modelo: [data-model.md](./data-model.md).

Pré-requisitos: build local (`node <repo>/src/cli/index.ts` como `maia`), um diretório
temporário por cenário, `MAIA_CONFIG_HOME` apontando para um diretório temporário (nunca para a
home real).

## 1. Gates

```bash
npm run typecheck && npm test && npm run check:architecture && npm run check:naming && npm run guardrails:check
```

## 2. Claude Code (US1)

```bash
P=$(mktemp -d) && cd "$P"
maia init claude
cat .mcp.json                               # → mcpServers.maia sem "cwd"
grep -c cwd .maia/agents/claude/capabilities.json   # → 0
grep -A2 "## Maia capabilities" CLAUDE.md   # → "registered for this agent in `.mcp.json`"

# Projeto legado
L=$(mktemp -d) && cd "$L" && mkdir .claude
echo '{"mcpServers":{"maia":{"command":"maia","args":["mcp-server","--agent","claude"],"cwd":"/x"},"other":{"command":"o"}}}' > .claude/claude_desktop_config.json
maia init claude                            # → "Moved the "maia" proxy from …"
cat .claude/claude_desktop_config.json      # → só "other"
cat .mcp.json                               # → "maia"

# JSON inválido
echo '{' > .mcp.json && maia i; echo $?     # → 1, mensagem "invalid JSON", arquivo intacto
```

Manual: abrir o Claude Code na raiz de `$P`, aprovar o servidor de projeto `maia` e conferir que
as ferramentas aparecem.

## 3. Ajuda (US2)

```bash
cd "$P"; sha1sum maia.json maia.lock.json CLAUDE.md > /tmp/before
for c in "skills add --help" "skills add -h" "skills find --help" "mcp add --help" "mcp i -h" "toolkit i --help" "i --help"; do
  maia $c >/dev/null; echo "$c → $?"     # → 0 em todos
done
sha1sum -c /tmp/before                      # → tudo OK
```

## 4. Instalação por busca (US3)

```bash
maia skills add caveman </dev/null; echo $?   # sem TTY, ambíguo → 1 + lista de owner/repo@skill
maia skills add juliusbrussee/caveman@caveman </dev/null   # exato, não confiável, sem TTY
#   → "Installed skill:caveman without agent access (untrusted source)…"
node -p "require('./maia.json').skills.caveman.allowedLlms"   # → []
ls .claude/skills | grep -c caveman          # → 0 (não autorizado)
maia skills add juliusbrussee/caveman@caveman --all-llms   # autoriza
```

Com TTY (manual): `maia skills add caveman` mostra a lista com `[untrusted]`, `0` cancela, e
escolher pede a confirmação `[y/N]`.

## 5. Skill completa (US4)

```bash
maia skills add getsentry/skills@security-review --as sentry-security-review --all-llms
#   → warning de colisão não aparece (nome novo); sem --as ele aparece
find .maia/skills/sentry-security-review .claude/skills/sentry-security-review -type f | sort
#   → SKILL.md + arquivos de referência nas duas árvores
rm .maia/skills/sentry-security-review/injection.md   # nome ilustrativo de arquivo de referência
maia verify; echo $?                         # → 1, "File missing for skill:sentry-security-review: injection.md"
maia i && maia verify                        # → restaura, exit 0
grep lockfileVersion maia.lock.json          # → 3
```

Os testes automatizados usam fixtures com `fetch` falso (GitHub tree/raw, `git` local e
well-known), sem rede.

## 6. Variáveis globais (US5)

```bash
export MAIA_CONFIG_HOME=$(mktemp -d)
A=$(mktemp -d) && cd "$A" && maia init claude
maia mcp i <mcp que pede X_TOKEN> --env-g    # informar o valor (TTY)
cat "$MAIA_CONFIG_HOME/mcp.env"              # → X_TOKEN=…
stat -c %a "$MAIA_CONFIG_HOME/mcp.env"       # → 600
grep -c X_TOKEN .maia/mcp.env                # → 0
B=$(mktemp -d) && cd "$B" && maia init claude && maia mcp add <mesmo mcp>   # não pede X_TOKEN
echo 'X_TOKEN=' >> .maia/mcp.env             # vazio no projeto não mascara
maia mcp-server --agent claude …             # o MCP sobe com o valor global
```

## 7. Regressão

- `maia ci` com um lock v1/v2 antigo (skill de arquivo único) continua passando.
- `maia --version`, os testes da 007/008 e a checagem de dist continuam verdes.
