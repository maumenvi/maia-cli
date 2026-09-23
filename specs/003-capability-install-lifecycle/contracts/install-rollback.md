# Contract: `withRollback()` — mecanismo de rollback de instalação/remoção

Contrato de função — descreve o comportamento do helper de coordenação
introduzido por este plano (`src/cli/shared/rollback/install-rollback.ts`),
não um comando CLI diretamente. Documentado como contrato porque é
consumido por 6 pontos de integração (3 branches de install, 3 branches de
remove) que precisam segui-lo de forma consistente.

## Assinatura

```ts
function withRollback<T>(steps: RollbackStep<T>[]): Promise<T[]>
```

## Behavior

**Given**: Uma lista de `N` passos, cada um com `run()` e `undo()`.

**Then, caminho feliz**: cada `run()` é executado em ordem; se todos
concluem sem lançar, `withRollback` retorna o array de resultados na mesma
ordem. Nenhum `undo()` é chamado.

**Given**: O passo `K` (1-indexado) lança uma exceção durante `run()`.

**Then**: `withRollback` interrompe a execução de passos subsequentes
imediatamente. Executa `undo()` de cada passo de `1` até `K-1` (os que
completaram `run()` com sucesso), em ordem **reversa** (do mais recente
para o mais antigo). O passo `K` que falhou não tem seu `undo()` chamado
(ele nunca completou `run()`, então não há o que desfazer). Após todos os
`undo()` pendentes rodarem, o erro original lançado pelo passo `K` é
relançado, preservando sua mensagem, `code` (se `Error` com propriedade
`code`), e stack trace.

**Given**: Um `undo()` chamado durante a reversão ele mesmo lança uma
exceção.

**Then**: o erro do `undo()` é logado via `console.error` (não engolido
silenciosamente), mas a reversão continua para os passos restantes — um
`undo()` com falha não impede a tentativa de desfazer os demais passos. O
erro original do passo `K` (não o erro do `undo()`) é o que é relançado ao
final.

## Uso esperado nos 6 pontos de integração

- **Install de skill** (`installSkill`): `run()`s = materializar arquivo →
  `addDependency` → `buildLock`. `undo()`s correspondentes = apagar o
  arquivo materializado → `removeDependency` → restaurar o lock capturado
  antes do primeiro passo.
- **Install de tool** (branch em `install-command.ts`): mesmo padrão,
  usando `materializeTool`/`removeMaterializedFile`.
- **Install de MCP** (`installMcp`): `run()`s = `ensureMcpEnvFileEntries` →
  `addDependency` → `buildLock`. O `undo()` do primeiro passo não remove
  variáveis de ambiente pré-existentes de instalações anteriores — apenas
  reverte a adição de novas entradas que este passo especificamente criou.
- **Remove de skill/tool/mcp** (`remove.ts`): mesma estrutura de 3 passos,
  na ordem inversa conceitualmente (remover dependência → reconstruir lock
  → remover artefato materializado), cada um com seu `undo` simétrico.

## Out of scope for this contract

- Persistência de estado entre processos (journal em disco) — ver Decision
  1 em research.md; este mecanismo cobre apenas a duração de uma única
  invocação de comando.
- A lógica específica de cada `run()`/`undo()` individual (materialização,
  escrita de manifesto, etc.) — inalterada por este contrato, que descreve
  apenas a orquestração.
