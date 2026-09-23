# Contract: `verifySourceLock()` — assinatura interna de domínio

Contrato de função — descreve a mudança de tipo de retorno de `verifySourceLock`
(`src/agent/catalog/lock/verify/verify-source-lock.ts`) e do wrapper
`AgentCatalogStore.verifyLock`. Documentado como contrato porque a mudança de
"lançar no primeiro problema" para "retornar todos os problemas" afeta todos os
chamadores em conjunto.

## Assinatura atual (antes deste plano)

```ts
function verifySourceLock(
  lock: SourceLock,
  workspaceRoot?: string,
  options?: VerifySourceLockOptions,
): { ok: true }   // lança no primeiro problema encontrado
```

## Assinatura nova (após este plano — FR-002)

```ts
function verifySourceLock(
  lock: SourceLock,
  workspaceRoot?: string,
  options?: VerifySourceLockOptions,
): LockVerificationResult

type LockVerificationResult =
  | { ok: true }
  | { ok: false; problems: LockVerificationProblem[] };
```

Parâmetros de entrada inalterados. A função **não lança mais** por problema de
verificação — acumula e retorna. (Erros genuinamente excepcionais, como falha de
I/O ao ler um arquivo que `existsSync` reportou presente, continuam sendo
lançados normalmente; a mudança vale para os problemas de verificação, não para
falhas de infraestrutura.)

## Behavior

**Given**: Um lockfile e um conjunto de artefatos em disco.

**Then**: a função percorre **todos** os pacotes e acumula um
`LockVerificationProblem` para cada uma das seguintes condições, sem interromper
a varredura:

| Condição | `kind` |
|---|---|
| Metadado inconsistente (integrity recomputado difere, ou provenance/sourceCommit divergem da fonte) | `metadata` |
| Artefato ausente, com `artifactHash` registrado e `allowMissingArtifacts` falso | `missing-artifact` |
| Artefato presente cujo conteúdo não corresponde ao `artifactHash` | `hash-mismatch` |
| Artefato presente cujo pacote **não tem** `artifactHash` registrado (**novo**, FR-002) | `missing-artifact-hash` |
| Artefato presente, sem hash, e vazio | `empty-artifact` |

Retorna `{ ok: true }` somente quando a lista de problemas está vazia.

**Given**: `options.allowMissingArtifacts === true` (usado pela primeira
verificação do `ci`, antes de materializar).

**Then**: artefatos ausentes **não** geram problema — mas a ausência de
`artifactHash` em um pacote cujo artefato **está** presente continua gerando
`missing-artifact-hash`, porque isso indica lockfile incompleto
independentemente de materialização pendente.

## Chamadores afetados (devem ser atualizados junto)

- `src/agent/catalog/store/agent-catalog-store.ts` — `verifyLock()` repassa o novo
  tipo de retorno (não converte para exceção; a borda CLI decide).
- `src/cli/commands/verify.ts` — formata e imprime todos os problemas, depois
  lança uma única vez.
- `src/cli/commands/ci.ts` — duas chamadas (pré e pós materialização); ambas
  formatam todos os problemas antes de falhar.

`AgentCatalogStore.verifyLockMetadata` é exportado mas **não tem nenhum chamador**
no código de produção (confirmado por grep) — este plano o mantém como está para
não ampliar o escopo, mas a tarefa correspondente deve registrar isso como API
morta candidata a remoção futura.

## Out of scope for this contract

- O formato exato de impressão dos problemas na CLI (detalhe de apresentação).
- A lógica interna de `verifySourceLockMetadata`, além de passar a acumular em vez
  de lançar.
