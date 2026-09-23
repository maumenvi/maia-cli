# Quickstart: Validando as Correções de Catálogo & Descoberta

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
mkdir -p /tmp/maia-002-quickstart && cd /tmp/maia-002-quickstart
node <repo>/src/cli/index.ts init claude
```

Rode os comandos abaixo via `node <repo>/src/cli/index.ts <args>`, substituindo
pelo caminho absoluto de `src/cli/index.ts` deste repositório.

## Scenario 1 — Falha de uma fonte é reportada mesmo com outra fonte respondendo (FR-006)

Requer um ambiente com um provedor de `registries` configurado para falhar
deliberadamente (ex.: apontando para uma URL que retorna 500 ou timeout) e outro
funcionando. Em desenvolvimento local, isso é melhor exercitado pelo teste
automatizado equivalente (ver abaixo), que mocka `globalThis.fetch` para simular
a falha de forma determinística — reproduzir isso manualmente exigiria controlar
a disponibilidade de um serviço remoto real, o que este guia evita.

```bash
node <repo>/src/cli/index.ts list-skills <query-conhecida> --json
```

**Expected** (quando ao menos uma fonte real estiver fora do ar no momento do
teste manual): o payload JSON contém `sourceFailures` não-vazio mesmo que
`results`/a seção de descoberta também tenha itens.

## Scenario 2 — Todas as fontes falham → "nenhum resultado" distinto de erro

Mesma limitação de ambiente do Scenário 1 — melhor validado pelo teste
automatizado. Verificação manual esperada:

```bash
node <repo>/src/cli/index.ts list-skills <qualquer-query>
```

**Expected** (com todos os provedores indisponíveis): saída declara claramente
"nenhum resultado encontrado" na seção de descoberta, E lista todas as fontes que
falharam — nunca apenas uma lista vazia sem explicação.

## Scenario 3 — Resultado remoto duplicado com instalação local é omitido (FR-008)

```bash
cd /tmp/maia-002-quickstart
# instala uma skill cujo nome também existe no catálogo remoto
node <repo>/src/cli/index.ts install skill <skill-name>
node <repo>/src/cli/index.ts list-skills <skill-name> --json
```

**Expected**: o payload JSON mostra `<skill-name>` na seção de instalados
(`installed`), mas NÃO o repete na seção de descoberta remota
(`discovered`/equivalente), mesmo que um provedor remoto também o retorne para a
mesma query.

## Scenario 4 — `source add` rejeita URL sintaticamente inválida (FR-005)

```bash
cd /tmp/maia-002-quickstart
node <repo>/src/cli/index.ts source add badsource "not-a-url" > out.log 2>&1
echo "exit code: $?"
cat out.log
grep -c '"badsource"' maia.json || echo "0 (esperado: fonte não foi adicionada)"
```

**Expected**: exit code diferente de zero; `out.log` contém mensagem explícita de
que a URL não parece um repositório Git válido; `maia.json` não contém a fonte
`badsource`.

## Scenario 5 — `source add` aceita URL válida (regressão)

```bash
cd /tmp/maia-002-quickstart
node <repo>/src/cli/index.ts source add goodsource https://github.com/org/repo
echo "exit code: $?"
node <repo>/src/cli/index.ts source ls
```

**Expected**: exit code 0; `source ls` mostra `goodsource` com `url`, `ref`, e
`trusted` corretos.

## Automated equivalent

Os cenários acima são espelhados como casos `node:test` (ver `tasks.md` para os
arquivos exatos): `tests/cli/list-skills.test.ts` (casos de falha de fonte e
deduplicação, com `globalThis.fetch` mockado para simular respostas e falhas
determinísticas), `tests/cli/source.test.ts` (validação de URL),
`tests/shared/is-valid-git-source-url.test.ts`,
`tests/shared/exclude-locally-installed.test.ts`. Rode a suíte completa com:

```bash
npm test
npm run typecheck
```

Ambos DEVEM estar verdes antes desta feature ser considerada completa (Princípio
I da Constituição, Test-First).
