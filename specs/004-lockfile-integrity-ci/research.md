# Phase 0 Research: Lockfile, Integridade & Restauração em CI

Todos os campos do Technical Context foram resolvidos por inspeção do repositório
(`build.ts`, `package-descriptor.ts`, `verify-source-lock.ts`, `ci.ts`, `lock.ts`,
`verify.ts`, `context.ts`, `reinstall-from-lock.ts`, `source-lock.ts`) e pelas 10
decisões das duas sessões de clarificação de 2026-09-22. Este documento cobre as 6
decisões de abordagem necessárias.

## Decision 1: Remoção de `generatedAt` e não-reescrita quando idêntico (FR-001)

**Decision**: Remover o campo `generatedAt` da interface `SourceLock`
(`src/agent/catalog/types/lock/source-lock.ts`) e do objeto construído por
`buildLockFromManifest` (`build.ts:62`). Manter `lockfileVersion: 1` inalterado.
Adicionalmente, `AgentCatalogStore.saveLock` passa a comparar o conteúdo
serializado com o arquivo em disco e só escrever quando forem diferentes.

**Rationale**: A investigação confirmou por grep que `generatedAt` é escrito mas
nunca lido — nem por `verifySourceLock`, nem por `verifySourceLockMetadata`, nem
por `reinstallFromLock`, nem por nenhum comando. Remover um campo que nenhum
consumidor lê não quebra compatibilidade de leitura: um lockfile antigo que ainda
tenha `generatedAt` continua sendo parseado normalmente (o campo simplesmente é
ignorado, como já é hoje). Por isso `lockfileVersion` não precisa subir para 2 —
ele existe para sinalizar mudanças que quebram leitura, e esta não quebra.

A não-reescrita (Clarification 10) é implementada no `saveLock` em vez de no
`lockCommand` porque `buildLock()` é chamado de muitos lugares (install, remove,
ci, context) — colocar a checagem no ponto de escrita cobre todos eles com uma
mudança só, em vez de replicar a comparação em cada chamador.

**Alternatives considered**:
- *Manter `generatedAt` e isentá-lo do SC-003*: rejeitado pela Clarification 2.
- *Subir `lockfileVersion` para 2*: rejeitado — forçaria todo lockfile existente a
  falhar no gate de versão do FR-010, transformando uma limpeza de campo morto em
  uma quebra para todos os usuários, sem ganho (nenhum consumidor lê o campo).
- *Comparar e não reescrever dentro de `lockCommand`*: rejeitado — deixaria
  `install`, `remove` e `ci` ainda reescrevendo desnecessariamente.

## Decision 2: Verify recusa pacote sem hash registrado (FR-002, SC-002)

**Decision**: Em `verifySourceLock`, o ramo final que hoje apenas checa
`fingerprint.length === 0` passa a registrar um problema do tipo
`missing-artifact-hash` para todo pacote materializado sem `artifactHash`. A
mensagem orienta a regerar o lockfile (`maia lock`).

**Rationale**: É exatamente o furo que torna SC-002 falso — um artefato sem hash
aceita qualquer conteúdo não-vazio. A Clarification 6 decidiu recusar.

**Nota de compatibilidade (importante para a quebra em tarefas)**: `artifactHash` é
gravado por `createPackageDescriptor` **somente quando o arquivo já existe em disco
no momento do lock** (`package-descriptor.ts:77-85`). Isso significa que um lockfile
gerado antes dos artefatos serem materializados — cenário real, já que
`ensureInitialized` chama `buildLock()` num projeto novo e vazio — não tem hashes e
**passará a falhar a verificação** após esta mudança. A mitigação é que o próprio
fluxo normal já regenera o lock após materializar (install chama `buildLock()` no
final de cada instalação), então na prática um projeto com capacidades instaladas
tem os hashes. O risco fica concentrado em lockfiles commitados em estados
intermediários — a tarefa de implementação deve incluir um teste que cubra
explicitamente esse caso para que o comportamento seja consciente, não uma
surpresa.

**Alternatives considered**:
- *Avisar mas passar*: rejeitado pela Clarification 6 (Opção C foi descartada).
- *Gravar `artifactHash` mesmo para arquivo inexistente (ex.: hash de vazio)*:
  rejeitado — mascararia a diferença entre "não materializado" e "materializado
  vazio", piorando o diagnóstico em vez de melhorá-lo.

## Decision 3: Verify acumula todos os problemas (FR-002)

**Decision**: `verifySourceLock` deixa de lançar no primeiro problema e passa a
retornar `{ ok: true } | { ok: false; problems: LockVerificationProblem[] }`, onde
`LockVerificationProblem = { packageId: string; kind: 'metadata' | 'missing-artifact'
| 'hash-mismatch' | 'missing-artifact-hash' | 'empty-artifact'; message: string }`.
O lançamento passa para os chamadores (`verify.ts`, `ci.ts`), que formatam todos os
problemas antes de falhar.

**Rationale**: Clarification 9. Acumular na função de domínio e lançar na borda
(CLI) segue a separação já usada no projeto entre lógica pura e apresentação — o
mesmo padrão que a feature 002 adotou ao fazer `searchCatalog` retornar
`{ results, failures }` em vez de descartar as falhas.

`verifySourceLockMetadata` (que hoje lança) é chamada no início de
`verifySourceLock`; ela também passa a acumular, contribuindo problemas do tipo
`metadata` para a mesma lista.

**Alternatives considered**:
- *Lançar um erro agregado contendo todos os problemas*: rejeitado — obrigaria o
  chamador a parsear a mensagem para formatar, e o caminho feliz (zero problemas)
  ficaria dependente de try/catch. Retornar a lista é mais direto e mais testável.

## Decision 4: Gate de staleness do lockfile em CI (FR-008)

**Decision**: Novo predicado puro `isLockStale(lockOnDisk: SourceLock,
lockFromManifest: SourceLock): boolean`, que compara os dois lockfiles **apenas
sobre a projeção dos campos derivados do manifesto**, ignorando `artifactHash` e
`integrity`. A projeção é produzida por `lockComparableProjection(lock)`. O `ci.ts`
chama `buildLockFromManifest(store.loadManifest(), ...)` em memória — sem salvar —
e compara com o lock em disco.

**Rationale**: Esta é a decisão de design mais delicada da feature. Uma comparação
byte-a-byte ingênua entre "lock em disco" e "lock regenerado" **falharia em todo
checkout de CI limpo**, porque `artifactHash` só é gravado quando o arquivo existe
em disco (`package-descriptor.ts:77-85`): num checkout sem artefatos materializados,
a regeneração produz um lock sem hashes, enquanto o lock commitado os tem. E como
`integrity` é computado incluindo `artifactHash`
(`create-lock-integrity-payload.ts`), ele diverge pelo mesmo motivo. Excluir esses
dois campos da comparação isola exatamente o que o manifesto determina — nome,
versão, fonte, path, enabled, capabilities, constraints, allowedLlms, sourceCommit,
provenance, vscode, inputSchema, e o conjunto de `sources` — que é o que "estar
desatualizado em relação ao manifesto" significa.

Comparar em memória (sem salvar o lock regenerado) é essencial: salvar violaria o
FR-008, que exige que CI **não** regenere o lockfile silenciosamente.

**Ressalva de rede documentada**: `buildLockFromManifest` chama `resolveSourceCommit`,
que pode fazer I/O de rede para resolver um ref flutuante (ex.: `main`) de uma fonte
Git. Isso significa que o gate de staleness pode ser afetado por estado de rede — se
o ref remoto avançou desde o último `maia lock`, o `sourceCommit` regenerado difere
e o lock é reportado como desatualizado. Isso é **comportamento correto e desejável**
(o lock realmente não reflete mais o que o manifesto resolve hoje), mas precisa
estar documentado para que o operador entenda por que um pipeline pode falhar sem
ninguém ter editado o manifesto. A tarefa de implementação deve garantir que a
mensagem de erro mencione essa possibilidade.

**Alternatives considered**:
- *Comparar byte-a-byte os dois lockfiles inteiros*: rejeitado — falso positivo em
  todo CI limpo, pelo motivo acima.
- *Comparar apenas um hash do manifesto gravado dentro do lock*: exigiria um campo
  novo no lockfile (quebra de formato) e não detectaria divergências introduzidas
  por mudança na resolução de fonte, só por edição do manifesto.
- *Não regenerar nada e comparar o lock contra o manifesto campo a campo
  diretamente*: rejeitado — duplicaria toda a lógica de derivação de
  `createPackageDescriptor` num segundo lugar, que inevitavelmente divergiria.

## Decision 5: Rollback na restauração em CI (FR-009)

**Decision**: Envolver a materialização dentro de `ciCommand` com o `withRollback`
já existente (`src/cli/shared/rollback/install-rollback.ts`, criado pela feature
003). O passo de materialização (`reinstallFromLock`) recebe como `undo` a remoção
dos artefatos que ele materializou — `reinstallFromLock` já retorna a lista de
caminhos materializados (`{ skills: string[] }`, que na prática inclui skills e
tools), então o `undo` remove exatamente esses caminhos.

**Rationale**: Clarification 4 estendeu a garantia da 003 ao CI. Reaproveitar o
helper já implementado e testado evita um segundo mecanismo de rollback no
projeto. A lista de retorno de `reinstallFromLock` torna o `undo` preciso — remove
só o que aquela execução criou, não o que já existia antes.

**Alternatives considered**:
- *Envolver dentro de `reinstallFromLock`*: rejeitado — essa função também é
  chamada por `installCommand([])`, que já tem seu próprio rollback; envolver lá
  criaria aninhamento de rollback sem necessidade.
- *Não fazer rollback em CI, contando com a re-execução do pipeline*: rejeitado
  pela Clarification 4.

## Decision 6: Gate de versão de lockfile e mensagens (FR-010, FR-011, FR-006)

**Decision**: Três correções pequenas e independentes:
- **FR-010**: `isLockfileVersionCompatible(lockfileVersion: number, supported:
  number): boolean` como predicado puro, mais
  `assertLockfileVersionCompatible` que lança um erro tipado reportando ambas as
  versões. Chamado no início de `verify.ts` e de `ci.ts`, antes de qualquer outra
  validação — espelhando exatamente o que a feature 001 fez para o manifesto com
  `assertManifestSchemaCompatible`.
- **FR-011**: em `materializeRemoteSkill`, distinguir falha de alcance da fonte
  (erro de rede lançado pelo `fetch`) de resposta bem-sucedida sem a capacidade
  (markdown `null`), produzindo mensagens diferentes. Sem retry, conforme a
  Clarification 8.
- **FR-006**: em `context.ts`, checar a existência do arquivo antes do
  `readFileSync` e lançar com orientação para rodar `maia context build`,
  espelhando a mensagem que `verify.ts` já dá para lockfile ausente.

**Rationale**: Os três são correções de diagnóstico de baixo risco, sem mudança de
fluxo — cada um troca um erro confuso ou ausente por um específico e acionável. O
gate de versão reaproveita o precedente direto da feature 001, mantendo manifesto e
lockfile simétricos.

**Alternatives considered**:
- *Para FR-006, construir o contexto automaticamente*: rejeitado pela
  Clarification 7.
- *Para FR-011, adicionar retry automático*: rejeitado pela Clarification 8
  (Opção C descartada).
