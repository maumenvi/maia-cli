# Contract: `maia source add|ls`

Contrato de comando CLI — descreve comportamento observável (argv →
stdout/stderr/exit-code/efeitos no sistema de arquivos). Cobre apenas o
comportamento alterado por este plano (validação de URL, FR-005); listagem
(`source ls`) e o formato já existente de `manifest.sources`/`manifest.registries`
permanecem inalterados.

## Invocation

```text
maia source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]
maia source ls
```

## Behavior 1 — URL sintaticamente inválida é rejeitada imediatamente (FR-005)

**Given**: `<repo-url>` é uma string vazia, só espaços, ou não começa com um
protocolo Git reconhecível (`https://`, `git@`, `ssh://`, `git://`) nem termina
em `.git`.

**Then**:
- Exit code: diferente de zero.
- stderr: mensagem explícita indicando que a URL não parece um repositório Git
  válido.
- Filesystem: `manifest.sources` NÃO é modificado — nenhuma entrada é adicionada,
  `maia.json` permanece byte-a-byte inalterado se já existia.
- `store.buildLock()` NÃO é chamado (evita o efeito colateral de reconstrução de
  lock em uma entrada que nunca foi persistida).

**Given**: `<repo-url>` passa na checagem de sintaxe (ex.:
`https://github.com/org/repo`, `git@github.com:org/repo.git`).

**Then** (comportamento existente inalterado): a fonte é adicionada a
`manifest.sources[<alias>]`, `store.buildLock()` roda, e `Added source <alias>` é
impresso.

## Behavior 2 — `source ls` (inalterado)

**Given**: Qualquer estado do manifesto.

**Then**: imprime o JSON de `{ registries, sources }` como hoje — este plano não
altera o formato de listagem.

## Out of scope for this contract

- Resolução de commit / verificação de lock para uma fonte já adicionada
  (`resolveSourceCommit`, `buildLockFromManifest`) — inalterado; a validação de
  sintaxe deste plano acontece antes e é independente dessa resolução posterior.
- Revogação de confiança (`trusted: true → false` em uma fonte existente) —
  fora de escopo desta spec, conforme Clarification 2.
