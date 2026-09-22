# Phase 0 Research: Ciclo de Vida de Instalação de Capacidades

Todos os campos do Technical Context foram resolvidos por inspeção do
repositório (`install-command.ts`, `remove.ts`, `install-skill.ts`,
`install-mcp.ts`, `materialize-tool.ts`, `configure-agents.ts`,
`materialize-agent-skills.ts`, `mcp-config-to-server-entry.ts`) e pelas 4
decisões da sessão de clarificação de 2026-09-22. Este documento cobre as
decisões de abordagem necessárias para fechar os dois gaps do Summary em
plan.md.

## Decision 1: Formato do mecanismo de rollback (FR-008)

**Decision**: Um helper puro de coordenação,
`withRollback<T>(steps: RollbackStep[]): Promise<T>` (ou variante síncrona),
em `src/cli/shared/rollback/install-rollback.ts`. Cada `RollbackStep` é
`{ run: () => T | Promise<T>; undo: () => void }`. O helper executa os
`run()` em ordem; se qualquer um lançar, executa os `undo()` dos passos já
concluídos com sucesso, em ordem reversa, e então relança o erro original
(preservando `code`/mensagem, no mesmo espírito de `writeFileAtomic`). Um
`undo()` que ele mesmo falhar tem seu erro logado (não engolido
silenciosamente) mas não impede a execução dos `undo()` restantes — cada
passo deve poder ser desfeito independentemente dos outros.

Aplicado assim aos três fluxos de instalação:
- **Skill**: passo 1 = materializar arquivo (`undo` = `removeMaterializedFile`
  no mesmo path); passo 2 = `store.addDependency` (`undo` =
  `store.removeDependency`); passo 3 = `store.buildLock()` (`undo` = reverter
  ao lock anterior, capturado antes do passo 1 via `store.loadLock()`).
- **Tool**: mesmo padrão, usando `materializeTool`/`removeMaterializedFile`.
- **MCP**: passo 1 = `ensureMcpEnvFileEntries` (`undo` = não remove
  variáveis já existentes de execuções anteriores, apenas não é acionado
  para as que este passo especificamente adicionou — rastreado pelo próprio
  passo); passo 2 = `store.addDependency`; passo 3 = `store.buildLock()`.

**Rationale**: Um helper em memória (sem journal em disco) é a opção mais
barata que ainda satisfaz literalmente a Clarification 1 ("nenhuma operação
interrompida deixa estado parcial... não é aceitável depender apenas de
reexecução futura") — o requisito é sobre o estado observável *após* a
operação terminar (com sucesso ou com falha explícita), não sobre
sobreviver a um crash do processo no meio da execução síncrona/assíncrona
(que nenhum mecanismo em espaço de usuário, sem um daemon supervisor,
consegue garantir de qualquer forma — um `kill -9` no meio de um `run()`
específico ainda pode deixar aquele passo individual inconsistente, mas
cada escrita individual já é atômica via `writeFileAtomic`/
`removeMaterializedFile`, então o pior caso é "aquele um arquivo" não "a
sequência inteira"). Reaproveita o padrão já usado no projeto (`try/catch`
+ ordem de operações) em vez de introduzir uma dependência de transação
externa, mantendo a postura de zero dependências de runtime.

**Alternatives considered**:
- *Journal em disco (arquivo `.maia/install.lock` com o passo em
  andamento, verificado no próximo start)*: rejeitado — exige um formato de
  arquivo novo, lógica de recuperação no próximo `init`/`install`, e resolve
  um caso (recuperação entre processos) que a Clarification 1 não pediu
  explicitamente; o texto fala em "reverter... quando uma operação é
  interrompida", que uma reversão síncrona no próprio processo já satisfaz
  para o caso comum (exceção lançada, não `kill -9`).
- *Escrever manifesto/lockfile primeiro, materializar depois*: rejeitado —
  inverteria a ordem atual sem eliminar o problema (ainda haveria uma janela
  entre os dois passos) e quebraria a suposição de várias funções existentes
  de que o artefato já existe quando o manifesto é atualizado (ex.:
  `path.relative(..., targetPath)` em `installSkill`/branch de tool depende
  do path já resolvido pela materialização).
- *Ordenar as escritas de forma que o "commit" final seja uma única escrita
  atômica (ex.: só escrever o manifesto por último, nunca precisando
  desfazer)*: parcialmente já é a ordem atual (manifesto/lock por último),
  mas isso sozinho não cobre "materializou o arquivo, processo morreu antes
  do manifesto" — ainda precisa de um `undo` explícito para a
  materialização. O helper de rollback formaliza isso em vez de deixar como
  uma prática implícita.

## Decision 2: Compatibilidade de transporte MCP por agente (FR-004, Clarification 2)

**Decision**: Novo predicado puro `agentSupportsTransport(target: AgentTarget,
transport: MCPConfig['transport']): boolean` em
`src/agent/agents/inject/agent-supports-transport.ts`. Implementação inicial:
retorna `true` para todo `target`/`transport`, já que nenhum `AgentTarget`
existente declara uma restrição de transporte hoje (todos os 5 transportes —
`stdio`, `http`, `sse`, `ws`, `npx` — já são representáveis pelo
`AgentMcpServerConfig` neutro que `mcpConfigToServerEntry` produz, consumido
por todo `injectAgentConfig`). `collectAgentMcpEntries` (e, por extensão,
`configureAgents`) passa a chamar esse predicado antes de incluir cada
entrada MCP: quando `false`, emite um aviso explícito (`console.warn`) e
omite aquela entrada específica da lista retornada para aquele agente,
sem lançar erro e sem impedir a inclusão de outras MCPs/skills para o
mesmo agente.

**Rationale**: O ponto de extensão é criado agora (satisfazendo a
Clarification 2 literalmente — "pular a sincronização daquele agente
específico com aviso"), mas a implementação hoje é permissiva porque não há
nenhum caso real de incompatibilidade no código atual — inventar uma lista
de transportes suportados por agente sem nenhuma fonte de verdade real
seria adivinhação. Quando um `AgentTarget` futuro precisar declarar uma
restrição real, ele ganha um campo opcional (ex.:
`supportedTransports?: MCPConfig['transport'][]`) e o predicado passa a
checar isso — sem quebrar nenhum agente existente, que continua permissivo
por omitir o campo.

**Alternatives considered**:
- *Não criar o predicado agora, só documentar a intenção*: rejeitado —
  FR-004 exige o comportamento de "pular com aviso" como parte do contrato
  testável desta feature; adiar a implementação deixaria o requisito sem
  cobertura de teste.
- *Inferir incompatibilidade a partir de uma exceção lançada por
  `mcpConfigToServerEntry` (comportamento atual, implícito)*: rejeitado —
  hoje uma configuração malformada (ex.: falta `url` para `http`) já lança,
  mas isso é "configuração inválida", não "agente incapaz de representar um
  transporte válido"; são falhas de natureza diferente e a Clarification 2
  pede uma checagem explícita de capacidade do agente, não apenas
  validação de campo.

## Decision 3: Remoção de tool (FR-006)

**Decision**: Adicionar o branch `if (kind === 'tool')` em `remove.ts`,
espelhando o branch de skill: resolve o path materializado (via
`dependency.path`, com fallback ao path padrão calculado por
`resolveToolTargetPath` caso a dependência não tenha `path` gravado),
chama `removeMaterializedFile`, e chama `removeEmptyFallbackDir` no
diretório de tools (`resolveToolsDir`).

**Rationale**: Espelha exatamente o padrão já testado e correto do branch de
skill — reaproveita as mesmas duas funções (`removeMaterializedFile`,
`removeEmptyFallbackDir`) já usadas ali, apenas trocando o diretório-alvo.

**Alternatives considered**: nenhuma — este é o gap mais direto identificado
pela investigação, sem ambiguidade de design.

## Decision 4: Remoção de MCP com paridade multi-agente (FR-006)

**Decision**: Trocar a chamada `store.syncVsCodeMcp()` em `remove.ts` por
`restoreConfiguredAgents(store)` — a mesma função já chamada ao final de
`installCommand`, que sincroniza *todos* os agentes configurados (não
apenas VS Code) via `configureAgents`. Como `collectAgentMcpEntries` é
derivado do lockfile já atualizado (`resolveAuthorizedPackages`), a MCP
removida some automaticamente de cada agente na próxima sincronização —
não é necessário nenhum "apagar" explícito porque a configuração nativa de
MCP é sempre *reescrita por completo* a partir do estado atual, não
incrementalmente editada.

**Rationale**: Resolve a assimetria "install sincroniza todos os agentes,
remove só sincroniza VS Code" identificada na investigação, reaproveitando
a função já existente e testada (`restoreConfiguredAgents`) em vez de
duplicar a lógica de sincronização multi-agente dentro de `remove.ts`.

**Alternatives considered**:
- *Manter `syncVsCodeMcp()` e adicionar chamadas separadas para os demais
  formatos nativos*: rejeitado — reintroduziria a mesma duplicação que
  `restoreConfiguredAgents`/`configureAgents` já existem para evitar;
  não há razão para remove ter um caminho de sincronização diferente do
  install.

## Decision 5: Limpeza de cópia nativa de skill na remoção (FR-006)

**Decision**: Nova função `removeNativeAgentSkillCopies(store, name):
void` em `src/cli/commands/agent/remove-native-agent-artifacts.ts`,
chamada pelo branch de skill em `remove.ts` antes de
`restoreConfiguredAgents`. Para cada agente configurado com `skillsDir`
declarado, resolve `path.resolve(skillsDir, name)` e remove esse diretório
inteiro (recursivo) se existir — a skill removida nunca mais deveria
aparecer ali, e `materializeAgentSkills` (chamado logo depois, dentro de
`restoreConfiguredAgents`) não a reescreve porque ela não está mais em
`resolveAuthorizedPackages`.

**Rationale**: `materializeAgentSkills` é write-only (escreve o que deveria
existir a partir do lockfile atual) e nunca apaga um arquivo que existia
mas não deveria mais — esse é exatamente o gap que a investigação
encontrou. A nova função fecha esse gap especificamente para o caso de
remoção, sem alterar o comportamento de `materializeAgentSkills` em si
(que continua correto para instalação/sincronização).

**Alternatives considered**:
- *Fazer `materializeAgentSkills` também limpar diretórios órfãos toda vez
  que roda*: rejeitado — mudaria o comportamento de um caminho já testado
  e usado tanto por install quanto por `configureAgents`/`agent add`,
  arriscando efeitos colaterais em cenários não relacionados à remoção
  (ex.: limpar uma skill que um usuário copiou manualmente para o
  diretório nativo do agente, fora do fluxo do Maia). Uma função dedicada,
  chamada apenas no fluxo de remoção, é mais previsível e com raio de
  mudança menor — consistente com o Princípio IV (mudanças pequenas e
  reversíveis).
