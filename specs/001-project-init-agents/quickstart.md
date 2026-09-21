# Quickstart: Validando as Correções de Inicialização do Projeto & Configuração de Agentes

Este guia valida os quatro comportamentos que este plano adiciona/corrige (ver
[research.md](./research.md) e [contracts/init-command.md](./contracts/init-command.md)).
Assume que as correções descritas em `tasks.md` (gerado por `/speckit-tasks`) já
foram implementadas.

## Prerequisites

- Node.js ≥26 instalado (`node --version`).
- Dependências do repositório instaladas (`npm install`, embora este projeto tenha
  zero dependências de runtime — isto instala as ferramentas de desenvolvimento).
- Um diretório temporário fora do repositório para rodar o `maia` como projeto alvo
  (não rode `init` contra o próprio repositório maia-cli).

```bash
mkdir -p /tmp/maia-quickstart && cd /tmp/maia-quickstart
```

Rode todos os comandos abaixo via o build local, ex.: `node <caminho-do-repo>/src/cli/index.ts
<args>` (corresponde aos scripts `npm run dev` / `npm run maia` já existentes),
substituindo pelo caminho absoluto de `src/cli/index.ts` deste repositório.

## Scenario 1 — Init não-interativo sem agentes falha explicitamente (FR-003, FR-014)

```bash
cd /tmp/maia-quickstart
node <repo>/src/cli/index.ts init < /dev/null > out.log 2>&1
echo "exit code: $?"
cat out.log
ls -la  # esperado: sem maia.json, sem maia.lock.json, sem .maia/
```

**Expected**: exit code diferente de zero; `out.log` contém uma mensagem explícita
sobre rodar em um ambiente não-interativo sem agentes fornecidos, instruindo o uso
de argumentos de agente explícitos; nenhum arquivo foi criado.

## Scenario 2 — Init não-interativo com agentes explícitos ainda funciona (checagem de regressão)

```bash
cd /tmp/maia-quickstart
node <repo>/src/cli/index.ts init claude < /dev/null
echo "exit code: $?"
ls -la  # esperado: maia.json, maia.lock.json, .mcp.json (ou bloco gerenciado em CLAUDE.md)
```

**Expected**: exit code 0; manifesto, lockfile, e a configuração nativa do Claude
existem.

## Scenario 3 — Versão de schema de manifesto incompatível é rejeitada (FR-012)

```bash
cd /tmp/maia-quickstart
rm -rf maia.json maia.lock.json .maia
echo '{"name":"quickstart","version":"0.1.0","maiaVersion":"^99.0.0","config":{},"registries":{},"sources":{},"skills":{},"mcps":{},"tools":{},"agents":{}}' > maia.json
node <repo>/src/cli/index.ts init claude
echo "exit code: $?"
diff <(echo '{"name":"quickstart","version":"0.1.0","maiaVersion":"^99.0.0","config":{},"registries":{},"sources":{},"skills":{},"mcps":{},"tools":{},"agents":{}}') maia.json
```

**Expected**: exit code diferente de zero; stderr nomeia tanto o `^99.0.0`
declarado quanto o range suportado pela CLI em execução; `maia.json` em disco
permanece byte-a-byte inalterado (o `diff` acima não deve mostrar diferença, salvo
quebra de linha final).

## Scenario 4 — Remover a última skill limpa o diretório fallback vazio (FR-013)

```bash
cd /tmp/maia-quickstart
rm -rf maia.json maia.lock.json .maia
node <repo>/src/cli/index.ts init claude
# instala uma skill para que .maia/skills/ (ou o diretório de skills configurado) seja criado
# — substitua por um identificador de skill real disponível no catálogo local/dev
node <repo>/src/cli/index.ts install skill <skill-name>
ls .maia/skills/           # esperado: uma entrada
node <repo>/src/cli/index.ts rm skill <skill-name>
ls -la .maia/               # esperado: sem a entrada "skills" (diretório removido)
```

**Expected**: depois que a última skill é removida, `.maia/skills/` não existe
mais; outros diretórios fallback (`.maia/mcp/`, `.maia/tools/`) permanecem
intocados se ainda tiverem entradas ou nunca tiverem sido criados.

## Scenario 5 — Reexecutar o init permanece idempotente (checagem de regressão)

```bash
cd /tmp/maia-quickstart
node <repo>/src/cli/index.ts init claude
node <repo>/src/cli/index.ts init claude
echo "exit code: $?"
# esperado: sem entradas duplicadas no mapa "agents" do maia.json, sem blocos
# gerenciados duplicados em CLAUDE.md / .mcp.json
```

**Expected**: exit code 0 em ambas as vezes; a entrada `agents.claude` do
manifesto aparece exatamente uma vez; o bloco gerenciado nos arquivos nativos do
Claude aparece exatamente uma vez (sem duplicação).

## Automated equivalent

Os cenários acima são espelhados como casos `node:test` (ver `tasks.md` para os
arquivos exatos): `tests/cli/init-non-interactive-no-agents.test.ts`,
`tests/cli/init-schema-incompatible.test.ts`,
`tests/shared/remove-empty-fallback-dir.test.ts`,
`tests/shared/write-file-atomic.test.ts`. Rode a suíte completa com:

```bash
npm test
npm run typecheck
```

Ambos DEVEM estar verdes antes desta feature ser considerada completa (Princípio I
da Constituição, Test-First).
