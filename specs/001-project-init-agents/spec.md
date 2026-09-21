# Feature Specification: Inicialização do Projeto & Configuração de Agentes

**Feature Branch**: `001-project-init-agents`

**Created**: 2026-09-21

**Status**: Draft

**Input**: Descrição do usuário: "Split de .specs/001-maia-cli.spec.md — o escopo de
inicialização e configuração de agentes: criação da estrutura de manifesto/lockfile do
Maia em um projeto, seleção de um ou mais clientes de agente de IA, e escrita da
configuração nativa de cada agente sem sobrescrever conteúdo que o Maia não gerencia."

## Clarifications

### Session 2026-09-21

- Q: Quando `maia init` rodar em um projeto cujo manifesto foi criado por uma versão de
  schema incompatível (mais antiga ou mais nova), o que deve acontecer? → A: Recusar
  continuar e reportar a incompatibilidade de schema, orientando o desenvolvedor a migrar
  ou usar uma versão compatível da CLI.
- Q: Quando `maia init` for executado em um ambiente não-interativo (ex.: CI, script) sem
  nenhum agente informado, o que o sistema deve fazer? → B: Falhar explicitamente,
  exigindo que agentes sejam passados via argumento em ambientes não-interativos.
- Q: Quando uma capacidade é removida e um diretório fallback fica vazio como resultado,
  o diretório vazio deve ser removido automaticamente? → A: Remover o diretório fallback
  automaticamente quando ficar vazio após uma remoção.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicializar um novo projeto (Priority: P1)

Como desenvolvedor, quero inicializar o Maia em um projeto para obter uma estrutura
reproduzível de capacidades e agentes sem criar arquivos de configuração manualmente.

**Why this priority**: Inicialização é o ponto de entrada para todo o resto do fluxo do
Maia; nada mais no sistema é alcançável sem ela.

**Independent Test**: Rodar o comando de init em um diretório de projeto não inicializado
e verificar que manifesto, lockfile e diretórios fallback de capacidades existem no
formato esperado, sem nenhum arquivo específico de agente criado quando nenhum agente
foi selecionado.

**Acceptance Scenarios**:

1. **Given** um diretório de projeto não inicializado, **When** o desenvolvedor roda o
   comando de init, **Then** o sistema cria o manifesto e o lockfile do projeto e reporta
   que a inicialização teve sucesso.
2. **Given** um diretório de projeto não inicializado, um terminal interativo, e nenhuma
   seleção de agente, **When** o init é concluído, **Then** nenhum diretório fallback de
   capacidade é criado até que uma capacidade daquele tipo seja de fato instalada.
3. **Given** um projeto já inicializado, **When** o desenvolvedor reexecuta o init sem
   novos agentes, **Then** o conteúdo existente do manifesto e do lockfile é preservado e
   nenhuma entrada duplicada é adicionada.
4. **Given** um ambiente não-interativo (ex.: CI ou um script) e nenhum argumento de
   agente, **When** o desenvolvedor roda o init, **Then** o sistema falha explicitamente
   e instrui o desenvolvedor a passar agentes como argumentos, sem fazer nenhuma
   alteração em arquivo.

---

### User Story 2 - Selecionar e configurar um ou mais agentes (Priority: P1)

Como desenvolvedor, quero escolher quais clientes de agente de IA (ex.: Claude, Copilot,
Cursor, Zed, Cline, Continue, Codex) meu projeto deve suportar, para configurá-los sem
editar manualmente os arquivos nativos de cada cliente.

**Why this priority**: Suporte multi-agente é a proposta de valor central — sem isso, o
Maia não oferece vantagem alguma sobre configurar cada agente manualmente.

**Independent Test**: Rodar o comando de init ou de adicionar agente com um nome de
agente explícito e verificar que apenas os arquivos de configuração nativos daquele
agente são criados, corretamente preenchidos, e idempotentes ao reexecutar.

**Acceptance Scenarios**:

1. **Given** um projeto sem nenhum agente configurado, **When** o desenvolvedor passa um
   ou mais nomes de agentes suportados para o comando de init, **Then** o sistema
   configura cada agente nomeado exatamente uma vez.
2. **Given** um projeto sem nenhum agente configurado, **When** o desenvolvedor roda o
   init sem argumentos de agente, **Then** o sistema oferece uma seleção interativa de
   agentes suportados.
3. **Given** um nome de agente suportado com aliases conhecidos, **When** o
   desenvolvedor usa um alias, **Then** o sistema resolve para o agente correto.
4. **Given** um nome de agente inválido ou não suportado, **When** o desenvolvedor tenta
   configurá-lo, **Then** o sistema rejeita a requisição com uma mensagem de uso e não
   faz nenhuma alteração de arquivo.
5. **Given** um projeto com agentes já configurados, **When** o desenvolvedor reexecuta o
   comando de configuração de agentes para os mesmos agentes, **Then** o sistema recria
   quaisquer arquivos nativos ausentes para aqueles agentes sem duplicar entradas
   existentes.

---

### User Story 3 - Preservar instruções escritas manualmente pelo desenvolvedor (Priority: P2)

Como desenvolvedor, quero que o Maia só toque na parte da configuração nativa do meu
agente que ele gerencia, para que minhas próprias instruções e configurações
personalizadas nunca sejam sobrescritas.

**Why this priority**: Perder configuração escrita manualmente quebraria a confiança na
ferramenta e causaria dano real à configuração existente de um desenvolvedor; isso deve
valer em toda escrita, mas é uma restrição sobre a User Story 2, não um fluxo alcançável
separadamente.

**Independent Test**: Adicionar conteúdo personalizado ao arquivo de instrução nativo de
um agente fora de qualquer marcador gerenciado pelo Maia, rodar a configuração de agente
novamente, e verificar que o conteúdo personalizado permanece intocado enquanto o bloco
gerenciado é atualizado.

**Acceptance Scenarios**:

1. **Given** um arquivo de instrução nativo de um agente com conteúdo fora dos
   marcadores gerenciados pelo Maia, **When** o agente é reconfigurado, **Then** o
   conteúdo fora dos marcadores é preservado sem alteração.
2. **Given** um agente cujo formato nativo usa múltiplos arquivos (por exemplo, um
   arquivo de configuração de MCP dedicado, um diretório de skills, e um arquivo de
   instruções), **When** o agente é configurado, **Then** cada local nativo recebe
   apenas o conteúdo apropriado a ele.

---

### User Story 4 - Listar agentes configurados (Priority: P3)

Como desenvolvedor, quero ver quais agentes estão atualmente configurados para meu
projeto, para poder auditar ou ajustar minha configuração.

**Why this priority**: Uma conveniência somente-leitura que apoia as outras histórias
mas não entrega capacidade sozinha.

**Independent Test**: Configurar dois agentes, rodar o comando de listagem de agentes, e
verificar que ambos aparecem com status preciso.

**Acceptance Scenarios**:

1. **Given** um projeto com dois agentes configurados, **When** o desenvolvedor lista os
   agentes, **Then** ambos os agentes configurados são exibidos.

### Edge Cases

- O que acontece quando o desenvolvedor seleciona um agente que ainda não tem um formato
  de configuração nativo reconhecido pelo sistema?
- Quando o init roda contra um manifesto escrito por uma versão de schema incompatível,
  o sistema se recusa a continuar e reporta a incompatibilidade, instruindo o
  desenvolvedor a migrar o manifesto ou usar uma versão compatível da CLI (sem
  auto-migração, sem passagem silenciosa).
- O que acontece quando um diretório fallback de capacidade existe mas fica vazio após
  uma capacidade ser removida — o diretório vazio é limpo?
- Quando o diretório do projeto não é gravável, o init ou a configuração de agente falha
  explicitamente com um erro identificando a falha de escrita e não deixa arquivos
  parcialmente escritos para trás.
- Em um ambiente não-interativo sem agentes fornecidos, o init falha explicitamente com
  orientação para passar agentes como argumentos, em vez de recorrer silenciosamente ao
  comportamento fallback-only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar um comando de inicialização que cria ou
  atualiza o manifesto e o lockfile do projeto na raiz do projeto, junto com o template
  de ambiente MCP necessário ao projeto.
- **FR-002**: O sistema DEVE criar diretórios fallback de capacidade (para skills, MCPs
  e tools) somente quando uma capacidade daquele tipo é de fato materializada, nunca
  especulativamente.
- **FR-003**: A inicialização DEVE aceitar um ou mais agentes alvo como argumentos e,
  quando nenhum for fornecido em um terminal interativo, DEVE oferecer uma seleção
  interativa de agente. Quando nenhum for fornecido em um ambiente não-interativo (ex.:
  CI ou um script), a inicialização DEVE falhar explicitamente, instruir o desenvolvedor
  a passar agentes como argumentos, e NÃO DEVE fazer nenhuma alteração de arquivo.
- **FR-004**: O sistema DEVE reconhecer um conjunto definido de clientes de agente
  suportados e seus aliases.
- **FR-005**: O sistema DEVE disponibilizar comandos para adicionar agentes a um
  projeto e para listar os agentes atualmente configurados.
- **FR-006**: Configurar um agente DEVE registrar o proxy do Maia, o perfil de
  autorização e as capacidades autorizadas nos locais de configuração nativos daquele
  agente, sem sobrescrever conteúdo fora do bloco que o Maia gerencia.
- **FR-007**: Cada agente suportado DEVE ser configurado usando seus próprios formatos e
  locais de arquivo nativos (por exemplo, arquivos separados para registro de MCP,
  descoberta de skills, e instruções livres), em vez de um formato único
  compartilhado.
- **FR-008**: Quando nenhum agente é selecionado, as capacidades DEVEM permanecer
  disponíveis apenas nos diretórios fallback do projeto, sem nenhuma configuração
  nativa de agente criada.
- **FR-009**: Reexecutar a inicialização ou a configuração de agente DEVE ser
  idempotente: NÃO DEVE duplicar entradas de manifesto, entradas de lockfile, ou blocos
  de configuração nativa.
- **FR-010**: Reexecutar a inicialização em um projeto com agentes já configurados, e
  sem novos agentes especificados, DEVE recriar quaisquer arquivos de configuração
  nativa ausentes para os agentes já configurados.
- **FR-011**: O sistema DEVE rejeitar um nome de agente não suportado ou mal escrito com
  uma mensagem de uso e NÃO DEVE fazer nenhuma alteração de arquivo nesse caso.
- **FR-012**: Quando o manifesto existente foi escrito por uma versão de schema
  incompatível (mais antiga ou mais nova do que a CLI em execução suporta), a
  inicialização DEVE se recusar a continuar, DEVE reportar a incompatibilidade de schema
  explicitamente, e DEVE instruir o desenvolvedor a migrar o manifesto ou usar uma
  versão compatível da CLI, sem fazer nenhuma alteração de arquivo.
- **FR-013**: Quando um diretório fallback de capacidade fica vazio como resultado da
  remoção de uma capacidade, o sistema DEVE remover esse diretório vazio
  automaticamente.
- **FR-014**: Quando a inicialização ou a configuração de agente não conseguir escrever
  no diretório do projeto (ex.: permissões de sistema de arquivos insuficientes), o
  sistema DEVE falhar explicitamente com um erro identificando a falha de escrita, e
  NÃO DEVE deixar para trás arquivos de manifesto, lockfile, ou configuração nativa de
  agente parcialmente escritos.

### Key Entities

- **Manifest (Manifesto)**: A declaração em nível de projeto dos agentes configurados,
  das capacidades instaladas, e de seu escopo de autorização; a fonte da verdade sobre o
  que um projeto pretende ter instalado.
- **Lockfile**: O registro reproduzível de versões exatas de capacidades, fontes e
  metadados derivados do manifesto, usado para restaurar ou verificar uma instalação
  (ver [[004-lockfile-integrity-ci]]).
- **Agent (Agente)**: Um cliente de codificação com IA suportado (Claude, Copilot,
  Cursor, Zed, Cline, Continue, Codex, etc.) com seu próprio formato de configuração
  nativo e locais de arquivo.
- **Managed Block (Bloco Gerenciado)**: A parte do arquivo de configuração nativo de um
  agente que o Maia possui e pode reescrever; conteúdo fora dela é preservado
  literalmente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um desenvolvedor consegue inicializar um novo projeto e configurar ao
  menos um agente em uma única invocação de comando, em menos de 30 segundos em uma
  máquina local típica.
- **SC-002**: Reexecutar a inicialização ou a configuração de agente qualquer número de
  vezes em um projeto inalterado produz zero entradas duplicadas e zero alterações em
  arquivos fora dos blocos gerenciados pelo Maia.
- **SC-003**: 100% dos agentes suportados recebem configuração apenas em seus locais de
  arquivo nativos documentados — sem vazamento de arquivo entre agentes.
- **SC-004**: Desenvolvedores conseguem identificar, sem ler código-fonte, quais agentes
  estão configurados para um projeto por meio de um único comando de listagem.

## Assumptions

- O conjunto de agentes inicialmente suportados é: Claude, VS Code/Copilot, Cursor, Zed,
  Cline, Continue, e OpenAI Codex; outros agentes podem ser adicionados depois sem
  alterar a intenção deste spec.
- "Formato de configuração nativo" para cada agente é o que a própria ferramenta desse
  agente lê (ex.: `.mcp.json` e `CLAUDE.md` para Claude, `.vscode/mcp.json` e
  `.github/copilot-instructions.md` para Copilot).
- Seleção interativa de agente só é oferecida em sessões de terminal interativas. CI e
  outros usos não-interativos DEVEM passar agentes explicitamente via argumentos;
  executar o init sem agentes em um ambiente não-interativo é tratado como um erro de
  uso, não como uma solicitação implícita de comportamento fallback-only.
- Este spec cobre apenas a superfície de configuração; o catálogo do que existe como
  capacidade e como é descoberto é coberto separadamente em
  [[002-capability-catalog-discovery]].
