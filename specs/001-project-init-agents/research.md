# Phase 0 Research: Inicialização do Projeto & Configuração de Agentes

Todos os campos do Technical Context foram resolvidos diretamente pela inspeção do
repositório (`package.json`, `tsconfig.json`, código existente em
`src/cli/commands/init/` e `src/agent/catalog/`) — nenhum marcador
`NEEDS CLARIFICATION` restou após o Setup, então este documento foca nas quatro
decisões de abordagem de implementação necessárias para fechar os gaps identificados
na seção Clarifications de [spec.md](./spec.md).

## Decision 1: Detectar "não-interativo sem agentes" vs. "usuário apertou Enter para pular"

**Decision**: Dividir o retorno único `[]` atual de `promptForAgentIds` em dois
resultados distintos que o chamador (`init-command.ts`) pode diferenciar: (a) não é
TTY → lançar/retornar um sinal de erro, (b) é TTY mas o usuário apertou Enter sem
entrada → retornar `[]` (skip explícito, preservando o comportamento fallback-only
para uso interativo, conforme a Assumption do spec "CI e uso não-interativo DEVEM
passar agentes explicitamente").

**Rationale**: `process.stdin.isTTY` / `process.stdout.isTTY` já são checados em
`prompt-for-agent-ids.ts` para decidir se deve ou não fazer o prompt; reaproveitar
essa mesma checagem no ponto de chamada de `init-command.ts` (em vez de duplicar a
detecção de TTY) mantém o gate não-interativo em um único lugar. A função existente
já retorna cedo quando não é TTY — a correção é tornar esse retorno antecipado
distinguível de "é TTY, usuário pulou" para que `init-command.ts` possa falhar
rapidamente em vez de silenciosamente cair no fallback-only.

**Alternatives considered**:
- *Lançar erro dentro do próprio `promptForAgentIds` quando não-TTY*: rejeitado
  porque mistura a responsabilidade de fazer o prompt com a decisão de política
  (falhar vs. fallback), tornando a função mais difícil de testar isoladamente e
  menos reutilizável se um futuro chamador quiser um comportamento não-TTY
  diferente.
- *Checar `process.stdin.isTTY` diretamente em `init-command.ts` antes de sequer
  chamar `promptForAgentIds`*: alternativa viável, funcionalmente equivalente à
  abordagem escolhida, mas duplica a checagem de TTY já presente em
  `prompt-for-agent-ids.ts`. A abordagem escolhida centraliza a checagem no módulo
  de prompt e expõe seu resultado por meio de uma distinção de tipo de retorno em
  vez de duplicar a checagem no ponto de chamada.

## Decision 2: Formato da checagem de compatibilidade de schema do manifesto

**Decision**: Adicionar um predicado puro `isManifestSchemaCompatible(maiaVersion:
string, runningCliVersion: string): boolean` usando a comparação de range semver
já implícita no valor padrão do `maiaVersion` do manifesto (formato `'^1.0.0'`),
chamado a partir de `normalizeManifest` (ou de seu chamador em
`agent-catalog-store.ts::loadManifest`) antes de mesclar o conteúdo parseado nos
padrões. Em caso de incompatibilidade, o chamador lança um erro tipado que
`init-command.ts` captura e reporta conforme o FR-012, sem fazer nenhuma alteração
de arquivo.

**Rationale**: O contrato do manifesto já carrega um campo `maiaVersion`
(`SourcesManifest.maiaVersion`) e `createDefaultManifest()` já o preenche como um
range semver (`'^1.0.0'`) — o campo existe mas nada atualmente o lê para um gate de
compatibilidade. Tornar a checagem uma função pura mantém-na testável de forma
independente (Princípio VIII da Constituição) e reutilizável tanto a partir de
`loadManifest` quanto de qualquer futuro caminho `verify`/`ci` que também precise
validar a compatibilidade do manifesto.

**Alternatives considered**:
- *Auto-migrar em caso de divergência de versão*: rejeitado — explicitamente
  descartado pela resposta de clarificação (Opção A escolhida em vez da Opção B na
  sessão de Clarifications do spec).
- *Ignorar campos desconhecidos silenciosamente (comportamento atual)*: rejeitado —
  é exatamente o comportamento que a clarificação substituiu.
- *Dependência de biblioteca semver completa*: rejeitado como desnecessário; o
  projeto tem zero dependências de runtime hoje (`package.json`
  `dependencies: {}`) e a comparação de versão necessária aqui (compatibilidade de
  versão principal contra um range `^x.y.z`) é simples o suficiente para
  implementar com uma pequena função pura, preservando a postura de zero
  dependências.

## Decision 3: Limpeza de diretório fallback vazio

**Decision**: Adicionar `removeEmptyFallbackDir(dirPath: string): void` em
`src/cli/shared/workspace/`, chamado após `removeMaterializedFile` em `remove.ts`
(caminhos de remoção de skill e tool) e após qualquer remoção de fallback de MCP. A
função checa `readdirSync(dirPath).length === 0` e só chama `rmdirSync(dirPath)`
nesse caso, engolindo `ENOENT` (já removido) mas não outros erros.

**Rationale**: Corresponde simetricamente ao princípio já existente do FR-002
("criado apenas quando materializado") — o FR-013 apenas fecha o gap do lado da
remoção. Reaproveitar os helpers existentes `resolveSkillsDir`/`resolveToolsDir` (e
adicionar um `resolveMcpFallbackDir` simétrico caso ainda não exista) mantém a
lógica de resolução de caminho em um único lugar em vez de re-derivar caminhos
`.maia/<kind>` no ponto de chamada.

**Alternatives considered**:
- *Sempre rodar `rmSync(dir, { recursive: true, force: true })` após toda
  remoção*: rejeitado — amplo demais; apagaria silenciosamente um diretório mesmo
  que uma instalação concorrente tivesse adicionado algo nele entre a remoção da
  dependência e o passo de limpeza. Checar `readdirSync().length === 0` primeiro é
  uma pré-condição mais estreita e segura.
- *Varredura em background/cron de diretórios vazios*: rejeitado — complexidade
  desnecessária para uma CLI síncrona; a limpeza pertence à mesma invocação de
  comando que causou o diretório ficar vazio.

## Decision 4: Escritas atômicas de manifesto/lockfile

**Decision**: Adicionar `writeFileAtomic(targetPath: string, content: string): void`
em `src/shared/fs/`, implementado como escrita em arquivo temporário no mesmo
diretório + `renameSync(tmpPath, targetPath)` (rename é atômico no mesmo sistema de
arquivos nas três plataformas alvo para este caso de uso).
`AgentCatalogStore.saveManifest` e `saveLock` chamam esse helper em vez de
`writeFileSync` diretamente.

**Rationale**: `renameSync` dentro do mesmo diretório é a forma padrão e livre de
dependências de obter substituição atômica de arquivo em Node.js — ou o arquivo
antigo permanece intacto ou o novo está totalmente presente; um crash ou `ENOSPC`
no meio da escrita só deixa um arquivo `.tmp` órfão, nunca um manifesto/lockfile
truncado. Isso satisfaz diretamente o FR-014 ("NÃO DEVE deixar para trás arquivos de
manifesto, lockfile, ou configuração nativa de agente parcialmente escritos") sem
adicionar uma dependência, mantendo a postura de zero dependências de runtime do
projeto. O mesmo helper é reutilizável para escritas de configuração nativa de
agente caso uma futura iteração estenda a atomicidade para lá (fora de escopo
deste plano — o escopo do FR-014, conforme os Edge Cases do spec, é falhas de
escrita de init/configuração de agente, não o ciclo de vida completo de
instalação/remoção coberto por [[003-capability-install-lifecycle]]).

**Alternatives considered**:
- *Envolver `writeFileSync` em try/catch e apagar o arquivo parcial em caso de
  erro*: rejeitado — não resolve totalmente o problema (um crash entre a escrita
  que falhou e o bloco `catch` de limpeza ainda deixa um arquivo truncado;
  `renameSync` não tem essa janela porque o arquivo temporário fica invisível sob
  o nome final até o rename ser concluído).
- *Usar um pacote npm de terceiros para escrita atômica (ex.: pacote
  `write-file-atomic`)*: rejeitado para preservar a postura de zero dependências
  de runtime do projeto; a primitiva necessária (escrever temp + rename) é
  algumas linhas com built-ins do Node.
