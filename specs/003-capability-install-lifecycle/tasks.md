---

description: "Lista de tarefas para a implementação da feature"
---

# Tasks: Ciclo de Vida de Instalação de Capacidades

**Input**: Documentos de design em `/specs/003-capability-install-lifecycle/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/install-rollback.md, contracts/remove-command.md,
contracts/install-command.md, quickstart.md

**Tests**: Testes são obrigatórios nesta feature — a Constituição do projeto
declara Test-First como Princípio I, NON-NEGOTIABLE. Cada tarefa de correção
abaixo tem uma tarefa de teste correspondente que deve ser escrita e falhar
antes da implementação.

**Organization**: As tarefas são agrupadas pela User Story do spec.md que
exercitam. Os dois itens do Summary de plan.md mapeiam assim:

- O helper de rollback (`withRollback`, FR-008) é **Foundational**: é
  consumido por 6 pontos de integração espalhados entre US1 (install de
  skill/tool), US3 (install de MCP), e US5 (os 3 branches de remove) —
  tratá-lo como pré-requisito bloqueante evita implementar a mesma lógica
  de coordenação 6 vezes.
- **US1** (Instalar uma capacidade, P1) ganha a integração do rollback nos
  fluxos de instalação de skill e tool.
- **US3** (MCPs com credenciais e transportes, P2) ganha a integração do
  rollback no fluxo de instalação de MCP e o predicado
  `agentSupportsTransport` (FR-004) integrado a `collectAgentMcpEntries`.
- **US5** (Remover uma capacidade, P2) ganha os 3 gaps de FR-006 (tool
  removal, MCP removal multi-agente, limpeza de cópia nativa de skill) e a
  integração do rollback nos 3 branches de remove.
- **US2** (Restringir LLM), **US4** (Tools registro local), **US6**
  (Restaurar do lockfile) não têm gap identificado pela investigação nem
  pela clarificação — são baseline já implementado e testado; nenhuma
  tarefa nova para elas nesta iteração.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: A qual user story esta tarefa pertence
- Caminhos de arquivo exatos são incluídos nas descrições

## Path Conventions

Projeto único (CLI): `src/`, `tests/` na raiz do repositório — conforme
confirmado em plan.md → Project Structure.

## Phase 1: Setup

**Purpose**: Nenhuma inicialização de projeto nova é necessária — a
estrutura já existe. Esta fase só confirma a baseline de testes antes de
qualquer mudança.

- [X] T001 Rodar `npm test` e `npm run typecheck` para confirmar que a
  suíte está verde antes de qualquer mudança desta feature (baseline de
  referência para comparar depois).

**Checkpoint**: Baseline confirmada — as fases seguintes podem começar.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implementar o helper de rollback `withRollback` (Decision 1 em
research.md, contracts/install-rollback.md) e o predicado
`agentSupportsTransport` (Decision 2). Ambos são consumidos por múltiplas
user stories.

**⚠️ CRITICAL**: Nenhuma tarefa de US1, US3, ou US5 pode começar até esta
fase estar completa.

- [X] T002 [P] Escrever teste para `withRollback` em
  `tests/shared/install-rollback.test.ts` (novo arquivo), cobrindo: (a)
  todos os passos completam com sucesso → retorna os resultados, nenhum
  `undo` é chamado; (b) o passo K falha → `undo` dos passos 1..K-1 é
  chamado em ordem reversa, o erro original de K é relançado com
  `code`/mensagem preservados, o `undo` de K não é chamado; (c) um `undo`
  que ele mesmo lança durante a reversão não impede os `undo`s restantes de
  rodar, e o erro relançado ao final ainda é o erro original do passo que
  falhou (não o erro do `undo`). Referencia
  contracts/install-rollback.md. Este teste DEVE falhar antes da T004 ser
  implementada.
- [X] T003 [P] Escrever teste para `agentSupportsTransport` em
  `tests/shared/agent-supports-transport.test.ts` (novo arquivo), cobrindo:
  (a) todo `AgentTarget` real hoje existente no projeto (agentRegistry)
  retorna `true` para todos os 5 transportes (`stdio`, `http`, `sse`, `ws`,
  `npx`); (b) um `AgentTarget` de teste construído com um campo
  `supportedTransports` explícito retorna `false` para um transporte fora
  dessa lista. Este teste DEVE falhar antes da T005 ser implementada.
- [X] T004 [P] Implementar `withRollback<T>(steps: RollbackStep<T>[]):
  Promise<T[]>` em `src/cli/shared/rollback/install-rollback.ts`, conforme
  o comportamento descrito em contracts/install-rollback.md (execução em
  ordem, reversão em ordem reversa em caso de falha, `undo` com falha
  logado via `console.error` mas não bloqueante, erro original relançado).
  Faz T002 passar.
- [X] T005 [P] Implementar `agentSupportsTransport(target: AgentTarget,
  transport: MCPConfig['transport']): boolean` em
  `src/agent/agents/inject/agent-supports-transport.ts` como função pura:
  retorna `true` quando `target.supportedTransports` é `undefined` (todo
  agente atual), ou checa se `transport` está incluído na lista quando o
  campo está presente, conforme Decision 2 em research.md. Adicionar o
  campo opcional `supportedTransports?: readonly MCPConfig['transport'][]`
  a `AgentTarget` em
  `src/agent/agents/contracts/agent-target.ts`. Faz T003 passar.
- [X] T006 Rodar `npm run typecheck` e confirmar zero erros após T002–T005.
  Depende de T004, T005.

**Checkpoint**: `withRollback` e `agentSupportsTransport` disponíveis e
testados. US1, US3, e US5 podem começar.

---

## Phase 3: User Story 1 - Instalar uma capacidade (Priority: P1) 🎯 MVP

**Goal**: A instalação de skill e tool nunca deixa artefato órfão sem
entrada de manifesto, nem entrada de manifesto sem lockfile correspondente,
mesmo quando interrompida por uma falha no meio do caminho.

**Independent Test**: Simular uma falha em `store.buildLock()` durante
`installSkill`/o branch de tool em `install-command.ts` (mockar o método
para lançar após a materialização ter ocorrido) e verificar que o arquivo
materializado é removido e o manifesto não contém a entrada, conforme
Behavior 1 de contracts/install-command.md.

### Tests for User Story 1 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da
> implementação**

- [X] T007 [P] [US1] Escrever teste em `tests/cli/install.test.ts` (arquivo
  existente, novo caso): simular falha durante `installSkill` (mockar/injetar
  falha no último passo, após a materialização ter ocorrido) e verificar
  que (a) o arquivo materializado no diretório fallback de skills não
  existe após a falha; (b) `manifest.skills[name]` não existe após a
  falha; (c) o erro original é propagado ao chamador de `installCommand`.
  Referencia Behavior 1 de contracts/install-command.md. Este teste DEVE
  falhar antes da T009 ser implementada.
- [X] T008 [P] [US1] Escrever teste em `tests/cli/install.test.ts` (mesmo
  arquivo, novo caso): mesmo cenário de T007 mas para o branch de tool em
  `install-command.ts` — simular falha após `materializeTool` ter ocorrido
  e verificar que o arquivo materializado é removido e
  `manifest.tools[name]` não existe. Este teste DEVE falhar antes da T010
  ser implementada.

### Implementation for User Story 1

- [X] T009 [US1] Reescrever `installSkill` em
  `src/cli/install/skill/install-skill.ts` para usar `withRollback` (de
  T004): passo 1 = materializar (`materializeSkill`/
  `materializeRemoteSkill`), `undo` = `removeMaterializedFile` no path
  resolvido; passo 2 = `store.addDependency('skill', ...)`, `undo` =
  `store.removeDependency('skill', name)`; passo 3 = `store.buildLock()`,
  `undo` = `store.saveLock(lockCapturadoAntesDoPasso1)` (capturado via
  `store.loadLock()` no início da função, antes de qualquer passo rodar).
  Depende de T004. Faz T007 passar.
- [X] T010 [US1] Envolver o branch de tool em
  `src/cli/commands/install/install-command.ts` com `withRollback`,
  seguindo o mesmo padrão de 3 passos de T009 (materializar via
  `materializeTool` → `addDependency` → `buildLock`), com os `undo`s
  simétricos. Depende de T004. Faz T008 passar.

**Checkpoint**: Neste ponto, a User Story 1 deve estar totalmente funcional
e testável de forma independente — `npm test -- tests/cli/install.test.ts`
deve passar.

---

## Phase 4: User Story 3 - Instalar MCPs com credenciais e transportes (Priority: P2)

**Goal**: A instalação de MCP nunca deixa estado parcial em caso de falha
(mesma garantia de US1, aplicada ao fluxo de MCP), e um MCP com transporte
incompatível com um agente específico pula a sincronização daquele agente
com aviso, sem falhar a instalação inteira.

**Independent Test**: Simular falha durante `installMcp` e verificar
rollback completo (Behavior 1 de contracts/install-command.md); configurar
um `AgentTarget` de teste com `supportedTransports` restrito e verificar
que a instalação de um MCP com transporte fora dessa lista pula aquele
agente com aviso mas conclui com sucesso (Behavior 2).

### Tests for User Story 3 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da
> implementação**

- [X] T011 [P] [US3] Escrever teste em `tests/cli/install.test.ts` (mesmo
  arquivo de T007/T008, novo caso): simular falha durante `installMcp`
  (após `ensureMcpEnvFileEntries` e `addDependency` terem ocorrido, falha
  em `buildLock`) e verificar que `manifest.mcps[name]` não existe após a
  falha. Este teste DEVE falhar antes da T013 ser implementada.
- [X] T012 [P] [US3] Escrever teste em
  `tests/tools/collect-agent-mcp-entries.test.ts` (novo arquivo): construir
  um `AgentTarget` de teste com `supportedTransports: ['stdio']`, instalar
  um MCP com `transport: 'http'` autorizado para esse agente, e verificar
  que `collectAgentMcpEntries` (a) omite a entrada daquele MCP para aquele
  agente especificamente; (b) ainda inclui a entrada `maia` proxy e
  quaisquer outros MCPs/skills compatíveis; (c) emite um aviso via
  `console.warn` identificando o agente e o MCP pulado. Referencia
  Behavior 2 de contracts/install-command.md. Este teste DEVE falhar antes
  da T014 ser implementada.

### Implementation for User Story 3

- [X] T013 [US3] Reescrever `installMcp` em
  `src/cli/install/mcp/install-mcp.ts` para usar `withRollback` (de T004):
  passo 1 = `ensureMcpEnvFileEntries`, `undo` = no-op documentado (não
  remove variáveis pré-existentes de instalações anteriores, apenas não
  reverte a adição — ver contracts/install-rollback.md); passo 2 =
  `store.addDependency('mcp', ...)`, `undo` = `store.removeDependency`;
  passo 3 = `store.buildLock()`, `undo` = restaurar o lock capturado antes
  do passo 1. Depende de T004. Faz T011 passar.
- [X] T014 [US3] Integrar `agentSupportsTransport` (de T005) em
  `collectAgentMcpEntries`
  (`src/agent/agents/inject/collect-agent-mcp-entries.ts`): antes de mapear
  cada pacote MCP autorizado para uma entrada, checar
  `agentSupportsTransport(target, pkg.vscode.transport)`; quando `false`,
  emitir `console.warn` identificando `target.name` e `pkg.name`, e omitir
  essa entrada do array retornado (sem lançar, sem impedir as demais
  entradas). Depende de T005. Faz T012 passar.

**Checkpoint**: Neste ponto, as User Stories 1 e 3 devem funcionar de forma
independente — `npm test -- tests/cli/install.test.ts
tests/tools/collect-agent-mcp-entries.test.ts` deve passar.

---

## Phase 5: User Story 5 - Remover uma capacidade (Priority: P2)

**Goal**: `maia rm` limpa completamente skill, tool, e MCP de todos os
locais materializados (fallback, cópias nativas de agente, configuração
nativa de todos os agentes configurados), e nunca deixa estado parcial em
caso de falha durante a remoção.

**Independent Test**: Instalar e remover uma tool, verificar que o
artefato materializado desaparece (Behavior 1 de
contracts/remove-command.md); instalar um MCP para múltiplos agentes,
remover, verificar que desaparece de todas as configurações nativas
(Behavior 2); instalar uma skill, verificar cópia nativa, remover,
verificar que a cópia nativa desaparece (Behavior 3).

### Tests for User Story 5 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que FALHAM antes da
> implementação**

- [X] T015 [P] [US5] Criar `tests/cli/remove.test.ts` (novo arquivo) com o
  caso: instalar uma tool via `installCommand`, verificar que o arquivo
  materializado existe em `.maia/tools/`, chamar `removeCommand(['tool',
  name], ...)`, e verificar que (a) o arquivo materializado não existe
  mais; (b) `manifest.tools[name]` não existe; (c) se era a única tool, o
  diretório `.maia/tools/` também foi removido. Referencia Behavior 1 de
  contracts/remove-command.md. Este teste DEVE falhar antes da T018 ser
  implementada (não há branch de tool em `remove.ts` hoje).
- [X] T016 [P] [US5] No mesmo arquivo `tests/cli/remove.test.ts`, adicionar
  o caso: configurar dois agentes (ex.: `claude`, `copilot`), instalar um
  MCP autorizado para ambos, verificar que aparece na config nativa de
  ambos, chamar `removeCommand(['mcp', name], ...)`, e verificar que o MCP
  não aparece mais em **nenhuma** das duas configurações nativas.
  Referencia Behavior 2. Este teste DEVE falhar antes da T019 ser
  implementada (hoje só `.vscode/mcp.json` é ressincronizado).
- [X] T017 [P] [US5] No mesmo arquivo `tests/cli/remove.test.ts`, adicionar
  o caso: configurar um agente com `skillsDir` (ex.: `claude`), instalar
  uma skill, verificar que a cópia nativa existe em
  `.claude/skills/<name>/SKILL.md`, chamar `removeCommand(['skill', name],
  ...)`, e verificar que o diretório `.claude/skills/<name>/` não existe
  mais. Referencia Behavior 3. Este teste DEVE falhar antes da T020 ser
  implementada (hoje `materializeAgentSkills` nunca apaga cópias órfãs).

### Implementation for User Story 5

- [X] T018 [US5] Adicionar o branch `if (kind === 'tool')` em
  `src/cli/commands/remove.ts`, espelhando o branch de skill: resolver o
  path materializado via `dependency?.path` (fallback:
  `resolveToolTargetPath`-equivalente para `.mjs`/`.ts`), chamar
  `removeMaterializedFile`, e chamar `removeEmptyFallbackDir` em
  `resolveToolsDir(store)`. Conforme Decision 3 em research.md. Faz T015
  passar.
- [X] T019 [US5] Trocar `store.syncVsCodeMcp()` por
  `restoreConfiguredAgents(store)` no branch `if (kind === 'mcp')` de
  `src/cli/commands/remove.ts`, conforme Decision 4 em research.md. Faz
  T016 passar.
- [X] T020 [US5] Implementar `removeNativeAgentSkillCopies(store:
  AgentCatalogStore, name: string): void` em
  `src/cli/commands/agent/remove-native-agent-artifacts.ts`: para cada
  agente resolvido via `resolveTargets(Object.keys(manifest.agents))` que
  declara `skillsDir`, resolver `path.resolve(target.skillsDir(cwd), name)`
  e remover esse diretório recursivamente se existir, conforme Decision 5
  em research.md.
- [X] T021 [US5] Chamar `removeNativeAgentSkillCopies` (de T020) no branch
  `if (kind === 'skill')` de `src/cli/commands/remove.ts`, antes de
  `restoreConfiguredAgents` ser chamado ao final do comando (adicionar essa
  chamada final se ainda não existir — necessária para os 3 branches
  reconvergirem na mesma sincronização multi-agente pós-remoção). Depende
  de T020, T019. Faz T017 passar.
- [X] T022 [P] [US5] Escrever teste em `tests/cli/remove.test.ts` (mesmo
  arquivo): simular falha durante a remoção de uma skill (mockar
  `store.buildLock` para lançar após `store.removeDependency` ter
  ocorrido) e verificar que a entrada do manifesto é restaurada (rollback),
  conforme Behavior 4 de contracts/remove-command.md. Este teste DEVE
  falhar antes da T023 ser implementada.
- [X] T023 [US5] Envolver os 3 branches de `src/cli/commands/remove.ts`
  (skill/tool/mcp) com `withRollback` (de T004), seguindo o mesmo padrão
  de 3 passos usado em install (`removeDependency` → `buildLock` → remoção
  de artefato), com os `undo`s simétricos (restaurar dependência no
  manifesto, restaurar lock capturado, recriar o artefato removido a
  partir do path original — não aplicável ao passo de remoção de artefato
  em si, que é sempre o último passo e portanto nunca precisa de `undo`
  próprio). Depende de T004, T018, T019, T021. Faz T022 passar.

**Checkpoint**: Neste ponto, todas as user stories em escopo (US1, US3,
US5) devem funcionar de forma independente e testável —
`npm test -- tests/cli/remove.test.ts` deve passar isoladamente.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Validação final cruzando todas as correções e conformidade com
a Constituição do projeto.

- [X] T024 [P] Rodar `npm run typecheck` e confirmar zero erros após todas
  as mudanças das Fases 2–5, conforme Princípio I da Constituição.
- [X] T025 [P] Rodar `npm run check:architecture` e confirmar que todos os
  arquivos novos (T004, T005, T020) têm exatamente um símbolo
  arquitetural documentado por arquivo, conforme Princípio V da
  Constituição.
- [X] T026 Executar manualmente os Cenários 1–3 de quickstart.md (remoção
  de tool/MCP/skill) em um diretório de projeto temporário fora do
  repositório, confirmando que o comportamento observado corresponde
  exatamente ao descrito em contracts/remove-command.md.
- [X] T027 Rodar `npm test` completo e confirmar que a suíte inteira passa,
  incluindo os testes pré-existentes de `tests/cli/install.test.ts`
  (regressão de US2/US4/US6 já implementadas), conforme Princípio I da
  Constituição.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente.
- **Foundational (Phase 2)**: Depende da conclusão do Setup — BLOQUEIA
  User Story 1, 3, e 5 (todas consomem `withRollback`; US3 também consome
  `agentSupportsTransport`).
- **User Story 1 (Phase 3)**: Depende da conclusão da Foundational. Sem
  dependência de US3/US5.
- **User Story 3 (Phase 4)**: Depende da conclusão da Foundational. Sem
  dependência de US1 — pode rodar em paralelo se houver capacidade de
  equipe (arquivos diferentes: `install-skill.ts`/branch de tool em
  `install-command.ts` para US1 vs. `install-mcp.ts`/
  `collect-agent-mcp-entries.ts` para US3).
- **User Story 5 (Phase 5)**: Depende da conclusão da Foundational. Sem
  dependência de US1/US3 no nível de arquivos tocados (`remove.ts` é
  disjunto de `install-skill.ts`/`install-mcp.ts`/`install-command.ts`),
  mas reaproveita o mesmo padrão de rollback estabelecido em US1/US3 —
  recomendado implementar depois delas para reaproveitar o padrão já
  validado, embora não seja uma dependência técnica rígida.
- **Polish (Final Phase)**: Depende da conclusão de US1, US3, e US5.

### User Story Dependencies

- **User Story 1 (P1)**: Depende da Foundational. Sem dependência de
  outras stories.
- **User Story 3 (P2)**: Depende da Foundational. Sem dependência de US1.
- **User Story 5 (P2)**: Depende da Foundational. Sem dependência técnica
  de US1/US3 (arquivos disjuntos), mas compartilha o mesmo padrão de uso
  de `withRollback` — pode ser implementada em paralelo ou depois, à
  escolha da equipe.

### Within Each User Story

- Testes DEVEM ser escritos e FALHAR antes da implementação.
- Reescrita de fluxo (envolver com `withRollback`) só depois que o helper
  (T004) e, quando aplicável, `agentSupportsTransport` (T005) existirem e
  estiverem testados.

### Parallel Opportunities

- T002 e T003 (testes Foundational) podem rodar em paralelo — arquivos
  diferentes.
- T004 e T005 (implementação Foundational) podem rodar em paralelo, após
  seus respectivos testes existirem.
- T007 e T008 (testes de US1) podem rodar em paralelo — mesmo arquivo mas
  casos de teste independentes; T011 e T012 (testes de US3) também; T015,
  T016, T017 (testes de US5) também.
- **Uma vez que a Foundational (Phase 2) esteja completa, US1 (Phase 3),
  US3 (Phase 4), e US5 (Phase 5) podem rodar totalmente em paralelo** se
  houver três desenvolvedores/agentes disponíveis, pois tocam conjuntos de
  arquivos disjuntos.

---

## Parallel Example: Foundational (Phase 2)

```bash
# Lançar os dois testes juntos:
Task: "Escrever teste para withRollback em tests/shared/install-rollback.test.ts"
Task: "Escrever teste para agentSupportsTransport em tests/shared/agent-supports-transport.test.ts"

# Depois, lançar as duas implementações juntas:
Task: "Implementar withRollback em src/cli/shared/rollback/install-rollback.ts"
Task: "Implementar agentSupportsTransport em src/agent/agents/inject/agent-supports-transport.ts"
```

## Parallel Example: User Story 1 vs. 3 vs. 5

```bash
# Com três desenvolvedores/agentes, após a Foundational estar completa:
Developer A: T007 → T008 → T009 → T010                    (User Story 1)
Developer B: T011 → T012 → T013 → T014                    (User Story 3)
Developer C: T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023  (User Story 5)
```

---

## Implementation Strategy

### MVP First (Foundational + User Story 1 Only)

1. Completar a Phase 1: Setup.
2. Completar a Phase 2: Foundational (CRÍTICO — bloqueia US1, US3, US5).
3. Completar a Phase 3: User Story 1.
4. **PARAR e VALIDAR**: rodar `npm test -- tests/cli/install.test.ts` e
   confirmar que passa isoladamente.
5. Neste ponto, o gap mais crítico do FR-008 (rollback) já está fechado
   para o fluxo de instalação mais usado (skill/tool), mesmo sem US3/US5.

### Incremental Delivery

1. Completar Setup + Foundational → `withRollback` e
   `agentSupportsTransport` disponíveis e testados.
2. Adicionar User Story 1 → testar independentemente → fecha o rollback
   para skill/tool install.
3. Adicionar User Story 3 → testar independentemente → fecha o rollback
   para MCP install e o skip de agente incompatível.
4. Adicionar User Story 5 → testar independentemente → fecha os 3 gaps de
   remoção (FR-006) e o rollback para remove.
5. Rodar a fase de Polish → validar toda a suíte e os cenários de
   quickstart.md juntos.

### Parallel Team Strategy

Com três desenvolvedores/agentes disponíveis:

1. Equipe completa Setup + Foundational junto (bloqueante para todos).
2. Uma vez que a Foundational esteja pronta:
   - Desenvolvedor A: User Story 1 (T007–T010)
   - Desenvolvedor B: User Story 3 (T011–T014)
   - Desenvolvedor C: User Story 5 (T015–T023)
3. As stories completam e se integram de forma independente — arquivos
   tocados não se sobrepõem entre A, B, e C.

---

## Notes

- Tarefas `[P]` = arquivos diferentes, sem dependências entre si.
- O rótulo `[Story]` mapeia a tarefa à user story específica para
  rastreabilidade; T001–T006 e T024–T027 não carregam rótulo de story por
  serem, respectivamente, Setup/Foundational compartilhados e
  Polish/validação cruzada.
- Cada user story deve ser completável e testável de forma independente.
- Verificar que os testes falham antes de implementar.
- Fazer commit após cada tarefa ou grupo lógico, conforme Princípio IV da
  Constituição.
- Parar em qualquer checkpoint para validar a story isoladamente.
- Evitar: tarefas vagas, conflitos no mesmo arquivo, dependências entre
  stories que quebrem a independência.
