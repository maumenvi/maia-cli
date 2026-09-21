# Feature Specification: Lockfile, Integridade & Restauração em CI

**Feature Branch**: `004-lockfile-integrity-ci`

**Created**: 2026-09-21

**Status**: Draft

**Input**: Descrição do usuário: "Split de .specs/001-maia-cli.spec.md — o escopo de
lockfile, verificação, restauração em CI, e construção de contexto: gerar um lockfile
reproduzível, verificá-lo contra artefatos materializados, restaurar um ambiente
não-interativamente em CI, e construir/exibir contexto de desenvolvimento e de LLM."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar ou atualizar o lockfile (Priority: P1)

Como mantenedor, quero gerar ou atualizar um lockfile que capture versões exatas,
fontes, dependências e autorizações, para que o estado de instalação atual possa ser
reproduzido depois.

**Why this priority**: O lockfile é o artefato do qual toda outra história neste spec
depende; sem ele não há nada para verificar ou restaurar.

**Independent Test**: Com capacidades instaladas, rodar o comando de lock e verificar
que o lockfile resultante registra metadados de versão, fonte, dependência e
autorização para cada capacidade instalada.

**Acceptance Scenarios**:

1. **Given** um projeto com capacidades instaladas, **When** o mantenedor roda o
   comando de lock, **Then** o lockfile é criado ou atualizado com metadados de
   versão, fonte, dependência e autorização suficientes para reproduzir a instalação.
2. **Given** um lockfile existente e nenhuma mudança de capacidade desde que foi
   gerado, **When** o comando de lock é reexecutado, **Then** o conteúdo do lockfile
   permanece inalterado.

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

### Edge Cases

- O que acontece quando verify é rodado contra um lockfile gerado por uma versão de
  schema incompatível (mais antiga/mais nova)?
- Como o sistema lida com um lockfile cuja fonte registrada não está mais acessível
  durante uma restauração em CI?
- O que acontece quando duas entradas no lockfile declaram requisitos de dependência
  conflitantes?
- Como o context-show se comporta quando o contexto nunca foi construído?
- O que acontece quando uma restauração em CI é interrompida no meio da
  materialização?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar um comando de lock que gera ou atualiza
  um lockfile contendo versões, fontes, dependências, autorizações, e metadados
  suficientes para reproduzir a instalação atual.
- **FR-002**: O sistema DEVE disponibilizar um comando de verify que valida o
  lockfile contra os artefatos materializados e DEVE falhar explicitamente quando uma
  divergência ou artefato ausente for detectado.
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
- **FR-007**: Geração de lockfile, verificação, e restauração em CI DEVEM usar
  metadados consistentes de forma que um lockfile produzido pelo comando de lock seja
  sempre uma entrada válida para o verify e para a restauração em CI.

### Key Entities

- **Lockfile**: O registro reproduzível de versões exatas de capacidades, fontes,
  dependências, e autorizações (entidade compartilhada, pertencente
  conceitualmente ao manifesto em [[001-project-init-agents]] mas gerada/verificada
  aqui).
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
  divergência específica identificada.
- **SC-003**: A geração de lockfile é determinística: reexecutar o lock sem mudanças
  subjacentes produz um lockfile byte-a-byte idêntico.
- **SC-004**: A restauração em CI nunca materializa um único artefato sequer quando a
  validação de metadados ou hash do lockfile falha.

## Assumptions

- Validação de "metadados e hashes" se refere a checagens de integridade (ex.: hashes
  de conteúdo) registradas por capacidade no lockfile, não a assinatura criptográfica
  do próprio lockfile.
- Artefatos de contexto são saídas derivadas e regeneráveis e não são tratados como
  fonte da verdade ao lado do manifesto/lockfile.
- A restauração em CI assume que acesso à rede às fontes configuradas está disponível
  quando uma capacidade ainda não está em cache local; restauração em CI totalmente
  offline está fora de escopo para esta iteração.
