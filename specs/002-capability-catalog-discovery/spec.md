# Feature Specification: Catálogo de Capacidades & Descoberta

**Feature Branch**: `002-capability-catalog-discovery`

**Created**: 2026-09-21

**Status**: Draft

**Input**: Descrição do usuário: "Split de .specs/001-maia-cli.spec.md — o escopo de
catálogo, descoberta e gerenciamento de fontes: manter um inventário local de skills,
MCPs e tools, consultá-lo, consultar fontes remotas/Git configuradas, e lidar
graciosamente com resultados indisponíveis ou vazios."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listar capacidades instaladas (Priority: P1)

Como desenvolvedor, quero listar as skills, MCPs e tools atualmente conhecidas pelo meu
projeto, para ver o que está disponível sem ler arquivos de configuração manualmente.

**Why this priority**: Listagem é o ponto de entrada mais usado e de menor risco para o
catálogo, e serve de base para todos os outros fluxos de descoberta.

**Independent Test**: Com ao menos uma capacidade instalada, rodar o comando de
listagem e verificar que ela aparece com o tipo e os metadados de identificação
corretos; rodá-lo em um projeto vazio e verificar um resultado vazio, sem erro.

**Acceptance Scenarios**:

1. **Given** um projeto com capacidades instaladas, **When** o desenvolvedor roda o
   comando de listagem, **Then** todas as skills, MCPs e tools instaladas são exibidas
   agrupadas por tipo.
2. **Given** um projeto com capacidades instaladas, **When** o desenvolvedor solicita
   saída em JSON, **Then** o sistema emite um payload JSON válido contendo o mesmo
   inventário.
3. **Given** um projeto sem capacidades instaladas, **When** o desenvolvedor as lista,
   **Then** o sistema reporta um inventário vazio em vez de um erro.

---

### User Story 2 - Buscar no catálogo por consulta (Priority: P1)

Como desenvolvedor, quero buscar skills, MCPs ou tools por palavra-chave, para
encontrar capacidades relevantes sem conhecer identificadores exatos de antemão.

**Why this priority**: Descoberta baseada em consulta é a forma primária de
desenvolvedores encontrarem novas capacidades para instalar; é o principal motor de
valor de ter um catálogo.

**Independent Test**: Rodar um comando de listagem/busca com um termo de consulta
conhecido por dar match em uma capacidade local ou remota existente, e verificar que
resultados correspondentes são retornados com identificadores canônicos utilizáveis
para instalação.

**Acceptance Scenarios**:

1. **Given** uma consulta que dá match em uma ou mais capacidades conhecidas, **When**
   o desenvolvedor busca, **Then** resultados correspondentes são retornados com um
   identificador canônico para cada um.
2. **Given** uma consulta que não dá match em nada, **When** o desenvolvedor busca,
   **Then** o sistema declara claramente que nenhum resultado foi encontrado, em vez de
   retornar uma lista vazia indistinguível de um erro ou de "não buscado".
3. **Given** uma consulta, **When** o desenvolvedor solicita saída em JSON, **Then** os
   resultados são emitidos como JSON válido.

---

### User Story 3 - Gerenciar fontes Git (Priority: P2)

Como mantenedor, quero adicionar e listar as fontes Git nas quais meu projeto confia
para capacidades remotas, para que descoberta e instalação possam extrair de um
conjunto conhecido e auditável de origens.

**Why this priority**: Necessário para estender a descoberta além do catálogo local,
mas um projeto pode operar apenas com capacidades locais sem isso, por isso fica
abaixo de listagem/busca principal.

**Independent Test**: Adicionar uma fonte Git, listar fontes, e verificar que a nova
fonte aparece com sua referência e estado de confiança.

**Acceptance Scenarios**:

1. **Given** uma referência de fonte Git válida, **When** o mantenedor a adiciona,
   **Then** a fonte aparece na lista de fontes com sua referência e estado de
   confiança.
2. **Given** uma ou mais fontes configuradas, **When** o mantenedor lista as fontes,
   **Then** cada uma é exibida com informação suficiente para identificar sua origem e
   estado de confiança.

---

### User Story 4 - Tratamento gracioso de fontes remotas indisponíveis (Priority: P2)

Como desenvolvedor, quero que a descoberta se degrade graciosamente quando uma fonte
remota estiver inacessível, para que uma única fonte instável não me impeça de
encontrar capacidades em outro lugar.

**Why this priority**: Preocupação de confiabilidade que afeta a confiança na
ferramenta em condições normais de rede, mas só importa uma vez que fontes remotas
existam (User Story 3).

**Independent Test**: Configurar uma fonte intencionalmente inacessível junto com uma
acessível, rodar a descoberta, e verificar que os resultados vêm da fonte acessível
com uma indicação clara da falha — não um travamento silencioso ou crash.

**Acceptance Scenarios**:

1. **Given** uma fonte inacessível e uma fonte acessível, **When** o desenvolvedor roda
   a descoberta, **Then** resultados da fonte acessível são retornados e a falha da
   fonte indisponível é reportada.
2. **Given** todas as fontes configuradas estão inacessíveis, **When** o desenvolvedor
   roda a descoberta, **Then** o sistema reporta claramente que nenhum resultado foi
   encontrado e não fabrica resultados.

### Edge Cases

- O que acontece quando uma consulta retorna matches tanto do catálogo local quanto de
  uma fonte remota com o mesmo identificador?
- Como o sistema lida com uma referência de fonte Git sintaticamente inválida?
- O que acontece quando a resposta de uma fonte remota está malformada ou excede um
  tamanho esperado?
- Como o sistema lida com uma fonte que era confiável anteriormente mas foi
  desde então descredenciada ou revogada?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE manter um inventário local de skills, MCPs e tools
  instaladas.
- **FR-002**: O sistema DEVE disponibilizar comandos para listar o inventário local,
  filtrável por tipo de capacidade (skills, MCPs, tools, ou todos).
- **FR-003**: Comandos de listagem DEVEM aceitar uma consulta de texto livre e DEVEM
  suportar um modo de saída legível por máquina (JSON).
- **FR-004**: O sistema DEVE consultar fontes remotas configuradas para descobrir
  capacidades não presentes no inventário local, e DEVE usar identificadores canônicos
  ao apresentar resultados para instalação.
- **FR-005**: O sistema DEVE disponibilizar comandos para adicionar uma fonte Git e
  para listar fontes Git configuradas, incluindo a referência e o estado de confiança
  de cada fonte.
- **FR-006**: Quando um resultado remoto estiver indisponível, a descoberta DEVE
  tentar qualquer outra alternativa disponível e DEVE reportar claramente quando
  nenhum resultado foi encontrado, em vez de retornar nada silenciosamente de forma
  indistinguível de "não buscado".
- **FR-007**: Descoberta e listagem NÃO DEVEM reportar um match bem-sucedido quando
  nenhuma capacidade de fato satisfaz a consulta.

### Key Entities

- **Catalog (Catálogo)**: O inventário local de skills, MCPs e tools conhecidas por um
  projeto, independentemente de cada entrada estar atualmente instalada.
- **Source (Fonte)**: Uma origem Git configurada (ou outro provedor) que a descoberta
  consulta em busca de capacidades remotas, carregando uma referência e um estado de
  confiança.
- **Capability Identifier (Identificador de Capacidade)**: O nome canônico,
  qualificado pela fonte, usado para referenciar de forma inequívoca uma skill, MCP,
  ou tool durante a descoberta e a instalação (ver
  [[003-capability-install-lifecycle]]).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desenvolvedores conseguem encontrar uma capacidade conhecida por busca de
  palavra-chave em menos de 5 segundos em um catálogo local aquecido.
- **SC-002**: 100% dos casos de "nenhum resultado encontrado" são reportados de forma
  distinta de condições de erro e de resultados vazios bem-sucedidos.
- **SC-003**: Uma única fonte remota inacessível nunca impede a descoberta de retornar
  resultados disponíveis de outras fontes configuradas.
- **SC-004**: Todo resultado retornado por busca ou listagem carrega um identificador
  canônico que pode ser usado diretamente para instalação sem consulta adicional.

## Assumptions

- "Fontes remotas" nesta iteração significa fontes baseadas em Git; outros tipos de
  provedor podem ser adicionados depois sem alterar a intenção deste spec.
- Estado de confiança para uma fonte é um atributo simples (ex.: confiável/não
  confiável) em vez de um modelo de permissões completo; autorização granular é
  coberta pelas restrições de agente/LLM em [[003-capability-install-lifecycle]] e
  [[005-mcp-server-security]].
- Consultas ao catálogo local não requerem acesso à rede; apenas a descoberta remota
  requer.
