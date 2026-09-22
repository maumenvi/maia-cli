# Quickstart: Validando as Correções de Lockfile, Integridade & CI

Este guia valida os comportamentos que este plano adiciona/corrige (ver
[research.md](./research.md) e os contratos em [contracts/](./contracts/)). Assume
que as correções descritas em `tasks.md` (gerado por `/speckit-tasks`) já foram
implementadas.

## Prerequisites

- Node.js ≥26 instalado (`node --version`).
- Dependências do repositório instaladas (`npm install`).
- Um diretório temporário fora do repositório para rodar o `maia` como projeto
  alvo.

```bash
mkdir -p /tmp/maia-004-quickstart && cd /tmp/maia-004-quickstart
node <repo>/src/cli/index.ts init claude
node <repo>/src/cli/index.ts install tool read_file
```

Rode os comandos abaixo via `node <repo>/src/cli/index.ts <args>`, substituindo
pelo caminho absoluto de `src/cli/index.ts` deste repositório.

## Scenario 1 — Lock é determinístico e não reescreve sem mudança (FR-001, SC-003)

```bash
cd /tmp/maia-004-quickstart
node <repo>/src/cli/index.ts lock
cp maia.lock.json /tmp/lock-primeiro.json
MTIME_ANTES=$(stat -c %Y maia.lock.json)

node <repo>/src/cli/index.ts lock
MTIME_DEPOIS=$(stat -c %Y maia.lock.json)

diff /tmp/lock-primeiro.json maia.lock.json && echo "OK: conteúdo idêntico"
[ "$MTIME_ANTES" = "$MTIME_DEPOIS" ] && echo "OK: arquivo não reescrito"
grep -c generatedAt maia.lock.json || echo "OK: sem campo generatedAt"
```

**Expected**: o `diff` não acusa diferença; o timestamp de modificação é o mesmo
nas duas execuções; `generatedAt` não aparece no arquivo.

## Scenario 2 — CI falha quando o lockfile está desatualizado (FR-008)

```bash
cd /tmp/maia-004-quickstart
# edita o manifesto sem rodar lock — simula o erro típico de um PR
node -e "const f='maia.json';const m=JSON.parse(require('fs').readFileSync(f));m.version='9.9.9';require('fs').writeFileSync(f,JSON.stringify(m,null,2)+'\n')"

cp maia.lock.json /tmp/lock-antes-ci.json
node <repo>/src/cli/index.ts ci
echo "exit code: $?"
diff /tmp/lock-antes-ci.json maia.lock.json && echo "OK: lockfile não foi regenerado"
```

**Expected**: exit code diferente de zero; mensagem informando que o lockfile está
desatualizado e orientando a rodar `maia lock`; o `maia.lock.json` permanece
byte-a-byte inalterado (CI nunca regenera silenciosamente).

## Scenario 3 — CI funciona normalmente com lockfile atualizado (regressão)

```bash
cd /tmp/maia-004-quickstart
node <repo>/src/cli/index.ts lock   # ressincroniza após a edição do Scenario 2
node <repo>/src/cli/index.ts ci
echo "exit code: $?"
```

**Expected**: exit code 0; ambiente restaurado e agentes sincronizados, sem
nenhum prompt.

## Scenario 4 — Verify reporta todos os problemas de uma vez (FR-002)

```bash
cd /tmp/maia-004-quickstart
# corrompe dois artefatos ao mesmo tempo
find .maia/tools -type f -exec sh -c 'echo "corrompido" >> "$1"' _ {} \;
node <repo>/src/cli/index.ts verify
echo "exit code: $?"
```

**Expected**: exit code diferente de zero; a saída lista **todos** os pacotes com
problema, não apenas o primeiro.

## Scenario 5 — Verify recusa pacote sem hash registrado (FR-002, SC-002)

Melhor validado pelo teste automatizado, porque exige construir um lockfile em um
estado específico (pacote materializado cujo registro não tem `artifactHash`) que
o fluxo normal de instalação não produz facilmente à mão.

```bash
npm test -- tests/cli/verify.test.ts
```

**Expected**: o teste confirma que um pacote materializado sem hash registrado faz
o verify falhar, em vez de passar por o arquivo ser não-vazio.

## Scenario 6 — `context show` sem contexto construído (FR-006)

```bash
cd /tmp/maia-004-quickstart
rm -f .maia/context.dev.json .maia/context.llm.json
node <repo>/src/cli/index.ts context show
echo "exit code: $?"
ls .maia/context.dev.json 2>&1 || echo "OK: contexto não foi construído automaticamente"
```

**Expected**: exit code diferente de zero, com orientação explícita para rodar
`maia context build` primeiro; nenhum artefato de contexto é gerado pelo comando
de exibição.

## Scenario 7 — Rollback de restauração em CI interrompida (FR-009)

Melhor validado pelo teste automatizado — reproduzir uma interrupção real no meio
da materialização de forma determinística não é prático em um guia manual.

```bash
npm test -- tests/cli/ci.test.ts
```

**Expected**: o teste confirma que uma falha simulada durante a materialização
remove os artefatos que aquela execução criou, sem tocar nos preexistentes.

## Automated equivalent

Os cenários acima são espelhados como casos `node:test` (ver `tasks.md` para os
arquivos exatos): `tests/cli/lock.test.ts` (Scenario 1),
`tests/cli/ci.test.ts` (Scenarios 2, 3, 7), `tests/cli/verify.test.ts`
(Scenarios 4, 5), `tests/cli/context.test.ts` (Scenario 6), mais os unitários
`tests/shared/is-lock-stale.test.ts` e
`tests/shared/is-lockfile-version-compatible.test.ts`. Rode a suíte completa com:

```bash
npm test
npm run typecheck
```

Ambos DEVEM estar verdes antes desta feature ser considerada completa (Princípio I
da Constituição, Test-First).
