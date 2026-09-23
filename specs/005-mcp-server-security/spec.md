# Feature Specification: Servidor MCP & Segurança de Runtime

**Feature Branch**: `005-mcp-server-security`

**Created**: 2026-09-21

**Status**: Draft

**Input**: Descrição do usuário: "Split de .specs/001-maia-cli.spec.md — o escopo de
servidor MCP e segurança de runtime: descobrir/adicionar/sincronizar MCPs, expor
capacidades instaladas via stdio com validação de protocolo, isolamento de ambiente
para processos de MCP, tratamento de segredos, e guardrails para ações destrutivas."

## Clarifications

### Session 2026-09-22

- Q: Quando uma ação destrutiva é bloqueada, o que exatamente permite que ela prossiga mesmo assim? → A: Nenhum override nesta iteração; o bloqueio é absoluto e a única forma de permitir uma ação é editar a deny list configurada.
- Q: Quais operações do Maia devem passar pelo guardrail antes de executar? → A: O comando de consulta do guardrail, a validação pre-commit e o gate de CI, mais o comando de remoção de capacidade, que consulta o guardrail antes de apagar arquivos materializados.
- Q: Como o guardrail decide que uma ação é destrutiva — pelo caminho do arquivo alvo, ou pelo tipo de operação que a solicitou? → A: Apenas pelo caminho do alvo casado contra a deny list; as categorias de ação destrutiva reduzem-se a exclusão e sobrescrita de arquivo, derivadas do contexto do chamador.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Descobrir, adicionar e sincronizar MCPs (Priority: P1)

Como desenvolvedor, quero descobrir MCPs disponíveis, adicionar um ao meu projeto, e
mantê-lo sincronizado com o registro do projeto, para que minha configuração de MCP
permaneça consistente com o que está declarado.

**Why this priority**: Este é o ponto de entrada para colocar qualquer MCP em um
estado funcional; sem ele não há nada para o servidor (User Story 2) expor.

**Independent Test**: Descobrir um MCP por consulta, adicioná-lo, e depois rodar
sync e verificar que o registro do projeto e o estado registrado do MCP
correspondem.

**Acceptance Scenarios**:

1. **Given** uma consulta que dá match em um MCP conhecido, **When** o desenvolvedor
   busca por MCPs, **Then** MCPs correspondentes são retornados.
2. **Given** um MCP descoberto, **When** o desenvolvedor o adiciona, **Then** ele é
   registrado no registro de MCPs do projeto.
3. **Given** um projeto com MCPs registrados, **When** o desenvolvedor roda sync,
   **Then** o estado registrado e o registro do projeto são reconciliados para
   corresponder.

---

### User Story 2 - Expor capacidades instaladas via o servidor MCP (Priority: P1)

Como usuário de um agente de IA, quero consultar as capacidades que o Maia instalou
através de um servidor MCP padrão, para poder usá-las a partir do meu agente sem
configuração duplicada.

**Why this priority**: Esta é a superfície primária de runtime de todo o sistema — o
ponto onde capacidades instaladas de fato se tornam utilizáveis por um agente.

**Independent Test**: Iniciar o servidor MCP via stdio, enviar uma requisição válida
de listagem de capacidades, e verificar que capacidades instaladas são retornadas;
verificar que descoberta dinâmica e identificação de agente se comportam conforme
configurado.

**Acceptance Scenarios**:

1. **Given** um servidor MCP rodando com capacidades instaladas, **When** um cliente
   o consulta via stdio, **Then** as capacidades instaladas e autorizadas são
   retornadas.
2. **Given** descoberta dinâmica habilitada, **When** um cliente consulta o servidor,
   **Then** capacidades descobríveis no momento da consulta são incluídas, não apenas
   as conhecidas na inicialização do servidor.
3. **Given** um cliente que se identifica como um agente específico, **When** ele
   consulta o servidor, **Then** apenas capacidades autorizadas para aquele agente
   são retornadas.

---

### User Story 3 - Rejeitar mensagens de protocolo inválidas ou incompatíveis (Priority: P1)

Como mantenedor, quero que o servidor MCP valide mensagens JSON-RPC estruturalmente e
rejeite revisões de protocolo incompatíveis explicitamente, para que clientes
malformados ou incompatíveis falhem ruidosamente em vez de causar comportamento
indefinido.

**Why this priority**: Robustez de protocolo é uma linha de base de correção e
segurança para qualquer servidor exposto a clientes externos; falhas aqui seriam
silenciosas e difíceis de diagnosticar.

**Independent Test**: Enviar uma mensagem JSON-RPC estruturalmente inválida e uma
mensagem declarando uma revisão de protocolo incompatível, e verificar que ambas são
rejeitadas explicitamente em vez de silenciosamente ignoradas ou causando um crash.

**Acceptance Scenarios**:

1. **Given** uma mensagem JSON-RPC estruturalmente inválida, **When** ela é enviada
   ao servidor, **Then** o servidor a rejeita explicitamente com um erro
   identificável.
2. **Given** uma mensagem declarando uma revisão de protocolo incompatível, **When**
   ela é enviada ao servidor, **Then** o servidor a rejeita explicitamente em vez de
   tentar uma reinterpretação silenciosa.

---

### User Story 4 - Isolar o ambiente de processo do MCP (Priority: P1)

Como mantenedor preocupado com segurança, quero que processos de MCP herdem apenas as
variáveis de ambiente que realmente precisam, para que um MCP comprometido ou com mau
comportamento não consiga ler segredos não relacionados do ambiente pai.

**Why this priority**: Um controle concreto de raio de explosão (blast radius); sem
ele, todo processo de MCP teria acesso ambiental ao ambiente pai completo,
minando toda a postura de segurança.

**Independent Test**: Configurar um MCP que declara um conjunto específico de
variáveis de ambiente obrigatórias, iniciá-lo, e verificar de dentro do processo (ou
via um harness de teste controlado) que apenas as variáveis necessárias ao runtime e
as explicitamente declaradas estão presentes.

**Acceptance Scenarios**:

1. **Given** um MCP que declara um conjunto específico de variáveis de ambiente
   obrigatórias, **When** seu processo inicia, **Then** ele recebe apenas aquelas
   variáveis mais as variáveis necessárias para o próprio runtime funcionar.
2. **Given** um MCP que não declara nenhuma variável de ambiente, **When** seu
   processo inicia, **Then** ele não recebe segredos não relacionados presentes no
   ambiente pai.

---

### User Story 5 - Proteger segredos de ponta a ponta (Priority: P1)

Como mantenedor, quero que segredos nunca apareçam no terminal, no controle de
versão, ou em arquivos além das variáveis que um MCP explicitamente referencia, para
minimizar o risco de exposição de credenciais.

**Why this priority**: Tratamento de segredos é uma garantia de segurança
não-negociável que perpassa toda outra história deste spec; um único vazamento aqui
mina todas elas.

**Independent Test**: Configurar um MCP exigindo uma credencial, instalá-lo e
rodá-lo, e verificar que o valor da credencial nunca aparece na saída do comando, em
logs, ou em qualquer arquivo versionado — apenas o nome/referência da variável
aparece.

**Acceptance Scenarios**:

1. **Given** um MCP exigindo uma credencial, **When** ele é configurado, **Then** o
   valor da credencial nunca é impresso no terminal.
2. **Given** um projeto com credenciais de MCP configuradas, **When** o repositório é
   inspecionado, **Then** nenhum valor de segredo está presente em nenhum arquivo
   versionado — apenas referências de variável.

---

### User Story 6 - Proteger ações destrutivas (Priority: P1)

Como mantenedor, quero que ações destrutivas e alterações de arquivo passem por
guardrails automatizados em vez de depender apenas da intenção do modelo ou do
usuário, para que operações destrutivas acidentais ou maliciosas sejam bloqueadas
por política.

**Why this priority**: Esta é uma rede de segurança em nível de sistema; sem ela,
toda outra capacidade (instalar, remover, sync) poderia causar dano irreversível sem
nenhuma checagem independente.

**Independent Test**: Disparar uma ação classificada como destrutiva e verificar que
ela é bloqueada pelo guardrail em vez de ser concluída com base apenas na intenção
declarada do requisitante.

**Acceptance Scenarios**:

1. **Given** uma ação classificada como destrutiva cujo alvo casa com a deny list
   configurada, **When** ela é tentada, **Then** a ação é bloqueada.
2. **Given** uma ação classificada como destrutiva cujo alvo não casa com nenhum
   padrão da deny list configurada, **When** ela é tentada, **Then** a ação prossegue
   e é auditável depois.
3. **Given** uma ação destrutiva bloqueada, **When** o requisitante tenta prosseguir
   assim mesmo, **Then** não existe nenhum override em runtime que a libere — a
   única forma de permiti-la é alterar a deny list configurada.
4. **Given** uma remoção de capacidade cujo arquivo materializado casa com a deny
   list, **When** a remoção é tentada, **Then** ela é bloqueada antes de qualquer
   arquivo ser apagado.

### Edge Cases

- O que acontece quando um cliente MCP se desconecta no meio de uma requisição?
- Como o servidor se comporta quando dois clientes se identificam como o mesmo agente
  simultaneamente?
- O que acontece quando uma variável de ambiente obrigatória declarada está ausente
  no início do processo do MCP?
- Como o sistema lida com uma configuração de guardrail que está, ela própria,
  malformada?
- O que acontece quando a descoberta dinâmica encontra uma capacidade que não está
  autorizada para o agente que está consultando?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar comandos para descobrir MCPs, adicionar
  um MCP ao projeto, e sincronizar MCPs registrados com o registro do projeto.
- **FR-002**: O sistema DEVE disponibilizar um servidor MCP que expõe capacidades
  instaladas via stdio.
- **FR-003**: O servidor MCP DEVE suportar descoberta dinâmica opcional de
  capacidades no momento da consulta e DEVE suportar identificação do agente
  consultante para escopar resultados às autorizações daquele agente.
- **FR-004**: O servidor MCP DEVE validar estruturalmente mensagens JSON-RPC
  recebidas e DEVE rejeitar explicitamente mensagens que estão malformadas ou
  declaram uma revisão de protocolo incompatível.
- **FR-005**: Processos de MCP DEVEM herdar apenas as variáveis de ambiente exigidas
  pelo próprio runtime mais aquelas explicitamente declaradas por aquele MCP — sem
  herança ambiental do ambiente pai completo.
- **FR-006**: Segredos NÃO DEVEM ser exibidos na saída do terminal, NÃO DEVEM ser
  commitados no repositório, e NÃO DEVEM ser escritos em nenhum arquivo além das
  variáveis explicitamente referenciadas por MCPs instalados.
- **FR-007**: Ações destrutivas e alterações de arquivo DEVEM passar por guardrails
  automatizados (como uma deny list e validação pre-commit) e NÃO DEVEM depender
  apenas da intenção declarada pelo modelo ou pelo usuário.
- **FR-008**: O guardrail DEVE ser aplicado em quatro pontos: um comando de consulta
  sob demanda, a validação pre-commit, o gate de integração contínua, e o comando de
  remoção de capacidade, que DEVE consultar o guardrail antes de apagar qualquer
  arquivo materializado.
- **FR-009**: Uma ação destrutiva bloqueada NÃO DEVE ter nenhum mecanismo de override
  em runtime; alterar a deny list configurada é a única forma de permitir uma ação
  que ela bloqueia.
- **FR-010**: A decisão do guardrail DEVE ser tomada casando o caminho do arquivo
  alvo contra a deny list configurada. As ações destrutivas reconhecidas são a
  exclusão e a sobrescrita de arquivo, derivadas do contexto do chamador; o guardrail
  NÃO DEVE exigir que o chamador classifique a operação por conta própria.

### Key Entities

- **MCP Server (Servidor MCP)**: O processo baseado em stdio que expõe as
  capacidades instaladas e autorizadas de um projeto a clientes de agente que se
  conectam.
- **Protocol Message (Mensagem de Protocolo)**: Uma requisição/resposta JSON-RPC
  trocada entre um cliente e o servidor MCP, sujeita a validação estrutural e de
  versão.
- **Guardrail**: Uma checagem de política automatizada que casa o caminho do arquivo
  alvo contra uma deny list configurada, aplicada nos quatro pontos do FR-008, e que
  deve permitir a ação antes de ela prosseguir. Sem override em runtime (FR-009).
- **Environment Scope (Escopo de Ambiente)**: O conjunto mínimo de variáveis de
  ambiente que um processo de MCP tem permissão de herdar ao iniciar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das mensagens estruturalmente inválidas ou incompatíveis em
  protocolo enviadas ao servidor MCP são rejeitadas com um erro identificável, com
  zero falhas silenciosas.
- **SC-002**: 100% dos processos de MCP iniciados pelo sistema não recebem nenhuma
  variável de ambiente fora do conjunto exigido pelo runtime e do seu próprio
  conjunto declarado.
- **SC-003**: Zero valores de segredo aparecem na saída do terminal, em logs, ou em
  arquivos versionados ao longo de um ciclo completo de instalação e execução
  envolvendo MCPs com credenciais.
- **SC-004**: 100% das ações classificadas como destrutivas são bloqueadas a menos
  que a deny list configurada não case com seu alvo, verificado nos quatro pontos de
  aplicação do FR-008 — incluindo a remoção de capacidade, onde o bloqueio ocorre
  antes de qualquer arquivo ser apagado.

## Assumptions

- "Ações destrutivas" nesta iteração são exclusões irreversíveis de arquivo e
  sobrescritas forçadas, identificadas pelo caminho do alvo (FR-010). Operações
  sinalizadas como destrutivas pela definição de um comando entram no escopo quando
  houver um comando que as produza; nenhuma existe hoje além da remoção de
  capacidade.
- O transporte do servidor MCP nesta iteração é apenas stdio; transportes expostos
  em rede (HTTP/SSE) estão fora de escopo.
- Identificação de agente no nível do protocolo é baseada em informação que o
  cliente conectado fornece voluntariamente; este spec não exige autenticação
  criptográfica de cliente.
- Este spec assume que MCPs já foram instalados e registrados conforme
  [[003-capability-install-lifecycle]]; ele cobre a descoberta/sincronização e a
  exposição em runtime desses MCPs, não a mecânica de sua instalação inicial.
