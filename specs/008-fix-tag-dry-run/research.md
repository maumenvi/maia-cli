# Research: Tag de release só para publicação real

**Feature**: 008-fix-tag-dry-run | **Date**: 2026-10-01

## Verificação empírica (npm 12.0.2, Node 26.6.0)

Fiz uma sonda num pacote temporário cujo `postpublish` imprime o ambiente. Usei só
`--dry-run`, então nada foi enviado ao registro.

| Comando | `npm_command` | `npm_config_dry_run` | `postpublish` roda? |
|---------|---------------|----------------------|---------------------|
| `npm publish --dry-run` | `publish` | `"true"` | sim |
| `npm stage publish --dry-run` | `stage` | `"true"` | sim |
| `npm run postpublish` (execução direta) | `run` | ausente | sim |

No código-fonte (`lib/commands/publish.js`), o `publish` e o `postpublish` rodam sempre que
`spec.type === 'directory' && !ignoreScripts`, **independente** de `dryRun` e de `isStage`. O
`npm stage approve` (`lib/commands/stage/approve.js`) só faz a chamada HTTP e não executa
scripts. O `npm_command` vem de `process.env.npm_command = this.command` (`lib/npm.js:212`).

## D1 — Como detectar prévia e stage

**Decision**: ler duas variáveis de ambiente que o npm define para scripts de ciclo de vida:

- prévia: `npm_config_dry_run === 'true'` (comparação exata; `false`, vazio ou ausente não
  contam, como diz o Edge Case da spec);
- stage: `npm_command === 'stage'`.

Prévia tem prioridade sobre stage: `npm stage publish --dry-run` mostra a mensagem de prévia.

**Rationale**: são as variáveis que o npm já exporta. A sonda confirmou os valores. Não
exige ler argv do npm nem configuração extra.

**Alternatives considered**:
- *Checar no registro se `X` foi publicado (`npm view …@X`)*: depende de rede, fica lento e
  pode dar falso negativo logo depois da publicação, por causa do cache e da propagação do
  registro.
- *Trocar `postpublish` por um passo manual*: perde a automação que a feature 007 pediu.

## D2 — Onde fica a decisão (pureza e testabilidade)

**Decision**: nova função pura exportada `decidePublishSkip(env)` em `scripts/tag-release.mjs`,
que retorna `'dry-run' | 'staged' | null`, com declaração em `scripts/tag-release.d.mts`.
`main()` a chama **antes** de qualquer `git(...)` (FR-004). Se o retorno não for `null`,
imprime a mensagem do contrato e retorna com exit 0.

**Rationale**: mesmo padrão das funções puras da 007 (`releaseTagName`, `decideTagAction`).
O teste roda sem git nem npm (FR-006). `decideTagAction` não muda (FR-005).

**Alternatives considered**: um campo novo em `decideTagAction`. Rejeitado porque misturaria
"se deve tentar" com "o que fazer com a tag" e mudaria um contrato já testado.

## D3 — Mensagens e saída

**Decision**: stdout e exit 0. Os textos estão em [contracts/release.md](./contracts/release.md).
A mensagem de stage cita o comando exato para depois da aprovação.

**Rationale**: pular não é erro. Um exit ≠ 0 faria o `npm publish --dry-run` parecer que
falhou.

## D4 — Validação ponta a ponta

**Decision**: além do teste unitário, validar no quickstart com a sonda real: um repositório
git temporário com remoto bare, em que `npm publish --dry-run` e `npm stage publish --dry-run`
rodam o `postpublish` de verdade. Esperado: nenhuma tag criada. A publicação real não é
testada; os quatro casos da 007 são reexecutados com `node scripts/tag-release.mjs` direto.
