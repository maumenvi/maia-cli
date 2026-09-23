# Quickstart: Validando as Correções do Ciclo de Vida de Instalação

Este guia valida os comportamentos que este plano adiciona/corrige (ver
[research.md](./research.md) e os contratos em [contracts/](./contracts/)).
Assume que as correções descritas em `tasks.md` (gerado por `/speckit-tasks`)
já foram implementadas.

## Prerequisites

- Node.js ≥26 instalado (`node --version`).
- Dependências do repositório instaladas (`npm install`).
- Um diretório temporário fora do repositório para rodar o `maia` como
  projeto alvo.

```bash
mkdir -p /tmp/maia-003-quickstart && cd /tmp/maia-003-quickstart
node <repo>/src/cli/index.ts init claude
```

Rode os comandos abaixo via `node <repo>/src/cli/index.ts <args>`,
substituindo pelo caminho absoluto de `src/cli/index.ts` deste repositório.

## Scenario 1 — Remoção de tool apaga o artefato materializado (FR-006)

```bash
cd /tmp/maia-003-quickstart
node <repo>/src/cli/index.ts install tool read_file
ls .maia/tools/          # esperado: read_file.mjs presente
node <repo>/src/cli/index.ts rm tool read_file
ls -la .maia/             # esperado: sem a entrada "tools" (diretório removido)
```

**Expected**: após a remoção, `.maia/tools/read_file.mjs` não existe mais;
se era a única tool instalada, `.maia/tools/` também foi removido.

## Scenario 2 — Remoção de MCP sincroniza todos os agentes (FR-006)

Requer dois agentes configurados (ex.: `claude` e `copilot`) para observar a
diferença — melhor validado pelo teste automatizado, que pode inspecionar
diretamente os arquivos de configuração nativa de ambos sem depender de
qual agente está "ativo" no ambiente de teste.

```bash
cd /tmp/maia-003-quickstart
node <repo>/src/cli/index.ts init claude copilot
node <repo>/src/cli/index.ts install mcp filesystem --command npx --package @modelcontextprotocol/server-filesystem
grep filesystem .mcp.json .vscode/mcp.json
node <repo>/src/cli/index.ts rm mcp filesystem
grep filesystem .mcp.json .vscode/mcp.json || echo "removido de ambos (esperado)"
```

**Expected**: após a remoção, `filesystem` não aparece em nenhum dos dois
arquivos de configuração nativa.

## Scenario 3 — Remoção de skill apaga cópia nativa órfã (FR-006, SC-004)

```bash
cd /tmp/maia-003-quickstart
node <repo>/src/cli/index.ts install skill <skill-name>
ls .claude/skills/<skill-name>/SKILL.md   # esperado: existe
node <repo>/src/cli/index.ts rm skill <skill-name>
ls .claude/skills/<skill-name>/ 2>&1 || echo "removido (esperado)"
```

**Expected**: após a remoção, o diretório nativo `.claude/skills/<skill-name>/`
não existe mais.

## Scenario 4 — Rollback em falha simulada durante instalação (FR-008)

Requer injeção de falha determinística (ex.: mockar `store.buildLock` para
lançar após a materialização) — melhor validado pelo teste automatizado, já
que reproduzir uma interrupção real de processo de forma confiável em um
guia manual não é prático.

```bash
# Ver tests/cli/install.test.ts para o caso "rolls back a partial skill
# install when buildLock fails" — verifica que nem o manifesto nem o
# artefato materializado permanecem após a falha simulada.
npm test -- tests/cli/install.test.ts
```

**Expected**: o teste automatizado confirma que, após uma falha simulada no
último passo, nenhum artefato órfão nem entrada de manifesto sem lockfile
correspondente permanece.

## Scenario 5 — MCP com transporte incompatível pula só o agente afetado (FR-004)

Requer um `AgentTarget` de teste configurado para declarar uma restrição de
transporte (o design de Decision 2 em research.md é permissivo por padrão
hoje, já que nenhum agente real tem essa restrição) — melhor validado pelo
teste unitário de `agentSupportsTransport` e por um teste de integração que
injeta um target de teste com a restrição.

```bash
npm test -- tests/shared/agent-supports-transport.test.ts
```

**Expected**: o predicado retorna `false` apenas quando o target de teste
declara explicitamente não suportar o transporte; para todo `AgentTarget`
real hoje existente no projeto, retorna `true` para todos os 5 transportes.

## Automated equivalent

Os cenários acima são espelhados como casos `node:test` (ver `tasks.md` para
os arquivos exatos): `tests/cli/remove.test.ts` (Scenarios 1–3),
`tests/cli/install.test.ts` (Scenario 4, casos novos),
`tests/shared/install-rollback.test.ts`,
`tests/shared/agent-supports-transport.test.ts` (Scenario 5). Rode a suíte
completa com:

```bash
npm test
npm run typecheck
```

Ambos DEVEM estar verdes antes desta feature ser considerada completa
(Princípio I da Constituição, Test-First).
