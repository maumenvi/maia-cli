# Contract: `searchCatalog()` — assinatura interna de domínio

Contrato de função — descreve a mudança de tipo de retorno da função de domínio
`searchCatalog` (`src/agent/catalog/providers/core/search-catalog.ts`), não um
comando CLI. Documentado como contrato porque múltiplos módulos consomem essa
assinatura diretamente e precisam ser atualizados em conjunto (ver "Chamadores
afetados" abaixo) — uma mudança de assinatura sem atualizar todos os chamadores
quebra o build.

## Assinatura atual (antes deste plano)

```ts
function searchCatalog(
  manifest: Pick<SourcesManifest, 'registries'>,
  kind: CatalogKind,
  query: string,
  limit?: number,
): Promise<CatalogSearchResult[]>
```

## Assinatura nova (após este plano — FR-006)

```ts
function searchCatalog(
  manifest: Pick<SourcesManifest, 'registries'>,
  kind: CatalogKind,
  query: string,
  limit?: number,
): Promise<CatalogSearchOutcome>

interface CatalogSearchOutcome {
  results: CatalogSearchResult[];
  failures: CatalogSearchFailure[];
}
```

Os parâmetros de entrada não mudam. Apenas o tipo de retorno muda, de um array
solto para um objeto com `results` e `failures`.

## Comportamento

**Given**: N provedores configurados em `manifest.registries` para o `kind`
pedido, dos quais M respondem com sucesso e (N − M) rejeitam (erro de rede,
timeout, resposta malformada).

**Then**:
- `results` contém os itens de todos os M provedores que responderam, cortados em
  `limit` no total (comportamento de corte inalterado).
- `failures` contém exatamente (N − M) entradas, uma por provedor rejeitado, cada
  uma com `providerId` (o id do provedor como configurado em `registries`),
  `kind` (o kind pedido), e `message` (a mensagem do erro original, sem
  transformação).
- Quando N = 0 (nenhum provedor configurado para o kind), `results = []` e
  `failures = []` — este não é um caso de falha, é ausência de configuração.
- Quando M = 0 e N > 0 (todos os provedores falharam), `results = []` e
  `failures` tem N entradas — este caso DEVE ser distinguível de "consulta não
  encontrou nada" pelo chamador (FR-006), via `failures.length > 0`.

## Chamadores afetados (devem ser atualizados junto)

Todo código abaixo trata hoje o retorno de `searchCatalog` como
`CatalogSearchResult[]` direto e precisa mudar para desestruturar
`{ results, failures }`:

- `src/cli/commands/list-skills/list-skills-command.ts`
- `src/cli/commands/list-tools/list-tools-command.ts`
- `src/cli/commands/list-capabilities/list-capabilities-command.ts`
- `src/cli/commands/install/install-command.ts` (duas chamadas: skill e mcp)
- `src/cli/commands/mcp/discover-mcps-from-store.ts`
- `src/cli/commands/skills/discover-skills-from-store.ts`

Os três comandos `list-*` são os únicos, dentre esses seis, que precisam
efetivamente **exibir** `failures` (Decision 2 em research.md) — os demais
(`install-command.ts`, `discover-mcps-from-store.ts`,
`discover-skills-from-store.ts`) só precisam ajustar a desestruturação para
continuar consumindo `results` como faziam antes; exibir `failures` nesses
fluxos não é exigido pelo spec 002 e fica fora de escopo deste plano — eles
apenas não podem quebrar a compilação.

## Out of scope for this contract

- O formato de exibição de `failures` nos comandos `list-*` (coberto por
  research.md Decision 2, não repetido aqui).
- A lógica de retry/circuit-breaker de qualquer provedor individual — inalterada.
