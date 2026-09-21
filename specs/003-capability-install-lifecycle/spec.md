# Feature Specification: Ciclo de Vida de Instalação de Capacidades

**Feature Branch**: `003-capability-install-lifecycle`

**Created**: 2026-09-21

**Status**: Draft

**Input**: Descrição do usuário: "Split de .specs/001-maia-cli.spec.md — o escopo de
instalação e remoção: instalar skills, MCPs e tools com opções de versão/fonte/escopo
de LLM, materializá-las nos locais fallback e nativos de agente, remover capacidades, e
restaurar o conjunto completo a partir do lockfile."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instalar uma capacidade (Priority: P1)

Como desenvolvedor, quero instalar uma skill, MCP, ou tool pelo nome, para que meu
projeto e os agentes configurados ganhem essa capacidade sem posicionamento manual de
arquivos.

**Why this priority**: Instalação é a ação central de todo o sistema — todos os
outros fluxos existem para apoiá-la ou protegê-la.

**Independent Test**: Instalar uma skill conhecida pelo nome e verificar que ela é
materializada no diretório fallback de skills e, se um agente estiver configurado, no
local nativo daquele agente, com manifesto e lockfile atualizados de acordo.

**Acceptance Scenarios**:

1. **Given** um identificador de capacidade válido e descobrível, **When** o
   desenvolvedor a instala, **Then** manifesto, lockfile, artefatos materializados, e
   agentes configurados são todos atualizados de forma consistente.
2. **Given** um comando de instalação com uma versão explícita, **When** a instalação
   roda, **Then** a versão especificada é instalada em vez da mais recente disponível.
3. **Given** um comando de instalação com uma fonte explícita, **When** a instalação
   roda, **Then** a capacidade é buscada daquela fonte em vez da padrão.
4. **Given** uma skill instalada, **When** a instalação é concluída, **Then** a skill é
   materializada no diretório fallback de skills e, para cada agente configurado que
   suporta skills, no local nativo de skills daquele agente.

---

### User Story 2 - Restringir uma capacidade a LLMs específicos (Priority: P1)

Como administrador, quero restringir quais LLMs/agentes estão autorizados a usar uma
capacidade instalada, para que runtimes não confiáveis ou irrelevantes não consigam
acessá-la.

**Why this priority**: Escopo de autorização é um controle relevante para segurança
que deve estar disponível no momento da instalação, não adicionado depois.

**Independent Test**: Instalar uma capacidade com escopo restrito a um agente
específico e verificar que o manifesto registra esse escopo; verificar que a
configuração de um agente com escopo diferente não recebe a capacidade.

**Acceptance Scenarios**:

1. **Given** um comando de instalação sem escopo de LLM especificado, **When** a
   instalação é concluída, **Then** a capacidade é autorizada para todos os agentes
   configurados por padrão.
2. **Given** um comando de instalação com uma lista explícita de LLMs, **When** a
   instalação é concluída, **Then** apenas os LLMs nomeados estão autorizados a usar
   a capacidade.

---

### User Story 3 - Instalar MCPs com credenciais e transportes (Priority: P2)

Como desenvolvedor, quero que o transporte e as configurações declaradas de um MCP
sejam respeitados durante a instalação, para que o MCP funcione corretamente nos meus
agentes configurados sem eu precisar escrever detalhes de conexão manualmente.

**Why this priority**: Mecânicas específicas de MCP são um subconjunto real das
instalações mas com escopo mais estreito que o fluxo geral de instalação (User Story
1).

**Independent Test**: Instalar um MCP que declara uma variável de credencial
obrigatória e um transporte específico, e verificar que a configuração nativa do
agente reflete aquele transporte e que a variável de credencial é registrada sem que
seu valor seja exposto.

**Acceptance Scenarios**:

1. **Given** uma entrada de catálogo de MCP declarando um transporte e configuração,
   **When** ele é instalado, **Then** a configuração instalada corresponde ao que o
   catálogo declara.
2. **Given** uma entrada de catálogo de MCP declarando uma variável de credencial
   obrigatória, **When** ele é instalado, **Then** a variável é registrada como
   obrigatória sem que seu valor seja persistido ou exibido pelo próprio comando de
   instalação.
3. **Given** um MCP instalado, **When** a instalação é concluída, **Then** a
   configuração nativa de cada agente configurado é sincronizada para incluir o MCP.

---

### User Story 4 - Restringir tools ao registro local (Priority: P2)

Como mantenedor preocupado com segurança, quero que tools só possam ser instaladas a
partir do registro local, nunca de uma fonte remota, para que a execução de tools não
possa ser redirecionada para código não verificado.

**Why this priority**: Uma restrição de segurança mais estreita sobre o comportamento
geral de instalação; importante, mas só relevante uma vez que a instalação (User Story
1) exista.

**Independent Test**: Tentar instalar uma tool com uma fonte remota explícita e
verificar que a operação é rejeitada com uma mensagem clara.

**Acceptance Scenarios**:

1. **Given** uma requisição de instalação de tool especificando uma fonte remota,
   **When** o desenvolvedor a executa, **Then** o sistema rejeita a operação e declara
   que tools só aceitam o registro local.
2. **Given** uma requisição de instalação de tool sem fonte especificada, **When** ela
   aponta para uma entrada no registro local, **Then** a instalação prossegue
   normalmente.

---

### User Story 5 - Remover uma capacidade (Priority: P2)

Como desenvolvedor, quero remover uma skill, MCP, ou tool instalada, para manter o
conjunto de capacidades do meu projeto preciso conforme as necessidades mudam.

**Why this priority**: A contraparte natural da instalação; necessária para um ciclo
de vida completo mas só exercitada depois que algo foi instalado.

**Independent Test**: Remover uma capacidade previamente instalada e verificar que ela
desaparece do manifesto, do estado derivado do lockfile, e dos locais materializados.

**Acceptance Scenarios**:

1. **Given** uma capacidade instalada, **When** o desenvolvedor a remove, **Then** o
   manifesto e o estado de instalação derivado não a referenciam mais.
2. **Given** uma capacidade materializada tanto em um diretório fallback quanto em
   locais nativos de agente, **When** ela é removida, **Then** ela é removida de todos
   esses locais.

---

### User Story 6 - Restaurar capacidades a partir do lockfile (Priority: P1)

Como operador, quero que rodar install sem nenhuma capacidade específica nomeada
restaure tudo registrado no lockfile, para poder reproduzir um ambiente sem
reinstalar manualmente cada item.

**Why this priority**: Esta é a garantia de reprodutibilidade que torna o lockfile
útil na prática (ex.: após um checkout limpo); é tão fundamental quanto a User Story
1.

**Independent Test**: Apagar todos os artefatos de capacidade materializados mas
manter o lockfile, rodar install sem argumentos, e verificar que toda capacidade do
lockfile é restaurada e todo agente configurado é ressincronizado.

**Acceptance Scenarios**:

1. **Given** um lockfile válido e nenhum artefato materializado, **When** o
   desenvolvedor roda install sem nenhuma capacidade especificada, **Then** toda
   capacidade registrada no lockfile é restaurada.
2. **Given** uma restauração bem-sucedida, **When** ela é concluída, **Then** todos os
   agentes configurados são sincronizados para refletir as capacidades restauradas.

### Edge Cases

- O que acontece quando uma instalação é requisitada para um identificador de
  capacidade que não existe em nenhuma fonte configurada?
- Como o sistema lida com a instalação de uma capacidade cuja versão declarada entra
  em conflito com uma versão já instalada exigida por outra coisa?
- O que acontece quando a remoção é requisitada para uma capacidade que não está
  instalada?
- Como o sistema lida com uma instalação parcialmente concluída (ex.: processo
  interrompido durante a materialização)?
- O que acontece quando o transporte declarado de um MCP não é suportado por um
  determinado agente?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar um comando de instalação que aceita um
  identificador de capacidade, com opções opcionais de versão, fonte, e escopo de
  LLM.
- **FR-002**: O sistema DEVE permitir escopar a autorização de uma capacidade
  instalada para todos os agentes configurados (padrão) ou para uma lista explícita
  de agentes/LLMs nomeados.
- **FR-003**: Skills instaladas DEVEM ser materializadas no diretório fallback de
  skills e, quando aplicável, nos diretórios nativos dos agentes configurados que
  suportam skills.
- **FR-004**: MCPs instalados DEVEM respeitar o transporte e a configuração
  declarados pela entrada do catálogo, DEVEM registrar quaisquer variáveis de
  credencial obrigatórias sem persistir ou exibir seus valores durante a instalação,
  e DEVEM sincronizar a configuração nativa de cada agente configurado.
- **FR-005**: Tools DEVEM ser instaláveis apenas a partir do registro local; uma
  requisição de instalação especificando uma fonte remota para uma tool DEVE ser
  rejeitada com uma mensagem explicativa clara.
- **FR-006**: O sistema DEVE disponibilizar um comando de remoção que apaga a entrada
  de manifesto e o estado de instalação derivado de uma capacidade, e DEVE atualizar
  todos os locais onde aquela capacidade foi materializada.
- **FR-007**: Rodar o comando de instalação sem nenhuma capacidade especificada DEVE
  restaurar todas as capacidades registradas no lockfile e DEVE sincronizar todos os
  agentes configurados depois.
- **FR-008**: Operações de instalação e remoção DEVEM deixar manifesto, estado
  derivado do lockfile, artefatos materializados, e configurações de agente
  mutuamente consistentes — nenhuma operação pode atualizar apenas um subconjunto
  desses.

### Key Entities

- **Installed Capability (Capacidade Instalada)**: Uma skill, MCP, ou tool que foi
  materializada no projeto, com uma versão, fonte, e escopo de autorização de LLM
  registrados.
- **LLM Scope (Escopo de LLM)**: O conjunto de agentes/LLMs autorizados a usar uma
  determinada capacidade instalada; padrão é todos os agentes configurados.
- **Credential Variable (Variável de Credencial)**: Uma variável de ambiente nomeada
  exigida por um MCP instalado, registrada como obrigatória sem que seu valor seja
  armazenado no manifesto ou exibido durante a instalação (ver
  [[005-mcp-server-security]] para tratamento em runtime).
- **Local Registry (Registro Local)**: A fonte confiável e não remota da qual tools
  devem ser instaladas (em contraste com as fontes Git em
  [[002-capability-catalog-discovery]], que se aplicam a skills e MCPs).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Instalar uma capacidade atualiza manifesto, lockfile, arquivos
  materializados, e configuração de agente em uma única invocação de comando, com
  zero passos manuais de acompanhamento necessários.
- **SC-002**: 100% das tentativas de instalação de tool especificando uma fonte
  remota são rejeitadas antes que qualquer arquivo seja escrito.
- **SC-003**: Uma restauração completa baseada em lockfile de um projeto típico é
  concluída sem que nenhuma capacidade seja silenciosamente pulada ou deixada sem
  sincronizar com os agentes configurados.
- **SC-004**: Remover uma capacidade deixa zero arquivos materializados residuais em
  qualquer local previamente populado.

## Assumptions

- "Registro local" para tools se refere ao inventário local de tools mantido pelo
  projeto ou pelo Maia, não a um índice de pacotes remoto.
- Os próprios valores de credencial (em contraste com os nomes de variável) são
  fornecidos pelo desenvolvedor através de um mecanismo fora do comando de instalação
  deste spec (ex.: ambiente ou um prompt de segredos) e nunca são escritos no
  manifesto.
- Este spec assume que o fluxo de catálogo/descoberta em
  [[002-capability-catalog-discovery]] já resolveu um identificador canônico válido
  antes da instalação ser invocada.
