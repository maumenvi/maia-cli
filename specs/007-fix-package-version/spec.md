# Feature Specification: Versão do Maia com fonte única

**Feature Branch**: `007-fix-package-version`

**Created**: 2026-10-01

**Status**: Implemented (branch `007-fix-package-version`; correção complementar em [008](../008-fix-tag-dry-run/spec.md))

**Input**: Descrição do usuário (issue): "Versão fixa 1.5.2 em package.metadata vai para o
maia.lock.json (versão não publicada). Causa: `dist/src/shared/package.metadata.js` tem
`version: '1.5.2'` escrito à mão, e ninguém atualizou ao subir as versões do `package.json`.
Impacto: esse valor aparece em três lugares, conferidos no pacote instalado: no `ref` do lock
(`defaults.js:27`); na versão que o servidor MCP do Maia informa
(`create.modern.result.meta.js:3`); no `clientInfo.version` que o Maia envia aos MCPs
(`json.rpc.mcp.client.js:114`). Reprodução: passo a passo, com o trecho do lock e o 404 do
`npm view @maumenvi/maia-cli@1.5.2`. Correção sugerida: gerar a versão a partir do
`package.json` no `build:publish`, ou ler em runtime como o `maia --version` já faz. Um teste
que falhe se as duas versões divergirem. E publicar tags `vX.Y.Z` no GitHub."

## Contexto

O Maia expõe a própria versão em vários pontos visíveis para fora do processo, mas hoje há
duas fontes distintas para esse valor:

- `maia --version` lê a versão do manifesto do pacote publicado (hoje `1.6.1`) — correto.
- Todos os demais pontos leem uma constante interna escrita à mão (`1.5.2`), que nunca foi
  atualizada e corresponde a uma versão **que não existe no registro npm**.

Pontos afetados pela constante desatualizada (levantados no código-fonte atual):

1. **Fonte padrão `local` do manifesto** (`sources.local.ref`) — gravada no `maia.json` no
   `maia init` e propagada para a proveniência dos pacotes no `maia.lock.json`, inclusive no
   payload de integridade do lockfile.
2. **Identidade do servidor MCP do Maia** (`serverInfo.version`) devolvida em toda resposta
   do protocolo moderno.
3. **Identidade do Maia como cliente MCP** (`clientInfo.version`) enviada no handshake
   `initialize` aos MCPs instalados.
4. **Metadados de requisição do protocolo moderno** (`clientInfo.version` no envelope de cada
   requisição) — não citado na issue, mas usa a mesma constante.

Além disso, o servidor MCP do Maia usava um segundo valor fixo, `1.0.0`: o comando
`maia mcp-server` sempre passava `1.0.0` quando `--version` não era informado, e o servidor
stdio tinha o mesmo padrão. Era esse o valor que o servidor realmente informava aos agentes, e
não o `1.5.2`. A lista completa dos 7 pontos, com arquivo e linha, está em
[research.md](./research.md#levantamento-do-estado-atual).

Não existem tags de versão (`vX.Y.Z`) no repositório, o que impede correlacionar uma versão
publicada com o commit que a gerou.

## Clarifications

### Session 2026-10-01

- Q: O que fazer com manifestos/lockfiles existentes que já registram `1.5.2` na fonte
  `local`? → A: C — o próximo `maia i` corrige automaticamente o `ref` e regenera o
  lockfile; `maia ci` não altera arquivos e apenas avisa.
- Refinamento do plano (research D4): só o `maia i` **sem argumentos** corrige. `maia i <nome>`
  roda dentro de um rollback próprio, e corrigir ali, com falha no meio, deixaria o manifesto
  novo com o lock antigo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lockfile e manifesto registram a versão real do Maia (Priority: P1)

Uma pessoa desenvolvedora roda `maia init` e `maia i` num projeto novo. O `maia.json` e o
`maia.lock.json` resultantes registram, na fonte `local`, exatamente a versão do Maia que
está instalada — uma versão que existe no registro npm e pode ser resolvida por qualquer
pessoa que clone o projeto.

**Why this priority**: É o defeito reportado. O lockfile é o artefato de reprodutibilidade
do projeto; apontar para uma versão inexistente quebra a confiança nele e faz qualquer
consulta ao registro (ex.: `npm view @maumenvi/maia-cli@1.5.2`) responder 404.

**Independent Test**: Instalar o pacote publicado, rodar `maia init` + `maia i` num diretório
vazio e comparar o `ref` da fonte `local` no manifesto e no lockfile com a saída de
`maia --version`; os três devem ser iguais e a versão deve existir no registro.

**Acceptance Scenarios**:

1. **Given** o Maia na versão X instalado, **When** a pessoa roda `maia init` num diretório
   sem `maia.json`, **Then** a fonte `local` do manifesto registra `ref` igual a X.
2. **Given** um projeto inicializado com o Maia na versão X, **When** a pessoa roda `maia i`,
   **Then** toda proveniência de pacote vinda da fonte `local` no `maia.lock.json` registra
   `ref` igual a X.
3. **Given** o lockfile gerado no cenário 2, **When** a pessoa consulta a versão X no registro
   npm, **Then** a consulta encontra a versão publicada (sem 404).
4. **Given** o lockfile gerado no cenário 2, **When** a pessoa roda `maia ci` com o mesmo
   Maia X, **Then** a verificação de integridade passa.
5. **Given** um projeto existente cujo `maia.json` e `maia.lock.json` registram `ref: 1.5.2`
   na fonte `local`, **When** a pessoa roda `maia i` com o Maia X, **Then** ambos passam a
   registrar X, a integridade do lockfile é recalculada e a saída informa a correção.
6. **Given** o mesmo projeto do cenário 5 ainda não corrigido, **When** roda `maia ci`,
   **Then** nenhum arquivo é alterado, um aviso orienta rodar `maia i` e o comando não falha
   por causa disso.

---

### User Story 2 - Identidade MCP consistente com a versão instalada (Priority: P2)

Um agente (ou ferramenta de diagnóstico) conectado ao servidor MCP do Maia lê a versão
informada pelo servidor; um MCP de terceiros instalado pelo Maia registra a versão do
cliente que se conectou. Em ambos os casos, a versão informada é a mesma que
`maia --version` exibe.

**Why this priority**: Não quebra a instalação, mas engana diagnósticos, logs e eventuais
regras de compatibilidade do lado do agente ou do MCP de terceiros. Foi descoberto junto com
o defeito principal e tem a mesma causa.

**Independent Test**: Iniciar o servidor MCP do Maia, fazer o handshake e uma chamada
qualquer; verificar que a versão em `serverInfo` é igual à de `maia --version`. Conectar o
Maia a um MCP de teste que registra o `clientInfo` recebido e verificar o mesmo valor.

**Acceptance Scenarios**:

1. **Given** o Maia na versão X, **When** um cliente faz o handshake com o servidor MCP do
   Maia, **Then** a identidade do servidor informa versão X.
2. **Given** o Maia na versão X, **When** qualquer resposta do protocolo moderno é devolvida
   pelo servidor MCP do Maia, **Then** os metadados de identidade do servidor informam X.
3. **Given** o Maia na versão X, **When** o Maia se conecta como cliente a um MCP instalado
   (handshake ou envelope de requisição do protocolo moderno), **Then** a identidade de
   cliente enviada informa versão X.

---

### User Story 3 - Divergência de versão é barrada antes de publicar (Priority: P2)

A pessoa mantenedora sobe a versão do pacote para preparar uma release. Se qualquer ponto do
Maia que expõe a versão divergir da versão declarada no pacote, a suíte de testes falha e a
publicação não acontece.

**Why this priority**: Corrigir o valor uma vez não basta — o defeito surgiu porque nada
impedia a divergência. Um guarda automatizado impede a regressão.

**Independent Test**: Alterar a versão declarada no pacote sem nenhuma outra mudança e rodar
a suíte de testes e o build de publicação; ambos devem continuar verdes e expor a nova
versão em todos os pontos. Simular uma fonte divergente e confirmar que o teste falha.

**Acceptance Scenarios**:

1. **Given** a versão declarada no pacote foi alterada para Y, **When** a suíte de testes
   roda, **Then** todos os pontos que expõem a versão do Maia informam Y sem nenhuma edição
   manual adicional.
2. **Given** algum ponto do Maia expõe uma versão diferente da declarada no pacote, **When**
   a suíte de testes roda, **Then** ao menos um teste falha indicando qual ponto divergiu.
3. **Given** o build de publicação foi executado, **When** o artefato gerado é inspecionado,
   **Then** a versão exposta pelo artefato é igual à declarada no pacote.

---

### User Story 4 - Cada versão publicada tem tag no repositório (Priority: P3)

Quem investiga um problema numa versão publicada X encontra no repositório GitHub a tag
`vX` apontando para o commit que gerou aquela publicação.

**Why this priority**: Melhora rastreabilidade e auditoria, mas não afeta o funcionamento do
CLI. Pode ser entregue separadamente.

**Independent Test**: Após uma publicação da versão X, listar as tags remotas e confirmar
que `vX` existe e aponta para o commit publicado.

**Acceptance Scenarios**:

1. **Given** a versão X foi publicada no registro npm, **When** alguém lista as tags do
   repositório remoto, **Then** existe a tag `vX` apontando para o commit publicado.
2. **Given** o processo de release documentado, **When** a pessoa mantenedora segue o passo a
   passo, **Then** a criação e o envio da tag `vX` fazem parte do processo (não um passo
   lembrado de cabeça).

---

### Edge Cases

- **Projetos existentes com `ref: 1.5.2` já gravado**: o `maia.json` persiste a fonte
  `local` com o valor antigo e o lockfile depende dele (verificação de proveniência e
  integridade). Decisão (ver Clarifications): o próximo `maia i` corrige automaticamente o
  `ref` para a versão real e regenera o lockfile; `maia ci` não altera arquivos e apenas
  avisa.
- **Fonte `local` com `ref` diferente de `1.5.2`** (ex.: valor fixado de propósito pelo
  usuário, ou de uma versão anterior real do Maia): não é tocada pela correção automática.
- **Projeto com `ref: 1.5.2` mas sem lockfile**: `maia i` corrige o manifesto e gera o
  lockfile já com a versão real.
- **`maia i <nome>` num projeto com `ref: 1.5.2`**: instala normalmente e mantém o `ref`
  `1.5.2`, sem corrigir e sem avisar. A correção fica para o próximo `maia i` sem argumentos.
- **Execução a partir do código-fonte** (`npm run dev` / `node src/cli/index.ts`): a versão
  exposta deve ser a mesma do pacote no repositório, sem depender de build.
- **Pacote instalado globalmente, via `npx` ou em `node_modules` aninhado**: a versão deve
  ser resolvida corretamente independentemente do diretório de trabalho do usuário.
- **Manifesto do pacote ausente ou sem versão** (instalação corrompida): o Maia não deve
  gravar um valor inventado no lockfile; deve falhar com mensagem clara, como já faz
  `maia --version`.
- **Versão pré-release** (ex.: `1.7.0-beta.1`): deve ser propagada literalmente, sem
  normalização.
- **Valor padrão próprio do servidor stdio** (`1.0.0`): quando o servidor MCP do Maia é
  iniciado sem versão explícita, também deve informar a versão real.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O Maia MUST ter uma única fonte de verdade para a própria versão: a versão
  declarada no manifesto do pacote. Nenhum outro ponto pode conter a versão escrita à mão.
- **FR-002**: `maia init` MUST gravar na fonte `local` do novo manifesto um `ref` igual à
  versão do Maia em execução.
- **FR-003**: `maia i` MUST registrar na proveniência do lockfile, para a fonte `local`, o
  `ref` vindo do manifesto do projeto, que em projetos novos é a versão real do Maia.
- **FR-004**: O servidor MCP do Maia MUST informar a versão real do Maia na identidade do
  servidor, tanto no handshake quanto nos metadados de resultado do protocolo moderno, e
  inclusive quando iniciado sem versão explícita.
- **FR-005**: O Maia, atuando como cliente MCP, MUST informar a versão real do Maia na
  identidade de cliente, tanto no handshake quanto no envelope de requisição do protocolo
  moderno.
- **FR-006**: `maia --version` e todos os pontos dos FR-002 a FR-005 MUST informar exatamente
  o mesmo valor em qualquer forma de execução suportada (código-fonte, build de publicação,
  pacote instalado local ou globalmente).
- **FR-007**: A suíte de testes MUST conter ao menos um teste que falhe se qualquer ponto que
  expõe a versão do Maia divergir da versão declarada no manifesto do pacote.
- **FR-008**: O build de publicação MUST produzir um artefato cuja versão exposta seja igual
  à declarada no manifesto do pacote, sem passo manual de sincronização.
- **FR-009**: Se a versão do Maia não puder ser determinada, o Maia MUST falhar com mensagem
  de erro clara em vez de gravar ou informar um valor padrão inventado.
- **FR-010**: Quando a fonte `local` do manifesto do projeto tiver `ref` igual a `1.5.2`,
  `maia i` **sem argumentos** MUST reescrever esse `ref` para a versão real do Maia em execução, regenerar o
  lockfile de forma consistente (proveniência e integridade) e informar ao usuário, na saída
  do comando, que o manifesto e o lockfile foram corrigidos e por quê.
- **FR-010a**: Nessa mesma situação, `maia ci` MUST NOT alterar manifesto nem lockfile; MUST
  emitir um aviso orientando a rodar `maia i` para corrigir e MUST continuar passando quando o
  lockfile estiver consistente com o manifesto.
- **FR-010b**: A correção automática MUST se limitar ao valor `1.5.2` na fonte `local`;
  qualquer outro `ref` (em `local` ou em outras fontes) permanece intocado.
- **FR-010c**: `maia i <nome>` (instalação nomeada) MUST NOT corrigir o `ref` nem avisar,
  para que uma falha no meio da instalação não deixe manifesto e lockfile inconsistentes.
- **FR-011**: O processo de release MUST incluir a criação e o envio de uma tag `vX.Y.Z` no
  repositório GitHub para cada versão publicada, documentado no fluxo de publicação do
  projeto. Prévias (`npm publish --dry-run`) e publicações em stage não criam tag; ver
  [feature 008](../008-fix-tag-dry-run/spec.md).
- **FR-012**: O CHANGELOG MUST registrar a correção, incluindo o impacto em projetos que já
  tenham `1.5.2` gravado.

### Key Entities

- **Versão do Maia**: identificador semântico da release do CLI; fonte única é o manifesto
  do pacote; consumida por `--version`, manifesto padrão, lockfile e identidades MCP.
- **Fonte `local`** (no `maia.json`): fonte padrão confiável que aponta para o próprio pacote
  do Maia no registro npm; seu `ref` deve ser uma versão publicada.
- **Proveniência no lockfile**: registro de origem de cada pacote (fonte, `ref`), incluído no
  cálculo de integridade do lockfile.
- **Identidade MCP**: par nome/versão que o Maia informa como servidor (`serverInfo`) e como
  cliente (`clientInfo`).
- **Tag de release**: marcador `vX.Y.Z` no repositório que liga uma versão publicada ao commit
  de origem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos pontos que expõem a versão do Maia (CLI, manifesto padrão,
  lockfile, identidade de servidor MCP, identidade de cliente MCP), o valor informado é igual
  ao de `maia --version`.
- **SC-002**: Um projeto novo inicializado e instalado com o pacote publicado gera um lockfile
  cuja versão da fonte `local` é encontrada no registro npm (0 respostas 404).
- **SC-003**: Subir a versão do pacote exige editar exatamente 1 lugar; nenhum outro arquivo
  precisa de ajuste manual para a nova versão aparecer em todos os pontos.
- **SC-004**: Introduzir deliberadamente uma divergência de versão faz a suíte de testes
  falhar em 100% das tentativas.
- **SC-005**: 100% dos projetos com `ref: 1.5.2` na fonte `local` ficam corrigidos após um
  único `maia i`, sem edição manual.
- **SC-006**: A partir desta correção, 100% das versões publicadas têm tag `vX.Y.Z`
  correspondente no repositório remoto.

## Assumptions

- A versão declarada no manifesto do pacote (`package.json`) é a fonte de verdade correta;
  o valor `1.5.2` é simplesmente um esquecimento, não uma versão de protocolo intencional.
- O formato do `maia.json` e do `maia.lock.json` não muda; apenas o valor do `ref` passa a
  ser correto. Por isso não é necessária nova versão de schema.
- Os nomes nas identidades MCP (`maia`, `maia-mcp-server`) permanecem como estão; só a versão
  muda.
- A escolha entre gerar a versão no build ou lê-la em tempo de execução é decisão do plano,
  desde que atenda FR-006 (inclusive execução a partir do código-fonte) e FR-008.
- Tags retroativas para versões já publicadas (anteriores a esta correção) são desejáveis
  mas opcionais; o requisito obrigatório vale a partir da próxima publicação.
- A automação de tags pode ser um passo documentado/script local; publicação automatizada em
  CI está fora do escopo desta correção.
