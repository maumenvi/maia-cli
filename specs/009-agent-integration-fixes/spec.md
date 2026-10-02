# Feature Specification: Integração com o Claude Code, skills completas, instalação segura e variáveis globais

**Feature Branch**: `009-agent-integration-fixes`

**Created**: 2026-10-01

**Status**: Draft

**Input**: Descrição do usuário: relato de uso do Maia 1.6.1 com o agente `claude` (Claude
Code, extensão VS Code, Linux, Node 26.8.2), com três problemas e um extra, mais uma
funcionalidade nova:

1. O proxy `maia` é registrado em `.claude/claude_desktop_config.json`, que o Claude Code não
   lê. O agente fica sem nenhum MCP, mas o `CLAUDE.md` gerado afirma que eles estão
   registrados.
2. `maia skills add` copia só o `SKILL.md`; os arquivos de referência da skill não vêm junto.
3. `maia skills add --help` trata `--help` como termo de busca e **instala** o primeiro
   resultado do catálogo (uma skill de terceiro não confiável), sem confirmação. `maia mcp
   add --help` também busca `--help` no catálogo.
4. Extra: a skill `security-review` tem o mesmo nome do comando nativo `/security-review` do
   Claude Code.
5. Nova funcionalidade: "Maia deve ser capaz de registrar variáveis do maia globalmente, além
   do projeto. Quando usar `maia mcp i` ou `find <nome do mcp> -env-g`, a env deve ficar
   global e não no projeto."

## Contexto

Pontos conferidos no código atual da branch:

- **Claude:** o alvo `claude` lista dois arquivos de config, `.mcp.json` e
  `.claude/claude_desktop_config.json`, e o Maia usa **o primeiro que já existir**. Versões
  antigas do Maia gravavam só `.claude/claude_desktop_config.json`. Em projetos criados
  naquela época esse arquivo já existe, então o Maia continua escrevendo nele e nunca cria o
  `.mcp.json`. O registro do proxy também grava `cwd` com o caminho absoluto do projeto.
- **Skills:** buscar, materializar e copiar para o agente tratam a skill como um único
  arquivo (`skills/<nome>/SKILL.md`). O `AGENT.md` já anota isso como pendência conhecida.
- **`--help`:** `maia skills add|find` e `maia mcp add|find` passam os argumentos direto para
  a busca no catálogo. Nenhum subcomando reconhece `--help` ou `-h`. O `maia mcp add` instala
  o melhor resultado sem perguntar, e o `maia skills add` tenta os resultados em ordem até um
  instalar.
- **Autorização:** instalações vindas do catálogo recebem `allowedLlms: ["*"]` por padrão,
  sem considerar se a fonte é confiável.
- **Alias:** `maia mcp i` não existe hoje; só `add` e `install`.
- **Variáveis:** as credenciais de MCP ficam só em `.maia/mcp.env`, no projeto. Não existe
  nenhum local global do Maia.

## Clarifications

### Session 2026-10-01

- Q: O que fazer com `allowedLlms` quando a fonte é `trusted: false`? → A: **B**, a opção
  recomendada, adotada como padrão no `/speckit-plan` porque a pergunta ficou sem resposta;
  pode ser revista antes do `/speckit-tasks`. Em terminal interativo, o Maia pergunta se
  autoriza a capacidade para os agentes configurados (o padrão é "não"). Sem terminal, instala
  sem autorizar nenhum agente e explica como liberar. `--all-llms`/`--llms` na linha de
  comando contam como autorização explícita.
- Q: O FR-004 (sem caminho absoluto) vale só para Claude e Copilot ou para todos os agentes?
  → A: **todos os agentes**. O proxy deve funcionar para qualquer agente sem caminho absoluto
  nos arquivos do projeto. A estratégia por agente está no research D3: variável de pasta do
  workspace quando o agente a expande, ou nenhum `cwd`, com o `maia mcp-server` descobrindo a
  raiz do projeto sozinho.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Claude Code enxerga os MCPs do Maia (Priority: P1)

Uma pessoa desenvolvedora roda `maia init claude` e `maia mcp add <mcp>` num projeto. Ao
abrir ou reiniciar o Claude Code, a sessão lista as ferramentas do proxy `maia`, e o
`CLAUDE.md` só afirma o que de fato está registrado.

**Why this priority**: sem isso, nenhuma capacidade instalada chega ao agente. É a principal
função do Maia para quem usa Claude Code, e hoje falha em silêncio.

**Independent Test**: num projeto novo e num projeto que já tem
`.claude/claude_desktop_config.json` de uma versão antiga, rodar `maia init claude` e
`maia mcp add <mcp>`. Verificar que o `.mcp.json` na raiz contém o proxy `maia` sem caminho
absoluto, e que uma sessão do Claude Code aberta na raiz lista as ferramentas do `maia`.

**Acceptance Scenarios**:

1. **Given** um projeto sem `.mcp.json`, **When** a pessoa roda `maia init claude`, **Then**
   o Maia cria `.mcp.json` na raiz com o proxy `maia` e a saída mostra esse arquivo.
2. **Given** um projeto com `.claude/claude_desktop_config.json` gravado por uma versão
   antiga do Maia e sem `.mcp.json`, **When** a pessoa roda `maia mcp add`, `maia i` ou
   `maia init claude`, **Then** o proxy passa a ser registrado em `.mcp.json`, a entrada
   `maia` antiga sai do arquivo legado e a saída informa a mudança.
3. **Given** um `.mcp.json` já existente, criado à mão ou com servidores de outras
   ferramentas, **When** o Maia registra o proxy, **Then** as outras entradas são
   preservadas e só a entrada `maia` é criada ou atualizada.
4. **Given** qualquer registro do proxy num arquivo do projeto, **When** o arquivo é
   inspecionado, **Then** ele não contém caminho absoluto da máquina, e o mesmo vale para o
   perfil de capacidades do agente em `.maia/agents/<id>/`. Isso vale para todos os agentes
   suportados.
5. **Given** que o registro no arquivo lido pelo agente falhou ou foi pulado (por exemplo,
   projeto "local-only"), **When** o Maia atualiza o bloco gerenciado do `CLAUDE.md`, **Then**
   o bloco não afirma que os MCPs estão registrados e diz o que falta fazer.
6. **Given** um proxy registrado sem caminho absoluto, **When** o agente inicia o
   `maia mcp-server` a partir da raiz do projeto, de uma subpasta, ou com a variável de projeto
   do agente definida, **Then** o proxy encontra o projeto e expõe as capacidades; fora de
   qualquer projeto, falha com mensagem clara sem criar arquivos.

---

### User Story 2 - `--help` nunca instala nada (Priority: P1)

A pessoa roda `maia skills add --help` (ou `-h`, ou `maia mcp add --help`, `maia skills find
-h`, `maia toolkit i --help`…) para ler a ajuda. O Maia mostra a ajuda daquele subcomando e
termina, sem acessar o catálogo nem alterar nenhum arquivo.

**Why this priority**: hoje um comando de leitura instala conteúdo de terceiro não confiável
e o anuncia ao agente. É um problema de segurança, porque o agente passa a seguir instruções
que ninguém escolheu.

**Independent Test**: em um projeto inicializado, rodar cada subcomando com `--help` e com
`-h`. Comparar `maia.json`, `maia.lock.json`, `.maia/`, `.claude/` e `CLAUDE.md` antes e
depois (sem diferença), e confirmar que nenhuma requisição de catálogo foi feita.

**Acceptance Scenarios**:

1. **Given** um projeto inicializado, **When** a pessoa roda `maia skills add --help`,
   **Then** a saída é a ajuda de `skills add`, o exit code é 0 e nenhum arquivo muda.
2. **Given** qualquer subcomando do Maia, **When** `--help` ou `-h` aparece em qualquer
   posição dos argumentos, **Then** o comportamento é o mesmo: só ajuda, sem efeito.

---

### User Story 3 - Instalação por busca pede confirmação (Priority: P1)

A pessoa roda `maia skills add <termo>` ou `maia mcp add <termo>` com um termo que não é um
identificador exato. O Maia mostra os candidatos e pede para ela escolher. Sem terminal
interativo, ele falha e explica como passar o identificador exato. Instalações de fontes não
confiáveis não ficam autorizadas automaticamente para todos os agentes.

**Why this priority**: mesma raiz de segurança da US2. Um termo ambíguo nunca deve resultar
na instalação silenciosa do primeiro resultado.

**Independent Test**: com o catálogo simulado, rodar `skills add caveman` e `mcp add
context` com e sem TTY. Com TTY: aparece a lista e nada é instalado sem escolha. Sem TTY:
exit ≠ 0, nada instalado e a mensagem cita o formato exato. Com identificador exato
(`owner/repo@skill`, nome canônico do registry): instala direto, como hoje.

**Acceptance Scenarios**:

1. **Given** um termo com um ou mais resultados que não correspondem exatamente a um
   identificador, **When** a pessoa roda `skills add`/`mcp add` num terminal interativo,
   **Then** o Maia lista os candidatos (nome, origem e se a fonte é confiável) e só instala o
   escolhido; cancelar não instala nada.
2. **Given** o mesmo termo em modo não interativo, **When** o comando roda, **Then** ele falha
   sem instalar nada e mostra os candidatos com o identificador exato de cada um.
3. **Given** um identificador exato, **When** `skills add`/`mcp add` roda, **Then** a
   instalação acontece direto, como hoje.
4. **Given** uma capacidade de fonte não confiável, **When** ela é instalada, **Then** em
   terminal interativo o Maia pergunta se autoriza a capacidade para os agentes configurados
   (o padrão é "não"); sem terminal, instala sem autorizar nenhum agente e mostra como liberar
   (`--all-llms` ou `--llms <ids>`). Fontes confiáveis continuam autorizadas como hoje.

---

### User Story 4 - Skill instalada com todos os arquivos (Priority: P2)

A pessoa instala uma skill que, além do `SKILL.md`, traz arquivos de referência, scripts ou
outros arquivos (formato Agent Skills). A pasta da skill no projeto e no diretório nativo do
agente contém a árvore completa, e o `maia verify` acusa arquivo faltando ou alterado.

**Why this priority**: sem os arquivos de apoio, a skill roda incompleta e o agente tenta
abrir arquivos que não existem. Não é um risco de segurança como US2/US3, mas quebra o
resultado.

**Independent Test**: instalar uma skill de teste com `SKILL.md`, `references/a.md` e
`scripts/b.sh`. Conferir a árvore em `.maia/skills/<nome>/` e em `.claude/skills/<nome>/`.
Apagar `references/a.md` e confirmar que o `maia verify` acusa o problema. Rodar `maia ci` num
clone limpo e confirmar que a árvore volta inteira.

**Acceptance Scenarios**:

1. **Given** uma skill remota com arquivos irmãos e subpastas, **When** a pessoa roda
   `maia skills add`, **Then** todos os arquivos da pasta da skill são copiados, com a mesma
   estrutura, para o projeto e para o diretório nativo do agente.
2. **Given** uma skill instalada, **When** qualquer arquivo dela é removido ou alterado,
   **Then** o `maia verify` falha e indica o arquivo.
3. **Given** um `maia.lock.json` com a skill, **When** `maia ci` roda num clone sem a pasta,
   **Then** a árvore completa é restaurada e verificada.
4. **Given** um `maia.lock.json` antigo que registra a skill como arquivo único, **When**
   `maia i` roda, **Then** a skill é reinstalada como pasta completa e o lock é atualizado.

---

### User Story 5 - Variáveis de MCP globais (Priority: P2)

A pessoa usa a mesma credencial (por exemplo, um token do GitHub) em vários projetos. Ao
instalar um MCP com `maia mcp i <mcp> --env-g` (ou `maia mcp find <termo> --env-g`), os
valores pedidos ficam num arquivo global do Maia, fora do projeto. Qualquer projeto que use
esse MCP passa a encontrá-los sem precisar repetir a configuração.

**Why this priority**: funcionalidade nova pedida. Reduz configuração repetida e evita
espalhar segredos em vários projetos. Não corrige defeito existente, então vem depois das
correções de segurança.

**Independent Test**: com o diretório home apontado para uma pasta temporária, instalar um
MCP que pede `X_TOKEN` com `--env-g` e informar o valor. Verificar que o valor está no arquivo
global e que `.maia/mcp.env` do projeto não tem o valor nem um placeholder vazio. Em outro
projeto, instalar o mesmo MCP sem `--env-g` e confirmar que o Maia não pede `X_TOKEN` de novo e
que o MCP sobe com o valor.

**Acceptance Scenarios**:

1. **Given** um MCP que exige credenciais, **When** a pessoa roda `maia mcp i <mcp> --env-g`,
   **Then** os valores informados são gravados no arquivo global do Maia e não no projeto, e
   a saída mostra o caminho do arquivo global.
2. **Given** um valor definido globalmente, **When** o MCP sobe a partir de qualquer projeto,
   **Then** ele recebe o valor global.
3. **Given** a mesma variável definida no projeto e no global, **When** o MCP sobe, **Then** o
   valor do projeto prevalece. A variável já exportada no ambiente do processo prevalece sobre
   os dois.
4. **Given** uma variável definida só no global, **When** `maia i`, `maia ci` ou outra
   instalação sem `--env-g` roda no projeto, **Then** o Maia não cria placeholder vazio para ela
   no `.maia/mcp.env` do projeto, que mascararia o valor global.
5. **Given** `maia mcp i` (alias novo), **When** a pessoa roda, **Then** o comportamento é igual
   ao de `maia mcp add`/`install`.

---

### User Story 6 - Aviso de colisão com comandos nativos do agente (Priority: P3)

Ao instalar uma skill cujo nome coincide com um comando nativo do agente configurado (ex.:
`security-review` no Claude Code), o Maia avisa da colisão e permite instalar com outro nome
(`--as <nome>`).

**Why this priority**: evita ambiguidade, mas não quebra nada nem é risco de segurança.

**Independent Test**: instalar `security-review` com o agente `claude` configurado: aparece o
aviso. Instalar com `--as sentry-security-review`: a pasta, o registro e o bloco do
`CLAUDE.md` usam o nome novo.

**Acceptance Scenarios**:

1. **Given** o agente `claude` configurado, **When** a pessoa instala uma skill com nome de
   comando nativo conhecido, **Then** o Maia instala e mostra um aviso sugerindo `--as`.
2. **Given** `--as <nome>`, **When** a skill é instalada, **Then** ela é registrada e copiada com
   esse nome em todos os lugares, e a origem original fica registrada no manifesto/lock.

---

### Edge Cases

- **`.mcp.json` inválido (JSON quebrado)**: o Maia não sobrescreve. Falha com mensagem que
  indica o arquivo, sem perder o conteúdo da pessoa.
- **Arquivo legado `.claude/claude_desktop_config.json` com outras entradas além de `maia`**:
  só a entrada `maia` é removida; se o arquivo ficar sem nenhum servidor, ele continua
  existindo (o Maia não apaga arquivos que não criou sozinho nesta execução).
- **Agente que inicia o proxy fora da pasta do projeto** (por exemplo, a partir da pasta de
  instalação do editor): o proxy não encontra a raiz e falha com mensagem que diz qual
  variável ou configuração resolver; não cria `.maia/` na pasta errada.
- **Agente que não lê o arquivo de projeto gerado pelo Maia** (ex.: Cline lê só o arquivo
  global `cline_mcp_settings.json`): o arquivo de projeto continua sem caminho absoluto; o
  registro efetivo nesse agente fica fora do escopo e é documentado.
- **Pessoa que realmente quer o Claude Desktop**: fora do escopo automático. O Claude Desktop
  lê um arquivo global da máquina, e o Maia não modifica configs globais de agentes
  (comportamento já existente para projetos "local-only").
- **`--help` junto com um nome** (`maia skills add foo --help`): mostra ajuda, não instala.
- **Termo que coincide exatamente com o nome de um único resultado**: conta como identificador
  exato e instala direto.
- **Skill remota muito grande ou com arquivos binários**: copiar tudo da pasta da skill, com um
  limite de tamanho total que, se excedido, falha a instalação com mensagem clara (o limite
  fica para o plano).
- **Skill com arquivos fora da própria pasta** (links `../`): não são copiados; só a árvore
  abaixo da pasta que contém o `SKILL.md`.
- **Arquivo global de variáveis inexistente ou ilegível**: projetos funcionam como hoje, só
  com `.maia/mcp.env`.
- **Permissões do arquivo global**: ele contém segredos; deve ser criado legível só pela
  pessoa dona (equivalente a `0600`).
- **`--env-g` em comando que não pede credencial**: sem efeito, com aviso de que nada foi
  gravado.
- **Projeto que define a variável vazia** (`X_TOKEN=`) no `.maia/mcp.env` e global com valor:
  vazio no projeto não mascara o global.

## Requirements *(mandatory)*

### Functional Requirements

**Registro no Claude Code (US1)**

- **FR-001**: Para o agente `claude`, o Maia MUST registrar o proxy `maia` em `.mcp.json` na
  raiz do projeto, criando o arquivo se ele não existir.
- **FR-002**: Se `.claude/claude_desktop_config.json` existir com uma entrada `maia` (a chave
  do proxy do Maia), o Maia MUST migrar a entrada para `.mcp.json`, remover a entrada `maia` do
  arquivo legado e informar isso na saída.
- **FR-003**: O Maia MUST preservar as outras entradas existentes em `.mcp.json` e no arquivo
  legado, mudando só a entrada `maia`.
- **FR-004**: Arquivos de projeto escritos pelo Maia para **qualquer** agente (config MCP e
  perfil de capacidades em `.maia/agents/<id>/`) MUST NOT conter caminhos absolutos da máquina.
- **FR-004a**: O `maia mcp-server` MUST descobrir a raiz do projeto sem depender de caminho
  gravado: primeiro pela variável que o agente fornece ao processo (ex.: `CLAUDE_PROJECT_DIR`
  no Claude Code), depois subindo a partir da pasta em que foi iniciado. Se nenhuma raiz for
  encontrada, MUST falhar com mensagem clara no stderr, sem criar arquivos fora de um projeto.
- **FR-005**: O bloco gerenciado nas instruções do agente (`CLAUDE.md` e equivalentes) MUST
  afirmar que os MCPs estão registrados somente quando o arquivo de config lido pelo agente
  foi efetivamente atualizado; caso contrário, MUST dizer que o registro não foi feito e
  como resolver.

**Ajuda (US2)**

- **FR-006**: Em qualquer subcomando, `--help` ou `-h` em qualquer posição MUST mostrar a
  ajuda daquele subcomando e terminar com exit 0, sem consultar catálogo, sem rede e sem
  alterar arquivos.

**Instalação por busca (US3)**

- **FR-007**: `maia skills add` e `maia mcp add` com um termo que não seja identificador exato
  MUST listar os candidatos (nome, origem e confiança da fonte) e instalar só após a escolha
  explícita, em terminal interativo.
- **FR-008**: Sem terminal interativo, nas mesmas condições do FR-007, o comando MUST falhar
  (exit ≠ 0) sem instalar nada e listar os identificadores exatos dos candidatos.
- **FR-009**: Identificadores exatos (`owner/repo@skill`, nome canônico do registry, ou nome
  idêntico ao de um único resultado) MUST continuar instalando direto.
- **FR-010**: Capacidades vindas de fontes não confiáveis MUST NOT ser autorizadas para
  agentes sem consentimento explícito: confirmação interativa (padrão "não") ou `--all-llms`/
  `--llms` na linha de comando. Sem nenhum dos dois, a instalação acontece sem autorizar
  nenhum agente, e a saída mostra como liberar.

**Skills completas (US4)**

- **FR-011**: A unidade de uma skill MUST ser a pasta que contém o `SKILL.md`, com todos os
  arquivos e subpastas abaixo dela, tanto na instalação no projeto quanto na cópia para o
  diretório nativo do agente.
- **FR-012**: O lockfile MUST registrar a integridade da pasta inteira da skill, e o `maia
  verify` MUST falhar indicando o arquivo quando algum for removido, alterado ou adicionado.
- **FR-013**: `maia ci` MUST restaurar a pasta completa de cada skill a partir do lockfile.
- **FR-014**: Lockfiles e manifestos que registram a skill como arquivo único MUST continuar
  sendo lidos; o próximo `maia i` MUST atualizar a skill para o formato de pasta.
- **FR-015**: Arquivos fora da pasta da skill MUST NOT ser copiados, e a instalação MUST
  falhar com mensagem clara se a skill exceder o limite de tamanho definido no plano.

**Variáveis globais (US5)**

- **FR-016**: O Maia MUST manter um arquivo global de variáveis de MCP, fora de qualquer
  projeto, criado com permissão de leitura só para a pessoa dona.
- **FR-017**: `maia mcp add|install|i` e `maia mcp find` MUST aceitar `--env-g`, que faz as
  credenciais pedidas serem gravadas no arquivo global em vez do projeto. A saída MUST mostrar
  o caminho do arquivo usado.
- **FR-018**: Ao subir um MCP, a ordem de precedência MUST ser: variável do ambiente do
  processo > valor não vazio no `.maia/mcp.env` do projeto > arquivo global.
- **FR-019**: O Maia MUST NOT pedir, nem criar placeholder no projeto, para uma variável que
  já tem valor no arquivo global.
- **FR-020**: `maia mcp i` MUST ser alias de `maia mcp add`.

**Colisão de nomes (US6)**

- **FR-021**: Ao instalar uma skill cujo nome coincide com um comando nativo conhecido de um
  agente configurado, o Maia MUST avisar e sugerir `--as <nome>`.
- **FR-022**: `maia skills add ... --as <nome>` MUST instalar a skill com o nome informado em
  todos os lugares, mantendo a origem original registrada.

### Key Entities

- **Config MCP do agente**: arquivo que o agente lê para descobrir servidores MCP. Para o
  Claude Code, `.mcp.json` na raiz do projeto.
- **Arquivo legado do Claude**: `.claude/claude_desktop_config.json`, gravado por versões
  antigas do Maia e não lido pelo Claude Code.
- **Bloco de capacidades**: seção gerenciada pelo Maia nas instruções do agente; deve
  refletir o estado real do registro.
- **Skill (pasta)**: pasta com `SKILL.md` e arquivos de apoio; a integridade cobre a pasta
  inteira.
- **Candidato de catálogo**: resultado de busca com nome, origem, confiança da fonte e
  identificador exato.
- **Arquivo global de variáveis**: credenciais de MCP compartilhadas entre projetos, da pessoa
  usuária, fora do repositório.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos projetos com o agente `claude` configurado, uma sessão nova do
  Claude Code aberta na raiz lista as ferramentas do proxy `maia`, inclusive em projetos
  criados com versões antigas do Maia após um único `maia i`.
- **SC-002**: Nenhum arquivo de projeto escrito pelo Maia para agentes contém caminho absoluto
  da máquina; o mesmo arquivo pode ser versionado e funciona em outra máquina.
- **SC-003**: 0 instalações acontecem a partir de qualquer comando com `--help`/`-h`.
- **SC-004**: 0 instalações acontecem a partir de termo ambíguo sem escolha explícita da
  pessoa.
- **SC-005**: 100% dos arquivos de uma skill instalada estão presentes no projeto e no
  diretório nativo do agente, e qualquer arquivo faltando ou alterado é detectado pelo `maia
  verify`.
- **SC-006**: Uma credencial configurada uma vez com `--env-g` é usada em todos os projetos sem
  ser pedida de novo.
- **SC-007**: O texto gerado nas instruções do agente nunca afirma um registro que não
  aconteceu.

## Assumptions

- O Claude Code lê `.mcp.json` na raiz do projeto e executa os servidores a partir dela, então
  `cwd` não é necessário (relato da pessoa usuária e contorno manual validado por ela).
- O comando do proxy continua sendo `maia` no `PATH` (instalação global), como hoje.
- Registrar no Claude Desktop (arquivo global da máquina) fica fora do escopo; o Maia não
  altera configs globais de agentes.
- O arquivo global de variáveis fica no diretório de configuração da pessoa usuária
  (`${XDG_CONFIG_HOME:-~/.config}/maia/mcp.env`; no Windows, `%APPDATA%\maia\mcp.env`). Não
  pode ser `~/.maia`, porque o Maia trata pastas com `.maia` como raiz de projeto.
- A flag pedida como `-env-g` é aceita como `--env-g`, com o sinônimo longo `--env-global`. O
  formato com um hífen só (`-env-g`) também é aceito, porque foi o que a pessoa escreveu.
- A lista de comandos nativos do Claude Code usada no aviso de colisão é mantida pelo Maia e
  pode ficar desatualizada; o aviso é informativo, não bloqueia.
- A pasta inteira da skill vem da mesma fonte e do mesmo commit já usados hoje para o
  `SKILL.md`.
- Esta spec agrupa várias correções e uma funcionalidade nova. Cada user story é independente
  e pode ser entregue e liberada separadamente.
