# Feature Specification: Tag de release só para publicação real

**Feature Branch**: `007-fix-package-version` (correção da mesma branch, ainda não mesclada)

**Created**: 2026-10-01

**Status**: Implemented (branch `007-fix-package-version`)

**Input**: Descrição do usuário: "o erro encontrado pelo code review". O achado do
`/code-review` da branch `007-fix-package-version`:

> `scripts/tag-release.mjs:69`: o novo hook `postpublish` cria e envia a tag `vX.Y.Z`
> mesmo no `npm publish --dry-run`. No código do npm 12 instalado, com `--dry-run` o npm
> pula o upload, mas ainda executa os scripts `publish` e `postpublish`. Uma prévia em
> dry-run cria e envia a tag de uma versão que nunca foi publicada. A publicação real, feita
> depois a partir de um commit mais novo, é então recusada com "Tag … already exists …
> refusing to move it" e exit 1, embora o pacote já tenha saído. O mesmo acontece com
> `npm stage`. Correção: retornar cedo quando `process.env.npm_config_dry_run === 'true'` e
> fazer o mesmo para publicações em stage.

## Contexto

A feature 007 adicionou um passo automático após a publicação: criar a tag `vX.Y.Z` no
repositório e enviá-la ao GitHub, para ligar cada versão publicada ao commit de origem
(FR-011 da 007).

Conferido no código do npm 12.0.2 instalado (`lib/commands/publish.js`):

- Com `--dry-run`, o npm **não** envia o pacote ao registro, mas **executa** os scripts
  `publish` e `postpublish`.
- `npm stage publish` usa o mesmo fluxo: envia o pacote para uma área de espera e executa
  `postpublish`. O pacote só fica disponível depois de `npm stage approve <id>`, e esse
  comando **não** executa scripts.

Nos dois casos o passo de tag roda para uma versão que ainda não está publicada. A tag fica
apontando para um commit que talvez nunca seja publicado e trava a tag da publicação
verdadeira.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prévia da publicação não cria tag (Priority: P1)

A pessoa mantenedora roda uma prévia da publicação (`npm publish --dry-run`) para ver o
conteúdo do pacote antes de publicar de fato. Nenhuma tag é criada nem enviada ao GitHub. A
saída diz explicitamente que a tag foi pulada por ser uma prévia.

**Why this priority**: é o defeito apontado pelo code review. Quebra a publicação real
seguinte e deixa no repositório público uma tag de versão inexistente.

**Independent Test**: num repositório git temporário com remoto local, rodar o passo de tag
simulando o contexto de prévia do npm. Nenhuma tag local ou remota é criada, a saída explica
o motivo e o exit code é 0.

**Acceptance Scenarios**:

1. **Given** um repositório sem a tag `vX`, **When** a prévia da publicação executa o passo de
   tag, **Then** nenhuma tag `vX` existe localmente nem no remoto, e o comando termina com
   sucesso, informando que pulou por ser dry-run.
2. **Given** que uma prévia já rodou, **When** a pessoa faz mais commits e roda a publicação
   real, **Then** a tag `vX` é criada no commit publicado e enviada, sem a recusa "already
   exists".
3. **Given** uma árvore git com mudanças não commitadas, **When** a prévia roda, **Then** o
   comando não falha por causa da árvore suja, porque nenhuma tag seria criada.

---

### User Story 2 - Publicação em stage não cria tag antes da aprovação (Priority: P2)

A pessoa mantenedora publica em stage (`npm stage publish`), que deixa a versão aguardando
aprovação. O passo de tag não cria a tag nesse momento. A saída explica que a versão ainda
não está publicada e orienta a rodar o passo de tag manualmente depois de aprovar.

**Why this priority**: mesmo defeito e mesma consequência, mas num fluxo menos usado.

**Independent Test**: simular o contexto de `npm stage` e verificar que nenhuma tag é criada
e que a mensagem cita o comando a rodar depois da aprovação.

**Acceptance Scenarios**:

1. **Given** uma publicação em stage, **When** o passo de tag executa, **Then** nenhuma tag é
   criada nem enviada, o exit code é 0 e a saída orienta rodar o passo de tag depois de
   `npm stage approve`.
2. **Given** que a versão staged foi aprovada, **When** a pessoa roda o passo de tag
   manualmente, **Then** a tag `vX` é criada e enviada normalmente.

---

### User Story 3 - Publicação real continua criando a tag (Priority: P1)

A publicação real (`npm publish`) continua criando e enviando a tag exatamente como
especificado na feature 007: recusa árvore suja, é idempotente no mesmo commit e nunca move
uma tag existente.

**Why this priority**: a correção não pode desligar o comportamento que ela protege.

**Independent Test**: os quatro casos do contrato de release da 007 continuam valendo fora do
contexto de prévia e de stage.

**Acceptance Scenarios**:

1. **Given** uma publicação real com árvore limpa e sem tag, **When** o passo de tag roda,
   **Then** a tag é criada e enviada.
2. **Given** a execução manual do passo de tag fora do npm, **When** ele roda, **Then** ele se
   comporta como publicação real.

---

### Edge Cases

- **Prévia de stage** (`npm stage publish --dry-run`): pula, com a mesma mensagem de dry-run.
- **Execução manual do script** (fora do npm, sem contexto de prévia ou stage): comporta-se
  como publicação real, porque é o caminho de recuperação documentado no `AGENT.md`.
- **Indicador de dry-run com valor diferente de "verdadeiro"** (ex.: `false` ou vazio): não
  conta como prévia.
- **Scripts desativados** (`--ignore-scripts`): o npm não executa o passo de tag. Isso não
  muda; a tag é criada manualmente, como já documentado.
- **Tag criada por engano numa prévia anterior a esta correção**: fica fora do escopo
  automático. A remoção é manual e está documentada nas Assumptions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O passo de tag MUST NOT criar nem enviar tag quando executado por uma prévia
  de publicação (dry-run) do npm.
- **FR-002**: O passo de tag MUST NOT criar nem enviar tag quando executado por uma
  publicação em stage do npm, que ainda depende de aprovação.
- **FR-003**: Nos casos de FR-001 e FR-002, o passo MUST terminar com sucesso (exit 0) e
  escrever uma linha explicando por que pulou. No caso de stage, a linha MUST indicar que o
  passo de tag deve ser executado manualmente depois da aprovação.
- **FR-004**: A verificação de prévia ou stage MUST acontecer antes de qualquer consulta ao
  git, de modo que árvore suja ou tag existente não causem falha nesses casos.
- **FR-005**: Fora dos casos de FR-001 e FR-002, inclusive na execução manual, o
  comportamento MUST ser idêntico ao da feature 007: os quatro casos do contrato de release
  sem alteração.
- **FR-006**: A decisão de pular MUST ser coberta por teste automatizado que não execute git
  nem npm reais.
- **FR-007**: A documentação de release (`AGENT.md`) MUST explicar que prévia e stage não
  criam tag, e que após `npm stage approve` a tag é criada manualmente.

### Key Entities

- **Contexto de publicação**: modo em que o npm executou o passo de tag: publicação real,
  prévia (dry-run) ou stage. Determina se a tag pode ser criada.
- **Tag de release**: `vX.Y.Z`; sem mudança em relação à feature 007.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das prévias de publicação, nenhuma tag nova aparece no repositório local
  nem no remoto.
- **SC-002**: Uma publicação real feita depois de qualquer número de prévias cria a tag no
  commit publicado na primeira tentativa, sem recusa.
- **SC-003**: Em 100% das publicações em stage, nenhuma tag é criada antes da aprovação, e a
  saída diz o próximo passo.
- **SC-004**: Os quatro casos do contrato de release da feature 007 continuam passando sem
  alteração.

## Assumptions

- A correção entra na mesma branch `007-fix-package-version`, ainda não mesclada nem
  publicada. Nenhuma versão foi publicada com o defeito, então nenhuma tag errada existe no
  remoto por causa dele.
- O npm informa aos scripts se está em dry-run e qual comando está executando (`publish` ou
  `stage`), por variáveis de ambiente padrão dos scripts de ciclo de vida. O plano confirma
  os nomes exatos no npm instalado.
- O `npm stage approve` não executa scripts, então criar a tag automaticamente na aprovação
  fica fora do escopo. O caminho é a execução manual do passo de tag, já documentada.
- Se alguém tiver criado uma tag errada numa prévia antes desta correção, remover a tag
  (`git tag -d vX && git push origin :refs/tags/vX`) é uma ação manual. O script nunca apaga
  nem move tags, como exige a feature 007.
