# Feature Specification: Lockfile, Integridade & Restauração em CI

**Feature Branch**: `004-lockfile-integrity-ci`

**Created**: 2026-09-21

**Status**: Draft

**Input**: Descrição do usuário: "Split de .specs/001-maia-cli.spec.md — o escopo de
lockfile, verificação, restauração em CI, e construção de contexto: gerar um lockfile
reproduzível, verificá-lo contra artefatos materializados, restaurar um ambiente
não-interativamente em CI, e construir/exibir contexto de desenvolvimento e de LLM."

## Clarifications

### Session 2026-09-22

- Q: `maia ci` deve restaurar do lockfile em disco ou regenerá-lo a partir do
  manifesto antes de restaurar (como o `maia install` faz, conforme
  [[003-capability-install-lifecycle]])? → C: Restaurar do lockfile em disco,
  mas falhar explicitamente se ele estiver desatualizado em relação ao
  manifesto — preserva "o manifesto é a única fonte de verdade" sem permitir
  que CI restaure silenciosamente um ambiente divergente do que o manifesto
  descreve.
- Q: O lockfile precisa ser byte-a-byte idêntico ao reexecutar `maia lock` sem
  mudanças, mesmo exigindo remover o campo de data de geração? → A: Remover
  `generatedAt` do lockfile — nada o lê hoje, e sua ausência torna o lockfile
  byte-a-byte determinístico, eliminando diffs espúrios em um arquivo
  versionado.
- Q: O edge case de "duas entradas do lockfile com requisitos de dependência
  conflitantes" deve ser removido, já que não há grafo de dependências no
  modelo de dados? → A: Remover — o lockfile indexa pacotes por `tipo:nome`
  (duas entradas não colidem) e nenhum campo representa dependência entre
  capacidades; mesmo precedente já estabelecido em
  [[003-capability-install-lifecycle]].
- Q: Uma restauração em CI interrompida no meio da materialização deve
  reverter o que já escreveu, ou pode deixar estado parcial já que o pipeline
  roda de novo? → A: Reverter — a garantia de rollback estabelecida em
  [[003-capability-install-lifecycle]] vale também para a restauração em CI;
  uma única regra ("nenhuma operação deixa estado parcial") vale para todo o
  sistema.
- Q: Um lockfile de versão de schema incompatível deve ser recusado
  explicitamente, espelhando o gate de manifesto da feature 001? → A: Sim —
  recusar reportando a versão do lockfile e a suportada, em vez de deixar
  surgir um erro genérico de integridade que aponta enganosamente para
  adulteração.

### Session 2026-09-22 (continuação)

- Q: Quando o lockfile registra um pacote sem hash de conteúdo, o verify deve
  recusar a verificação como incompleta ou aceitar qualquer arquivo
  não-vazio? → A: Recusar — um verify que declara sucesso sobre artefatos que
  não conseguiu de fato verificar dá falsa sensação de segurança; recusar
  torna o SC-002 verdadeiro e expõe lockfiles gerados de forma incompleta.
- Q: `context show` sem contexto construído deve falhar com orientação ou
  construir automaticamente? → A: Falhar com orientação explícita para rodar
  o comando de build primeiro, espelhando o `verify` — um comando de leitura
  não deve escrever arquivos no projeto silenciosamente.
- Q: Uma fonte inalcançável por falha de rede durante a restauração em CI deve
  ser distinguida de uma capacidade que não existe mais na fonte? → A: Sim,
  distinguir na mensagem (indisponibilidade da fonte vs. capacidade ausente),
  sem retry automático — a distinção muda a ação do operador entre reexecutar
  o pipeline e corrigir a configuração.
- Q: O verify deve reportar todos os problemas encontrados de uma vez ou parar
  no primeiro? → A: Reportar todos em uma única execução e então falhar —
  evita o ciclo corrigir-rodar-descobrir-o-próximo, especialmente custoso em
  CI onde cada reexecução consome minutos.
- Q: Quando o comando de lock produz conteúdo idêntico ao lockfile em disco, o
  arquivo deve ser reescrito ou deixado intocado? → A: Deixar intocado —
  preserva o timestamp de modificação, evitando disparar rebuilds em
  ferramentas de watch, e torna o determinismo observável além do conteúdo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar ou atualizar o lockfile (Priority: P1)

Como mantenedor, quero gerar ou atualizar um lockfile que capture versões exatas,
fontes e autorizações, para que o estado de instalação atual possa ser reproduzido
depois.

**Why this priority**: O lockfile é o artefato do qual toda outra história neste spec
depende; sem ele não há nada para verificar ou restaurar.

**Independent Test**: Com capacidades instaladas, rodar o comando de lock e verificar
que o lockfile resultante registra metadados de versão, fonte e autorização para cada
capacidade instalada; rodar o comando de lock duas vezes sem mudança e verificar que
os dois arquivos resultantes são byte-a-byte idênticos.

**Acceptance Scenarios**:

1. **Given** um projeto com capacidades instaladas, **When** o mantenedor roda o
   comando de lock, **Then** o lockfile é criado ou atualizado com metadados de
   versão, fonte e autorização suficientes para reproduzir a instalação.
2. **Given** um lockfile existente e nenhuma mudança de capacidade desde que foi
   gerado, **When** o comando de lock é reexecutado, **Then** o conteúdo do lockfile
   permanece byte-a-byte inalterado e o arquivo não é reescrito — seu timestamp de
   modificação é preservado.

---

### User Story 2 - Verificar a integridade do lockfile (Priority: P1)

Como mantenedor, quero verificar que o lockfile corresponde aos artefatos
materializados em disco, para poder confiar em uma instalação antes de depender dela.

**Why this priority**: Verificação é o que torna o lockfile confiável em vez de
apenas descritivo; é a checagem de segurança direta na qual mantenedores e CI
dependem.

**Independent Test**: Modificar um artefato materializado para que ele divirja do
lockfile, rodar verify, e confirmar que ele falha explicitamente; rodar verify sem
nenhum lockfile presente e confirmar que ele falha com orientação para gerar um.

**Acceptance Scenarios**:

1. **Given** um lockfile que corresponde a todos os artefatos materializados, **When**
   o mantenedor roda verify, **Then** a verificação é bem-sucedida.
2. **Given** um lockfile e um artefato materializado que foi modificado ou está
   ausente, **When** o mantenedor roda verify, **Then** a verificação falha e
   identifica a divergência ou o artefato ausente explicitamente.
3. **Given** um projeto sem lockfile, **When** o mantenedor roda verify, **Then** o
   sistema falha e instrui o mantenedor a gerar um lockfile primeiro.
4. **Given** um lockfile que registra um pacote materializado sem hash de conteúdo,
   **When** o mantenedor roda verify, **Then** a verificação falha indicando que o
   lockfile está incompleto, em vez de passar por o arquivo ser não-vazio.
5. **Given** uma instalação com múltiplos artefatos divergentes e ausentes ao mesmo
   tempo, **When** o mantenedor roda verify, **Then** todos os problemas são
   reportados em uma única execução antes da falha, não apenas o primeiro.

---

### User Story 3 - Restaurar um ambiente em CI (Priority: P1)

Como operador de CI, quero restaurar a instalação completa de capacidades de um
projeto a partir do lockfile não-interativamente, para que pipelines possam validar e
reproduzir o ambiente sem passos manuais.

**Why this priority**: Esta é a razão primária da existência do lockfile em um
contexto automatizado — reprodutibilidade em CI é um caso de uso de primeira classe,
não uma reflexão tardia.

**Independent Test**: Em um checkout limpo com apenas um lockfile válido presente,
rodar o comando de ci e verificar que metadados/hashes são validados antes de
qualquer artefato ser materializado, o ambiente é totalmente restaurado, e agentes são
sincronizados, tudo sem prompts.

**Acceptance Scenarios**:

1. **Given** um lockfile válido, **When** o comando de ci roda, **Then** metadados e
   hashes são validados antes de qualquer artefato ser materializado.
2. **Given** um lockfile com metadados ou hashes inválidos, **When** o comando de ci
   roda, **Then** ele falha antes de materializar qualquer arquivo.
3. **Given** um lockfile válido, **When** o comando de ci é concluído com sucesso,
   **Then** o ambiente é restaurado e todos os agentes configurados são
   sincronizados, sem nenhum prompt interativo em nenhum momento.
4. **Given** um lockfile que está desatualizado em relação ao manifesto, **When** o
   comando de ci roda, **Then** ele falha explicitamente instruindo a rodar o
   comando de lock, sem materializar nenhum artefato e sem regenerar o lockfile
   silenciosamente.

---

### User Story 4 - Construir e inspecionar contexto (Priority: P3)

Como desenvolvedor, quero construir e visualizar contexto de desenvolvimento e de LLM
derivado do estado atual de capacidades do projeto, para inspecionar o que um agente
veria sem rodar o agente propriamente dito.

**Why this priority**: Uma conveniência de diagnóstico/inspeção construída sobre um
lockfile e um sistema de instalação funcionais; útil mas não obrigatória para a
garantia central de reprodutibilidade.

**Independent Test**: Rodar o comando de construção de contexto, depois o comando de
exibição de contexto, e verificar que o contexto exibido reflete as capacidades
atualmente instaladas e autorizadas.

**Acceptance Scenarios**:

1. **Given** capacidades instaladas, **When** o desenvolvedor constrói o contexto,
   **Then** artefatos de contexto de desenvolvimento e de LLM são gerados.
2. **Given** contexto construído, **When** o desenvolvedor solicita exibi-lo, **Then**
   o contexto solicitado é exibido com precisão.
3. **Given** um projeto onde o contexto nunca foi construído, **When** o
   desenvolvedor solicita exibi-lo, **Then** o comando falha orientando a rodar o
   comando de construção primeiro, sem gerar nenhum artefato de contexto.

### Edge Cases

- Quando verify ou a restauração em CI encontram um lockfile gerado por uma versão
  de schema incompatível (mais antiga ou mais nova), o sistema recusa a operação
  reportando a versão declarada pelo lockfile e a versão suportada, em vez de
  reportar um erro genérico de integridade.
- Quando uma fonte registrada no lockfile não está acessível durante a restauração
  em CI, o sistema reporta isso como indisponibilidade da fonte, distinguindo-o
  explicitamente do caso em que a fonte responde mas a capacidade não existe mais
  nela; nenhuma nova tentativa automática é feita.
- Requisitos de dependência conflitantes entre entradas do lockfile não se aplicam:
  o lockfile indexa pacotes por `tipo:nome` (duas entradas não podem colidir) e
  nenhum campo representa dependência entre capacidades (ver Clarifications e
  [[003-capability-install-lifecycle]]).
- Quando o contexto nunca foi construído, o comando de exibição falha com uma
  orientação explícita para rodar o comando de construção primeiro — não constrói
  o contexto automaticamente nem reporta um erro cru de arquivo ausente.
- Quando uma restauração em CI é interrompida no meio da materialização, o sistema
  reverte os artefatos já materializados, de forma que a restauração interrompida
  não deixe estado parcial — mesma garantia estabelecida para instalação e remoção
  em [[003-capability-install-lifecycle]].

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar um comando de lock que gera ou atualiza
  um lockfile contendo versões, fontes, autorizações, e metadados suficientes para
  reproduzir a instalação atual. O lockfile NÃO DEVE conter nenhum campo cujo valor
  mude entre execuções sem que o conteúdo instalado tenha mudado (ex.: uma data de
  geração), de forma que reexecutar o comando de lock sobre um estado inalterado
  produza um arquivo byte-a-byte idêntico. Quando o conteúdo gerado for idêntico ao
  lockfile já existente em disco, o sistema NÃO DEVE reescrever o arquivo,
  preservando seu timestamp de modificação.
- **FR-002**: O sistema DEVE disponibilizar um comando de verify que valida o
  lockfile contra os artefatos materializados e DEVE falhar explicitamente quando uma
  divergência ou artefato ausente for detectado. Um pacote materializado cujo
  lockfile não registra um hash de conteúdo DEVE fazer o verify falhar, indicando
  que o lockfile está incompleto e precisa ser regerado — verificar apenas que o
  arquivo não está vazio NÃO é suficiente para declarar sucesso. Quando múltiplos
  problemas existirem, o verify DEVE reportar todos eles em uma única execução
  antes de falhar, em vez de parar no primeiro.
- **FR-003**: Rodar verify sem nenhum lockfile presente DEVE falhar e DEVE instruir o
  usuário a rodar o comando de lock.
- **FR-004**: O sistema DEVE disponibilizar um comando de ci não-interativo que
  valida metadados e hashes do lockfile, falha antes de materializar qualquer
  artefato se a validação falhar, restaura o ambiente a partir do lockfile em caso de
  sucesso, e sincroniza todos os agentes configurados.
- **FR-005**: O fluxo de restauração em CI NÃO DEVE exigir nenhuma entrada interativa
  em nenhum passo.
- **FR-006**: O sistema DEVE disponibilizar comandos para construir artefatos de
  contexto de desenvolvimento/LLM e para exibir contexto previamente construído.
  Exibir contexto que nunca foi construído DEVE falhar com uma orientação explícita
  para rodar o comando de construção primeiro; o comando de exibição NÃO DEVE
  construir o contexto automaticamente.
- **FR-007**: Geração de lockfile, verificação, e restauração em CI DEVEM usar
  metadados consistentes de forma que um lockfile produzido pelo comando de lock seja
  sempre uma entrada válida para o verify e para a restauração em CI.
- **FR-008**: A restauração em CI DEVE usar o lockfile em disco como entrada, e
  DEVE falhar explicitamente quando esse lockfile estiver desatualizado em relação
  ao manifesto — instruindo o desenvolvedor a rodar o comando de lock e versionar o
  resultado. A restauração em CI NÃO DEVE regenerar o lockfile silenciosamente a
  partir do manifesto, ao contrário do comando de instalação sem argumentos (ver
  [[003-capability-install-lifecycle]]), porque um lockfile desatualizado em um
  pipeline é um erro que deve ser reportado, não corrigido em silêncio.
- **FR-009**: Quando a restauração em CI for interrompida antes de concluir a
  materialização de todos os artefatos, o sistema DEVE reverter os artefatos já
  materializados, de forma que nenhuma restauração interrompida deixe o projeto em
  estado parcial — mesma garantia exigida para instalação e remoção em
  [[003-capability-install-lifecycle]].
- **FR-010**: Quando o lockfile declarar uma versão de schema incompatível com a
  suportada pela CLI em execução, verify e a restauração em CI DEVEM recusar a
  operação explicitamente, reportando ambas as versões e orientando o desenvolvedor
  a migrar o lockfile ou usar uma versão compatível da CLI, sem materializar nenhum
  artefato. O erro NÃO DEVE ser reportado como divergência de integridade.
- **FR-011**: Quando a restauração em CI não conseguir alcançar a fonte de uma
  capacidade, o sistema DEVE reportar a falha como indisponibilidade da fonte,
  distinta do caso em que a fonte responde mas não contém mais a capacidade. O
  sistema NÃO DEVE tentar novamente automaticamente — a distinção existe para que o
  operador saiba se deve reexecutar o pipeline ou corrigir a configuração.

### Key Entities

- **Lockfile**: O registro reproduzível de versões exatas de capacidades, fontes, e
  autorizações (entidade compartilhada, pertencente conceitualmente ao manifesto em
  [[001-project-init-agents]] mas gerada/verificada aqui). Não representa
  dependências entre capacidades — o modelo de dados não tem grafo de dependências.
- **Verification Result (Resultado de Verificação)**: O resultado de comparar um
  lockfile contra artefatos materializados, incluindo qualquer divergência ou
  arquivo ausente identificado.
- **Context Artifact (Artefato de Contexto)**: Um snapshot gerado de contexto de
  desenvolvimento ou voltado a LLM derivado do estado atual de capacidades e
  autorizações.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um pipeline de CI consegue restaurar um ambiente de projeto completo a
  partir de um lockfile sozinho, com zero prompts interativos, em uma única
  invocação de comando.
- **SC-002**: 100% das execuções de verify contra uma instalação adulterada ou
  incompleta falham antes de o desenvolvedor tomar qualquer ação adicional, com a
  divergência específica identificada. Nenhum artefato materializado é declarado
  verificado sem que seu conteúdo tenha sido efetivamente comparado contra um hash
  registrado.
- **SC-003**: A geração de lockfile é determinística: reexecutar o lock sem mudanças
  subjacentes produz um lockfile byte-a-byte idêntico.
- **SC-004**: A restauração em CI nunca materializa um único artefato sequer quando a
  validação de metadados, hash, ou versão de schema do lockfile falha, nem quando o
  lockfile está desatualizado em relação ao manifesto.
- **SC-005**: Uma restauração em CI interrompida a qualquer momento nunca deixa
  artefatos parcialmente materializados — 100% das interrupções resultam em reversão
  completa ou conclusão completa, nunca um meio-termo observável.

## Assumptions

- Validação de "metadados e hashes" se refere a checagens de integridade (ex.: hashes
  de conteúdo) registradas por capacidade no lockfile, não a assinatura criptográfica
  do próprio lockfile.
- Artefatos de contexto são saídas derivadas e regeneráveis e não são tratados como
  fonte da verdade ao lado do manifesto/lockfile.
- A restauração em CI assume que acesso à rede às fontes configuradas está disponível
  quando uma capacidade ainda não está em cache local; restauração em CI totalmente
  offline está fora de escopo para esta iteração.
