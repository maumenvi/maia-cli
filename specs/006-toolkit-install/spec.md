# Feature Specification: Instalação de Toolkits

**Feature Branch**: `006-toolkit-install`

**Created**: 2026-09-23

**Status**: Draft

**Input**: Descrição do usuário: "Maia deve dar opção de instalar toolkits, como o
speckit do github. Vamos oferecer o speckit do git como o toolkit inicial, mas pesquise
outros toolkits interessantes. Para instalar o comando deve ser `maia toolkit i <nome>`
ou `maia toolkit install <nome>`, tendo a flag `-g` para global; caso o toolkit não
ofereça essa opção deve tratar como se `-g` não existisse e avisar ao usuário. O toolkit
deve entrar no ecossistema do Maia, mas sua instalação deve ser nativa, sem passar pelo
MCP do Maia; o MCP do Maia pode listar, dizer o que faz e dizer os caminhos, mas a
instalação fica por conta do CLI ou doc do toolkit. Toolkit entra no `maia.json` e
`maia.lock.json` e deve ser instalado no `maia i` ou `maia ci`, junto com todos os MCPs,
skills e tools."

## Contexto

Um **toolkit** é um conjunto de fluxo de trabalho para agentes distribuído por terceiros
com instalador próprio (ex.: GitHub Spec Kit), que materializa comandos, templates,
skills e arquivos de memória no projeto ou na máquina do usuário. Diferente de skills,
MCPs e tools, o Maia **não materializa** os arquivos do toolkit: ele delega ao instalador
nativo do toolkit, registra a escolha no manifesto/lockfile e passa a conhecer o toolkit
para listá-lo, descrevê-lo e reinstalá-lo de forma reprodutível.

## Clarifications

### Session 2026-09-24

- Q: Com `-g`, o Maia instala só a ferramenta do toolkit na máquina ou também
  inicializa o toolkit no projeto atual? → A: B — instala a ferramenta globalmente
  **e** inicializa o projeto atual; o manifesto registra "ferramenta global +
  projeto inicializado".
- Q: Sem versão informada, qual versão do toolkit o Maia instala e como o usuário
  escolhe outra? → A: A — última release estável por padrão; `--version <versão>`
  fixa outra; o lockfile registra sempre a versão exata instalada.
- Q: O Maia deve pedir confirmação antes de executar o instalador nativo (código de
  terceiros)? → A: A — `maia toolkit i` exibe comando e origem e pede confirmação
  (`-y` pula); `maia i`/`maia ci` não perguntam para toolkits já declarados.
- Q: Ao remover de um projeto um toolkit com ferramenta global e o usuário escolher
  apagar os arquivos, o Maia desinstala também a ferramenta global? → A: A — não;
  apaga só os arquivos do projeto, mantém a ferramenta global e informa o comando
  nativo para desinstalá-la manualmente.
- Q: O catálogo de toolkits é só embutido no Maia ou o usuário pode cadastrar
  toolkits próprios? → A: A — só catálogo embutido e curado na v1; cadastro pelo
  usuário fica fora do escopo.
- Q: Em `maia i`/`maia ci`, se o toolkit no disco estiver numa versão diferente da
  do manifesto/lockfile, o Maia reinstala (sobrescrevendo edições) ou falha? → A:
  falha, sem reinstalar; a troca de versão é feita explicitamente com `maia toolkit
  i <nome> --version <x>`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instalar um toolkit no projeto (Priority: P1)

Como desenvolvedor, quero rodar `maia toolkit i speckit` (ou `maia toolkit install
speckit`) no meu projeto para que o Spec Kit seja instalado pelo seu próprio instalador,
já configurado para os agentes que o projeto usa, e registrado no manifesto do Maia.

**Why this priority**: É o núcleo da feature — sem instalação não há toolkit no
ecossistema. Entrega valor sozinho: o time passa a ter o Spec Kit instalado com um
único comando, sem precisar conhecer o instalador dele.

**Independent Test**: Em um projeto com `maia.json` e agente `claude` configurado,
executar `maia toolkit i speckit` e verificar que os artefatos do Spec Kit existem no
projeto, integrados ao agente `claude`, e que `maia.json` e `maia.lock.json` contêm a
entrada do toolkit.

**Acceptance Scenarios**:

1. **Given** um projeto Maia com os agentes `claude` e `copilot` configurados,
   **When** o usuário executa `maia toolkit i speckit`, **Then** o Maia executa o
   instalador nativo do Spec Kit no escopo do projeto, direcionado aos agentes
   configurados que o toolkit suporta e que podem coexistir (FR-008; no Spec Kit,
   `copilot` não coexiste com outras integrações e é pulado com aviso), e registra o toolkit no `maia.json` e no
   `maia.lock.json` com a versão efetivamente instalada.
2. **Given** o mesmo projeto, **When** o usuário executa `maia toolkit install
   speckit`, **Then** o resultado é idêntico ao do alias `i`.
3. **Given** um nome de toolkit que não existe no catálogo, **When** o usuário executa
   `maia toolkit i <nome>`, **Then** o comando falha com mensagem indicando que o
   toolkit é desconhecido e lista os toolkits disponíveis, sem alterar manifesto nem
   lockfile.
4. **Given** um pré-requisito do instalador nativo ausente na máquina (ex.: o
   gerenciador de pacotes exigido pelo toolkit), **When** o usuário executa a
   instalação, **Then** o comando falha antes de alterar qualquer arquivo, informa qual
   pré-requisito falta e aponta para a documentação oficial de instalação do toolkit.
5. **Given** que o instalador nativo falha no meio da execução, **When** o comando
   termina, **Then** o Maia reporta a saída de erro do instalador, não registra o
   toolkit no manifesto nem no lockfile e sai com código de erro.
6. **Given** um toolkit já instalado no projeto, **When** o usuário executa a
   instalação novamente, **Then** o Maia informa que o toolkit já está instalado e não
   o reinstala, a menos que uma versão diferente seja solicitada via `--version`;
   nesse caso a confirmação avisa que arquivos do toolkit editados pelo usuário
   serão sobrescritos, e a reinstalação é bloqueada se algum caminho do toolkit
   estiver protegido pelos guardrails.
7. **Given** o catálogo com o `speckit`, **When** o usuário executa `maia toolkit i
   speckit` sem `--version`, **Then** a última release estável é instalada e sua
   versão exata é gravada no lockfile; **When** executa `maia toolkit i speckit
   --version <versão>`, **Then** exatamente essa versão é instalada e registrada.
8. **Given** uma versão inexistente em `--version`, **When** o usuário executa a
   instalação, **Then** o comando falha sem alterar arquivos, manifesto ou lockfile.
9. **Given** a confirmação exibida por `maia toolkit i`, **When** o usuário
   responde "não" (ou a execução é não interativa sem `-y`), **Then** nada é
   instalado nem registrado; **When** o usuário usa `-y`, **Then** a instalação
   prossegue sem pergunta.

---

### User Story 2 - Restaurar toolkits com `maia i` e `maia ci` (Priority: P1)

Como membro de um time, quero que `maia i` e `maia ci` instalem os toolkits declarados
no manifesto/lockfile junto com skills, MCPs e tools, para que qualquer clone do
projeto fique com o mesmo ambiente de agente.

**Why this priority**: Reprodutibilidade é a proposta central do Maia; um toolkit que
não é restaurado pelo fluxo padrão quebra o onboarding do time.

**Independent Test**: Em um clone limpo de um projeto cujo `maia.lock.json` declara o
Spec Kit, executar `maia ci` e verificar que o toolkit foi instalado na versão travada,
junto com as demais capacidades.

**Acceptance Scenarios**:

1. **Given** um projeto cujo `maia.json` declara o toolkit `speckit`, **When** o
   usuário executa `maia i`, **Then** o toolkit é instalado (ou confirmado como já
   instalado) junto com skills, MCPs e tools, e o lockfile é atualizado.
2. **Given** um projeto cujo `maia.lock.json` trava o `speckit` em uma versão, **When**
   o usuário executa `maia ci`, **Then** o toolkit é instalado exatamente na versão
   travada, sem prompts interativos.
3. **Given** que o manifesto e o lockfile divergem quanto aos toolkits, **When** o
   usuário executa `maia ci`, **Then** o comando falha antes de instalar qualquer
   coisa, apontando a divergência, mantendo o comportamento atual do `ci` para as
   demais capacidades.
4. **Given** um toolkit já presente na versão travada, **When** `maia i` ou `maia ci`
   é executado, **Then** o instalador nativo não é reexecutado e os arquivos do
   toolkit (inclusive os editados pelo usuário) não são sobrescritos.
5. **Given** que o instalador nativo de um toolkit falha durante `maia ci`, **When**
   o comando termina, **Then** ele sai com código de erro, identifica o toolkit que
   falhou e não reporta sucesso.
6. **Given** um toolkit presente no disco numa versão diferente da declarada no
   manifesto/lockfile, **When** `maia i` ou `maia ci` é executado, **Then** o
   comando falha sem reexecutar o instalador, informa as duas versões e orienta a
   usar `maia toolkit i <nome> --version <x>`; nenhum arquivo do toolkit é alterado.

---

### User Story 3 - Instalação global com `-g` (Priority: P2)

Como desenvolvedor, quero usar `maia toolkit i <nome> -g` para instalar a ferramenta
do toolkit na minha máquina (reutilizável entre projetos), quando o toolkit oferece
esse modo, e ainda assim ter o projeto atual inicializado com o toolkit.

**Why this priority**: Útil para quem usa o toolkit em vários projetos, mas o fluxo
por projeto (P1) já entrega o valor principal.

**Independent Test**: Executar `maia toolkit i speckit -g` e verificar que o
instalador nativo instalou a ferramenta globalmente e inicializou o projeto atual;
executar `-g` com um toolkit sem suporte global e verificar o aviso e a instalação
no projeto.

**Acceptance Scenarios**:

1. **Given** um toolkit que suporta instalação global, **When** o usuário executa
   `maia toolkit i <nome> -g`, **Then** a ferramenta do toolkit é instalada no
   escopo global da máquina pelo seu instalador nativo, o projeto atual é
   inicializado com o toolkit (direcionado aos agentes configurados) e a entrada
   registrada indica ferramenta global + projeto inicializado.
2. **Given** um toolkit que **não** suporta instalação global, **When** o usuário
   executa `maia toolkit i <nome> -g`, **Then** o Maia exibe um aviso explícito de que
   o toolkit não oferece instalação global, ignora a flag e prossegue exatamente como
   se `-g` não tivesse sido informado (instalação no projeto).
3. **Given** um toolkit registrado com escopo global no manifesto, **When** `maia i`
   ou `maia ci` roda em uma máquina onde a ferramenta já está instalada globalmente
   na versão travada, **Then** a ferramenta não é reinstalada; se estiver ausente,
   ela é instalada globalmente. Em ambos os casos, o projeto é inicializado com o
   toolkit se ainda não estiver.

---

### User Story 4 - Consultar toolkits pelo MCP e pelo CLI (Priority: P2)

Como agente (via MCP do Maia) ou desenvolvedor (via CLI), quero listar os toolkits
disponíveis e instalados, entender o que cada um faz e onde estão seus arquivos, para
usar o toolkit corretamente sem precisar ler a documentação dele.

**Why this priority**: Coloca o toolkit no ecossistema do Maia — o agente descobre o
toolkit pelo mesmo ponto único que já usa para skills/MCPs/tools.

**Independent Test**: Com o Spec Kit instalado, conectar um agente ao MCP do Maia e
consultar os toolkits; verificar nome, descrição, versão, escopo e caminhos. Verificar
que o MCP não oferece nenhuma operação de instalação.

**Acceptance Scenarios**:

1. **Given** o Spec Kit instalado no projeto, **When** um agente consulta os toolkits
   via MCP do Maia, **Then** recebe nome, descrição do que o toolkit faz, versão,
   escopo (projeto/global), caminhos relevantes (ex.: diretório de configuração,
   comandos/skills gerados) e o link da documentação oficial.
2. **Given** qualquer estado, **When** um agente inspeciona as operações do MCP do
   Maia, **Then** não existe operação que instale, atualize ou remova toolkits; se o
   agente pedir instrução de instalação, o MCP responde com o comando `maia toolkit i
   <nome>` e o link da documentação do toolkit.
3. **Given** o catálogo de toolkits, **When** o usuário executa a listagem de
   toolkits no CLI, **Then** vê os toolkits disponíveis, se suportam instalação
   global, quais estão instalados e em qual escopo.

---

### User Story 5 - Remover um toolkit do projeto (Priority: P3)

Como desenvolvedor, quero remover um toolkit com `maia toolkit rm <nome>` (alias
`maia toolkit remove <nome>`) do manifesto do Maia para que ele deixe
de ser restaurado pelo `maia i`/`maia ci`, e decidir na hora se os arquivos do
toolkit também devem ser apagados.

**Why this priority**: Completa o ciclo de vida, mas é menos frequente.

**Independent Test**: Com o Spec Kit instalado, removê-lo respondendo "não" à
pergunta de apagar arquivos e verificar que as entradas sumiram de `maia.json` e
`maia.lock.json` e os arquivos permanecem; repetir respondendo "sim" e verificar que
os arquivos do toolkit foram apagados.

**Acceptance Scenarios**:

1. **Given** o Spec Kit instalado, **When** o usuário remove o toolkit pelo Maia,
   **Then** a entrada é removida de `maia.json` e `maia.lock.json` e o Maia lista os
   caminhos do toolkit no disco e pergunta se o usuário deseja apagar esses arquivos.
2. **Given** a pergunta de remoção exibida, **When** o usuário responde "não",
   **Then** nenhum arquivo é apagado e o Maia informa os caminhos que permanecem.
3. **Given** a pergunta de remoção exibida, **When** o usuário responde "sim",
   **Then** o Maia apaga os arquivos do toolkit, respeitando os guardrails de ações
   destrutivas: caminhos bloqueados pela política não são apagados e são reportados.
4. **Given** uma execução não interativa (sem terminal para perguntar), **When** o
   usuário remove o toolkit, **Then** o Maia não apaga arquivos e informa os caminhos
   que permanecem.
5. **Given** um toolkit com ferramenta instalada globalmente, **When** o usuário opta
   por apagar os arquivos, **Then** o Maia apaga apenas os arquivos do toolkit dentro
   do projeto, mantém a ferramenta global intacta (outros projetos podem usá-la) e
   informa o comando nativo ou procedimento documentado para desinstalá-la
   manualmente.

---

### Edge Cases

- `-g` com toolkit sem suporte global: aviso + instalação no projeto (US3.2); a
  entrada registrada reflete o escopo **efetivo** (projeto), não o solicitado.
- Nenhum agente configurado no projeto: o toolkit é instalado com a integração
  padrão do seu instalador e o Maia avisa que nenhum agente do projeto foi vinculado.
- Agente configurado que o toolkit não suporta: o toolkit é instalado para os agentes
  suportados e o Maia avisa quais agentes ficaram de fora.
- O projeto já tem o toolkit instalado manualmente (fora do Maia): o Maia detecta a
  instalação existente, não sobrescreve e apenas o registra no manifesto/lockfile com a
  versão detectada. Se o usuário pedir `--version` diferente da detectada, o caso é
  tratado como troca de versão (US1.6): confirmação com aviso de sobrescrita.
- O usuário editou arquivos gerados pelo toolkit (ex.: constituição, templates):
  `maia i`/`maia ci` não reexecutam o instalador se o toolkit já estiver presente na
  versão travada, preservando as edições.
- `maia ci` em ambiente sem rede ou sem o pré-requisito do instalador: falha
  explícita identificando o toolkit e o pré-requisito, nunca sucesso silencioso.
- Instalador nativo pedindo interação (prompts): em `maia ci` a instalação é sempre
  não interativa; se o toolkit não permitir execução não interativa, `ci` falha com
  mensagem clara.
- Caminhos do toolkit colidindo com políticas de guardrail: ao apagar arquivos na
  remoção, os caminhos bloqueados são preservados e reportados; o Maia só apaga
  arquivos após confirmação explícita do usuário.
- Arquivos do toolkit editados pelo usuário: a pergunta de remoção deixa claro que
  as edições serão perdidas se o usuário optar por apagar.

## Requirements *(mandatory)*

### Functional Requirements

**Comando e catálogo**

- **FR-001**: O CLI MUST oferecer `maia toolkit install <nome>` e o alias `maia
  toolkit i <nome>`, com comportamento idêntico, aceitando `--version <versão>`.
- **FR-001a**: Sem `--version`, o Maia MUST instalar a última release estável do
  toolkit (nunca uma branch ou pré-release); com `--version`, MUST instalar
  exatamente a versão informada ou falhar sem efeitos colaterais se ela não existir.
- **FR-002**: O Maia MUST manter um catálogo de toolkits em que cada entrada define:
  nome, descrição, link da documentação oficial, pré-requisitos, se suporta
  instalação global, agentes suportados, como executar o instalador nativo (projeto e,
  quando houver, global), como detectar a versão instalada e quais caminhos o toolkit
  produz.
- **FR-003**: O catálogo inicial MUST conter o GitHub Spec Kit (`speckit`). O catálogo
  MUST ser embutido e curado pelo Maia (novos toolkits entram por release do Maia) e
  MUST ser extensível para receber novas entradas sem alterar o fluxo do comando.
- **FR-003a**: Na v1, o Maia MUST NOT aceitar toolkits definidos pelo usuário (por
  fontes registradas ou pelo `maia.json`); um toolkit declarado no manifesto que não
  exista no catálogo embutido MUST resultar em erro em `maia i`/`maia ci`.
- **FR-004**: Um nome desconhecido MUST resultar em erro que lista os toolkits
  disponíveis, sem efeitos colaterais.
- **FR-005**: O CLI MUST oferecer uma listagem de toolkits disponíveis e instalados,
  mostrando escopo e suporte a instalação global.

**Instalação nativa**

- **FR-006**: A instalação MUST ser feita pelo instalador nativo do toolkit (o seu
  próprio CLI ou o procedimento da sua documentação oficial); o Maia MUST NOT copiar,
  gerar ou materializar ele mesmo os arquivos do toolkit.
- **FR-007**: Antes de executar o instalador, o Maia MUST verificar os pré-requisitos
  declarados e, se algum faltar, falhar sem alterar arquivos, informando o que falta e
  o link da documentação.
- **FR-008**: Na instalação em projeto, o Maia MUST direcionar o instalador aos agentes
  configurados no `maia.json` que o toolkit suporta, avisando sobre agentes não
  suportados. Quando o toolkit declara integrações que não podem coexistir, o Maia
  MUST escolher a combinação que atende o maior número de agentes configurados e
  só pular (com aviso) as integrações realmente incompatíveis entre si.
- **FR-009**: Se o instalador nativo falhar, o Maia MUST exibir a saída de erro do
  instalador, sair com código de erro e MUST NOT registrar o toolkit no manifesto nem
  no lockfile.
- **FR-010**: O Maia MUST exibir ao usuário o comando nativo que será executado antes
  de executá-lo, para transparência sobre o que roda na máquina.
- **FR-010a**: `maia toolkit i` MUST exibir o comando nativo e a origem do toolkit e
  pedir confirmação antes de executá-lo; a flag `-y` MUST pular a confirmação. Sem
  confirmação (resposta negativa ou execução não interativa sem `-y`), o comando MUST
  abortar sem alterar arquivos, manifesto ou lockfile.
- **FR-010b**: `maia i` e `maia ci` MUST executar sem confirmação os instaladores de
  toolkits já declarados no manifesto/lockfile, pois essa declaração é versionada e
  revisada no repositório.

**Escopo global**

- **FR-011**: Quando o toolkit suporta instalação global, a flag `-g` MUST instalar a
  ferramenta do toolkit no escopo global da máquina **e** inicializar o toolkit no
  projeto atual.
- **FR-012**: Quando o toolkit não suporta instalação global, o Maia MUST exibir um
  aviso explícito, ignorar `-g` e instalar no projeto exatamente como se a flag não
  tivesse sido informada.
- **FR-013**: A entrada registrada MUST conter o escopo efetivo da ferramenta
  (projeto ou global); em ambos os casos o projeto é registrado como inicializado com
  o toolkit.

**Manifesto, lockfile e restauração**

- **FR-014**: Após instalação bem-sucedida, o toolkit MUST ser registrado no
  `maia.json` (nome, escopo e versão exata resolvida) e no `maia.lock.json` (nome,
  escopo, versão exata efetivamente instalada e origem).
- **FR-015**: `maia i` MUST instalar os toolkits declarados no manifesto que estejam
  ausentes, junto com skills, MCPs e tools, e atualizar o lockfile.
- **FR-016**: `maia ci` MUST instalar os toolkits na versão travada no lockfile, de
  forma não interativa, e MUST falhar se manifesto e lockfile divergirem quanto aos
  toolkits, seguindo a mesma validação prévia já aplicada às demais capacidades.
- **FR-017**: `maia i` e `maia ci` MUST NOT reexecutar o instalador de um toolkit já
  presente na versão esperada, preservando arquivos editados pelo usuário. Se o
  toolkit estiver presente numa versão diferente, `maia i` e `maia ci` MUST falhar
  sem reexecutar o instalador (nenhuma sobrescrita implícita).
- **FR-018**: Uma falha de toolkit em `maia i`/`maia ci` MUST resultar em código de
  saída de erro identificando o toolkit, sem reportar sucesso geral.
- **FR-019**: A verificação de integridade do lockfile (`maia verify`) MUST validar
  toolkits por presença e versão, não por hash dos arquivos gerados (que o usuário
  pode editar legitimamente).

**MCP do Maia (somente leitura)**

- **FR-020**: O MCP do Maia MUST expor consulta de toolkits instalados e disponíveis,
  retornando nome, descrição, versão, escopo, caminhos relevantes e link da
  documentação.
- **FR-021**: O MCP do Maia MUST NOT oferecer operações de instalação, atualização ou
  remoção de toolkits; quando questionado sobre instalação, MUST indicar o comando do
  CLI e a documentação do toolkit. O nome da ferramenta MCP de consulta de toolkits
  é reservado e não pode ser usado por skills ou tools.
- **FR-022**: O bloco de instruções gerenciado do Maia nos arquivos de instrução dos
  agentes MUST mencionar os toolkits instalados e como consultá-los.

**Remoção**

- **FR-023**: O Maia MUST permitir remover um toolkit do manifesto e do lockfile.
- **FR-024**: Ao remover, o Maia MUST listar os caminhos do toolkit no disco e
  perguntar ao usuário se deseja apagá-los; a flag `-y` conta como confirmação
  explícita. Sem confirmação explícita (resposta "não" ou execução não interativa
  sem `-y`), MUST NOT apagar nenhum arquivo.
- **FR-025**: Quando o usuário confirmar, o Maia MUST apagar os arquivos do toolkit
  no projeto passando pelos guardrails de ações destrutivas, preservando e
  reportando caminhos bloqueados. O Maia MUST NOT desinstalar a ferramenta global do
  toolkit; MUST informar o comando nativo (ou procedimento documentado) para que o
  usuário a desinstale manualmente. Procedimentos nativos de desinstalação só MUST
  ser executados para integrações cujos caminhos passem pelos guardrails; as demais
  são preservadas e reportadas.

**Segurança**

- **FR-026**: Toolkits MUST seguir a política de confiança de fontes do Maia: o
  instalador nativo executa com as permissões do usuário, e a versão/origem travadas
  no lockfile MUST ser usadas em `maia ci` para evitar instalar conteúdo não revisado.
- **FR-027**: Antes de executar um instalador nativo que possa sobrescrever arquivos
  existentes do toolkit (troca de versão), o Maia MUST verificar os caminhos do
  toolkit nos guardrails de ações destrutivas e abortar, sem executar nada, se algum
  estiver bloqueado.

### Key Entities

- **Toolkit (entrada de catálogo)**: definição de um toolkit instalável — nome,
  descrição, documentação, pré-requisitos, suporte a global, agentes suportados,
  forma de instalação nativa, detecção de versão e caminhos produzidos.
- **Toolkit declarado (manifesto)**: escolha do projeto — nome e escopo efetivo da
  ferramenta (projeto ou global); o projeto é sempre inicializado com o toolkit.
- **Toolkit travado (lockfile)**: registro reprodutível — nome, escopo, versão
  instalada e origem.
- **Relação com agentes**: os agentes do `maia.json` determinam a quais integrações o
  instalador nativo é direcionado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um desenvolvedor instala o Spec Kit em um projeto Maia com um único
  comando, sem consultar a documentação do Spec Kit, em menos de 2 minutos (com
  pré-requisitos presentes).
- **SC-002**: Em 100% dos clones limpos com toolkits no lockfile, `maia ci` deixa os
  toolkits instalados na versão travada, ou falha com o toolkit e a causa
  identificados.
- **SC-003**: Em 100% das execuções com `-g` para toolkit sem suporte global, o
  usuário vê o aviso e o resultado é idêntico ao da execução sem `-g`.
- **SC-004**: Um agente conectado ao MCP do Maia consegue responder "quais toolkits
  estão instalados, o que fazem e onde estão os arquivos" com uma única consulta.
- **SC-005**: Zero operações de instalação de toolkit disponíveis pelo MCP do Maia.
- **SC-006**: Reexecutar `maia i`/`maia ci` com toolkits já instalados não altera
  nenhum arquivo do toolkit editado pelo usuário.
- **SC-007**: Em 100% das remoções, nenhum arquivo do toolkit é apagado sem que o
  usuário tenha confirmado explicitamente a exclusão.

## Assumptions

- **Escopo padrão**: sem `-g`, a instalação é no projeto atual.
- **Versão padrão**: sem `--version`, a última release estável, gravada como versão
  exata no manifesto; `maia i` usa a versão do manifesto e `maia ci` a do lockfile.
- **Catálogo v1**: somente o `speckit` é entregue nesta feature; os demais toolkits
  pesquisados ficam como candidatos para entradas futuras do catálogo (ver abaixo), já
  que FR-003 garante extensibilidade. Toolkits cadastrados pelo usuário (fontes
  próprias ou definição local) estão fora do escopo da v1.
- **Spec Kit**: requer Python 3.11+ e `uv`; é instalado pelo seu CLI oficial
  (`specify`), com suporte a instalação global da ferramenta e inicialização por
  projeto com integração por agente. Ele serve como referência de toolkit com suporte
  a `-g`.
- **Escopo global em `ci`**: para toolkits com ferramenta global declarada no
  manifesto, a ferramenta é verificada e, se ausente, instalada globalmente na
  máquina que roda `ci`; o projeto é sempre inicializado com o toolkit.
- **Detecção de instalação existente**: toolkits instalados manualmente antes do Maia
  são adotados (registrados) sem reinstalação.
- **Remoção**: por padrão o Maia não apaga arquivos do toolkit; só apaga após
  confirmação explícita do usuário na remoção, sempre passando pelos guardrails de
  ações destrutivas. Em execução não interativa a resposta padrão é "não apagar".
- **Dependências**: reutiliza o manifesto/lockfile (feature 004), o ciclo de
  instalação de capacidades (feature 003), a configuração de agentes (feature 001) e o
  MCP do Maia.

### Toolkits candidatos pesquisados (fora do escopo v1)

| Toolkit | O que faz | Instalador nativo | Global |
|---------|-----------|-------------------|--------|
| GitHub Spec Kit (**v1**) | SDD em fases: specify → plan → tasks → implement | CLI `specify` (via `uv`) | Sim |
| OpenSpec (Fission-AI) | SDD leve por proposta de mudança → validação → implementação → arquivamento | CLI `openspec` (via npm, Node 20.19+) | Sim |
| BMAD Method | Framework ágil com agentes/personas especializados e workflows | Instalador via `npx` no projeto | Não (por projeto) |
| Task Master AI | Quebra PRD em tarefas gerenciadas pelo agente | CLI via npm | Sim |
| Agent OS (Builder Methods) | Padrões, specs e workflows para agentes de código | Script de instalação base + por projeto | Sim |

Referências: [github/spec-kit](https://github.com/github/spec-kit),
[Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec/),
[Comparativo Spec-kit, BMAD, Agent OS e Kiro](https://medium.com/@tim_wang/spec-kit-bmad-and-agent-os-e8536f6bf8a4).
