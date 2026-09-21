# Contract: `maia list-skills|list-tools|list-capabilities [query] [--json]`

Contrato de comando CLI — descreve comportamento observável. Cobre apenas os
comportamentos alterados por este plano (FR-006, FR-008); a estrutura geral de
seções ("Local registry:", "Installed:", "Catalog discovery:") e o suporte a
`--json`/query já existentes permanecem.

## Invocation

```text
maia list-skills [query] [--json]
maia list-tools [query] [--json]
maia list-capabilities [query] [--json]
```

## Behavior 1 — Falha de fonte é sempre reportada junto dos resultados (FR-006)

**Given**: Uma consulta que aciona busca remota (`query` não vazio) onde ao menos
um provedor de `registries` falha (erro de rede, timeout, resposta malformada).

**Then, modo texto**:
- Uma seção adicional (ex.: `Fontes indisponíveis:`) lista cada provedor que
  falhou, com uma linha por falha identificando o provedor.
- Esta seção aparece **mesmo que** outros provedores tenham retornado
  resultados — a presença de resultados de uma fonte nunca omite o relato de
  falha de outra.

**Then, modo `--json`**:
- O payload ganha um campo `sourceFailures: Array<{ provider: string; message:
  string }>`, paralelo ao campo de resultados de descoberta já existente.
- `sourceFailures` é `[]` quando não houve falha — o campo está sempre presente,
  nunca omitido, para que consumidores de script não precisem checar sua
  existência antes de ler.

**Given**: Todos os provedores configurados falham.

**Then**: a seção de descoberta remota mostra explicitamente "nenhum resultado
encontrado" (não apenas uma lista vazia indistinguível de "não buscado"), E a
seção de falhas lista todas as fontes que falharam.

## Behavior 2 — Resultado remoto duplicando instalação local é omitido (FR-008)

**Given**: Uma consulta cujo resultado remoto tem o mesmo `(kind, name)` que uma
capacidade já instalada localmente (presente em `store.getInstalledPackages()`).

**Then**: o resultado remoto duplicado NÃO aparece na seção de descoberta remota
— apenas a entrada local (na seção "Installed:") é exibida. Isso vale tanto no
modo texto quanto no `--json`.

**Given**: Um resultado remoto cujo `(kind, name)` não corresponde a nenhuma
capacidade instalada localmente.

**Then** (inalterado): o resultado aparece normalmente na seção de descoberta
remota.

## Out of scope for this contract

- O comando `maia ls` (não tem query/json hoje; este plano não o modifica — ver
  plan.md Summary item 3).
- A lógica de resolução/instalação de um resultado descoberto — coberta por
  [[003-capability-install-lifecycle]].
