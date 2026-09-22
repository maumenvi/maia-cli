# Contract: `maia ci`

Contrato de comando CLI — descreve comportamento observável (argv →
stdout/stderr/exit-code/efeitos no sistema de arquivos). Cobre os comportamentos
alterados por este plano; a ordem "validar antes de materializar" e a ausência de
prompts já são baseline existente e permanecem.

## Invocation

```text
maia ci
```

## Ordem de execução (após este plano)

1. Gate de versão de lockfile (FR-010) — **novo**, antes de qualquer outra coisa.
2. Gate de staleness contra o manifesto (FR-008) — **novo**.
3. Validação de metadados/hashes com `allowMissingArtifacts` (baseline).
4. Materialização, protegida por rollback (FR-009) — **rollback é novo**.
5. Validação estrita pós-materialização (baseline).
6. Sincronização dos agentes configurados (baseline).

Os passos 1 e 2 vêm **antes** de qualquer escrita, preservando SC-004.

## Behavior 1 — Lockfile desatualizado em relação ao manifesto (FR-008)

**Given**: Um `maia.lock.json` cuja projeção comparável (todos os campos exceto
`artifactHash` e `integrity` — ver data-model.md) difere da projeção de um lockfile
regenerado a partir do `maia.json` atual.

**Then**:
- Exit code: diferente de zero.
- stderr: mensagem explícita de que o lockfile está desatualizado, instruindo a
  rodar o comando de lock e versionar o resultado. A mensagem também menciona que
  a divergência pode vir de um ref de fonte que avançou, não apenas de edição do
  manifesto (ver Decision 4 em research.md).
- Filesystem: **nenhum artefato materializado**, e o `maia.lock.json` em disco
  permanece byte-a-byte inalterado — CI nunca regenera o lockfile silenciosamente.

**Given**: O lockfile e o manifesto concordam na projeção comparável (o caso normal
de um CI com o lock corretamente commitado).

**Then**: a execução prossegue para o passo 3.

## Behavior 2 — Versão de schema de lockfile incompatível (FR-010)

**Given**: Um lockfile cujo `lockfileVersion` não é suportado pela CLI em execução.

**Then**:
- Exit code: diferente de zero.
- stderr: mensagem nomeando a versão declarada pelo lockfile e a suportada,
  orientando a migrar ou usar uma CLI compatível.
- A falha **não** é reportada como divergência de integridade.
- Filesystem: nenhum artefato materializado.

## Behavior 3 — Restauração interrompida (FR-009)

**Given**: A materialização (passo 4) falha ou é interrompida após já ter
materializado parte dos artefatos.

**Then**: os artefatos materializados por **esta execução** são removidos
(rollback), o erro original é propagado, e o exit code é diferente de zero.
Artefatos que já existiam antes da execução não são tocados pelo rollback.

## Behavior 4 — Fonte inalcançável vs. capacidade ausente (FR-011)

**Given**: Durante a materialização, a fonte de uma capacidade não responde (falha
de rede).

**Then**: a mensagem reporta **indisponibilidade da fonte**, distinta da mensagem
usada quando a fonte responde mas não contém mais a capacidade. Nenhuma nova
tentativa automática é feita.

## Out of scope for this contract

- O formato exato das mensagens além do que está especificado acima.
- O comando `maia install` sem argumentos, que **continua** regenerando o lockfile a
  partir do manifesto (decisão da feature 003) — a assimetria com `ci` é
  intencional e está registrada na Clarification 1 do spec.
