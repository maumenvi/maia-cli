# Feature Specification: Registro do proxy `maia` no Cursor, Cline, Continue e demais agentes

**Feature Branch**: `010-agent-mcp-registration`

**Created**: 2026-10-02

**Status**: Draft

**Input**: Descrição do usuário: issue original em [issue.md](./issue.md). A feature 009 corrigiu
o registro do proxy `maia` no Claude Code. Na mesma pesquisa apareceram três agentes em que o
arquivo que o Maia grava provavelmente não é lido, ou é lido com o formato errado: Cursor
(chave `servers` em vez de `mcpServers`), Cline (lê só o arquivo global) e Continue (formato
JSON antigo em vez de `.continue/mcpServers/*.yaml`). Codex (só aplica config de projeto
confiável) e Zed (não verificado) também precisam ser conferidos. Nada foi testado com os
agentes reais; a spec começa confirmando cada caso.

## Contexto

Pontos conferidos no código atual da branch `develop`:

- **Cursor**: o alvo `cursor` declara o formato `servers`, então o `.cursor/mcp.json` gerado
  tem `{ "servers": { "maia": … } }`. A documentação do Cursor usa `mcpServers`. O `cwd` já é
  `${workspaceFolder}` desde a 009.
- **Cline**: o alvo `cline` grava `.cline/mcp.json` no projeto, com formato `servers`. O Cline
  lê servidores MCP só do arquivo global `cline_mcp_settings.json`, gerenciado pela extensão.
  O bloco de instruções vai em `.clinerules/maia.md`.
- **Continue**: o alvo `continue` grava `.continue/config.json` com `mcpServers` como objeto.
  O Continue atual usa YAML e, por projeto, junta automaticamente os arquivos de
  `.continue/mcpServers/*.yaml`, onde `mcpServers` é uma lista de itens com `name`, `command`
  e `args`.
- **Codex**: grava `.codex/config.toml`, que o Codex só aplica em projeto marcado como
  confiável.
- **Zed**: grava `context_servers` em `.zed/settings.json`; o Zed inicia servidores na raiz do
  projeto. Formato não verificado com o agente real.
- **Local-only**: o Maia hoje não altera configs globais de agentes. Projetos "local-only"
  pulam a injeção de config e o bloco de instruções diz isso.
- **Precedente**: a 009 migrou a entrada `maia` do arquivo legado do Claude
  (`.claude/claude_desktop_config.json`) para `.mcp.json`, preservando as outras entradas e
  informando a mudança na saída.

## Clarifications

### Session 2026-10-02

- Q: Qual estratégia para o Cline, que só lê o arquivo global? → A: **B**. O Maia oferece
  gravar no `cline_mcp_settings.json` global com confirmação explícita em terminal interativo
  (padrão "não"); sem TTY, em projeto "local-only" ou com recusa, não grava e mostra a
  entrada a colar. A entrada precisa encontrar o projeto mesmo com o Cline iniciando o
  servidor fora dele.

### Ajustes do `/speckit-plan` (2026-10-02)

- A pergunta sobre o global do Cline acontece só em `maia init cline` e `maia agent add
  cline`; os demais comandos só relatam a situação (research D5).
- Não existia comando para tirar um agente do projeto; entra `maia agent rm <id...>`
  (FR-012, research D7).
- Projeto movido: as entradas do Maia no global que apontam para pasta inexistente são
  oferecidas para remoção na mesma confirmação (research D4).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cursor enxerga o proxy `maia` (Priority: P1)

Uma pessoa desenvolvedora roda `maia init cursor` e `maia mcp add <mcp>`. Ao abrir o projeto
no Cursor, o servidor `maia` aparece na lista de MCPs com as ferramentas das capacidades
instaladas. Projetos que já têm `.cursor/mcp.json` gerado por versões anteriores passam a
funcionar sem edição manual.

**Why this priority**: é a correção mais simples e de maior alcance: hoje nenhum MCP do Maia
chega ao Cursor, e o bloco de instruções afirma o contrário.

**Independent Test**: num projeto novo e num projeto com `.cursor/mcp.json` no formato antigo
(`servers.maia` mais uma entrada de outra ferramenta), rodar `maia init cursor`. Conferir que
o arquivo tem `mcpServers.maia`, que a entrada da outra ferramenta continua lá e que o Cursor
real lista o servidor `maia`.

**Acceptance Scenarios**:

1. **Given** um projeto sem `.cursor/mcp.json`, **When** a pessoa roda `maia init cursor`,
   **Then** o arquivo é criado com o proxy sob a chave `mcpServers`, sem caminho absoluto, e
   o servidor iniciado pelo Cursor encontra o projeto.
2. **Given** um `.cursor/mcp.json` com `servers.maia` gravado por versão anterior e outras
   entradas, **When** a pessoa roda `maia init cursor`, `maia mcp add` ou `maia i`, **Then** a
   entrada `maia` passa para `mcpServers.maia`, sai de `servers`, as outras entradas ficam
   intactas e a saída informa a migração.
3. **Given** um `.cursor/mcp.json` criado à mão com `mcpServers` de outras ferramentas,
   **When** o Maia registra o proxy, **Then** só a entrada `maia` é criada ou atualizada.

---

### User Story 2 - Continue enxerga o proxy `maia` (Priority: P1)

A pessoa roda `maia init continue`. O Maia grava o proxy no arquivo de servidores MCP por
projeto que o Continue atual lê, e o Continue lista as ferramentas do `maia`. A entrada
`maia` que versões anteriores gravaram em `.continue/config.json` é retirada de lá.

**Why this priority**: mesmo impacto do Cursor: hoje o registro provavelmente não tem efeito.
Há um formato documentado por projeto, então dá para corrigir sem tocar em config global.

**Independent Test**: num projeto novo e num projeto com `.continue/config.json` contendo
`mcpServers.maia` e outras configurações, rodar `maia init continue`. Conferir que existe
`.continue/mcpServers/maia.yaml` com a entrada no formato de lista, que `config.json` perdeu
só a entrada `maia` e que o Continue real lista o servidor.

**Acceptance Scenarios**:

1. **Given** um projeto sem config do Continue, **When** a pessoa roda `maia init continue`,
   **Then** o Maia cria `.continue/mcpServers/maia.yaml` com um item de `mcpServers` contendo
   `name: maia`, `command` e `args`, sem caminho absoluto.
2. **Given** um `.continue/config.json` com `mcpServers.maia` gravado por versão anterior e
   outras configurações, **When** o Maia registra o proxy, **Then** a entrada vai para
   `.continue/mcpServers/maia.yaml`, sai do `config.json`, o resto do `config.json` fica
   intacto e a saída informa a migração.
3. **Given** que, após a migração, o `config.json` ficaria sem nenhum conteúdo além de uma
   chave `mcpServers` vazia, **When** a migração termina, **Then** o arquivo é mantido (sem a
   entrada `maia`), nunca apagado.
4. **Given** outros arquivos em `.continue/mcpServers/`, **When** o Maia grava o seu, **Then**
   os outros arquivos não são alterados.

---

### User Story 3 - Cline: registro no arquivo global com confirmação (Priority: P2)

A pessoa roda `maia init cline` num terminal interativo. Como o Cline só lê o arquivo global
`cline_mcp_settings.json`, o Maia mostra o arquivo e a entrada que vai gravar e pergunta se
pode gravar (o padrão é "não"). Se ela aceitar, o Maia grava a entrada do projeto no arquivo
global, preservando todo o resto, e o Cline passa a listar o servidor deste projeto. Se ela
recusar, ou se não houver terminal interativo, ou se o projeto for "local-only", o Maia não
toca no arquivo global: a saída do CLI e o `.clinerules/maia.md` dizem que o registro está
pendente e mostram a entrada exata a colar.

**Why this priority**: o efeito hoje é o mesmo do Cursor (nenhum MCP chega ao agente), mas é
a primeira exceção ao princípio de não alterar configs globais, então exige confirmação e
cuidado com outros projetos que usam o mesmo arquivo.

**Independent Test**: com o diretório home apontado para uma pasta temporária contendo um
`cline_mcp_settings.json` com uma entrada de outra ferramenta, rodar `maia init cline` com TTY
aceitando, com TTY recusando e sem TTY. Aceitando: a entrada do projeto aparece no arquivo
global e a outra continua igual. Recusando ou sem TTY: o arquivo global não muda e as
instruções mostram a entrada a colar. Repetir em um segundo projeto e conferir que a entrada
do primeiro continua lá. No Cline real, conferir que o servidor encontra o projeto certo.

**Acceptance Scenarios**:

1. **Given** um terminal interativo e um projeto que não é "local-only", **When** a pessoa
   roda `maia init cline` ou `maia agent add cline`, **Then** o Maia mostra o caminho do
   arquivo global e a entrada, e pergunta antes de gravar; o padrão é "não". Os demais
   comandos que reconfiguram agentes (`maia mcp add`, `maia i`, `maia ci`, …) nunca
   perguntam: só relatam a situação do registro e, se estiver pendente, indicam
   `maia agent add cline`.
2. **Given** que a pessoa aceitou, **When** a gravação termina, **Then** o arquivo global
   contém a entrada do projeto, todas as outras entradas e configurações ficam intactas, e o
   `.clinerules/maia.md` diz que o registro foi feito no arquivo global.
3. **Given** que a pessoa recusou, ou que não há terminal interativo, ou que o projeto é
   "local-only", **When** o comando termina, **Then** o arquivo global não é tocado, o comando
   não falha por isso, e a saída do CLI e o `.clinerules/maia.md` dizem que o registro está
   pendente e mostram a entrada exata a colar e onde.
4. **Given** dois projetos Maia registrados no mesmo arquivo global, **When** o Cline inicia
   o servidor de cada um, **Then** cada servidor encontra o seu projeto, e registrar o segundo
   projeto não sobrescreve nem altera a entrada do primeiro.
5. **Given** um projeto já registrado no global com a entrada atual, **When** o Maia roda de
   novo, **Then** não pergunta outra vez nem muda o arquivo.
6. **Given** um projeto registrado no global, **When** a pessoa remove o agente `cline` do
   projeto com `maia agent rm cline`, **Then** o Maia oferece remover a entrada daquele projeto do arquivo global, com a
   mesma confirmação, sem tocar nas outras.
7. **Given** projetos com `.cline/mcp.json` gravado por versões anteriores, **When** o Maia
   reconfigura o Cline, **Then** a entrada `maia` desse arquivo é removida, outras entradas
   são preservadas e a saída explica por quê.
8. **Given** que o arquivo global não existe ou a pasta do Cline não é encontrada, **When** o
   Maia tenta registrar, **Then** ele não cria pastas da extensão por conta própria e cai no
   comportamento do cenário 3 (registro pendente com instruções).

### User Story 4 - Codex e Zed conferidos (Priority: P3)

A pessoa usa Codex ou Zed. O registro gerado pelo Maia é o que o agente lê, e quando o
agente exige um passo extra (projeto confiável no Codex) a saída e o bloco de instruções
avisam.

**Why this priority**: os formatos parecem corretos; o trabalho é confirmar e avisar, não
corrigir um defeito conhecido.

**Independent Test**: rodar `maia init codex` e `maia init zed`. Conferir os arquivos contra
a documentação oficial; no Codex, conferir que a saída e o `AGENTS.md` avisam sobre projeto
confiável.

**Acceptance Scenarios**:

1. **Given** um projeto com o agente `codex`, **When** o Maia registra o proxy em
   `.codex/config.toml`, **Then** a saída do CLI e o bloco de instruções avisam que o Codex só
   aplica a config de projeto quando o projeto está marcado como confiável.
2. **Given** um projeto com o agente `zed`, **When** o Maia registra o proxy, **Then** o
   `.zed/settings.json` segue o formato `context_servers` documentado, preservando outras
   configurações do arquivo.
3. **Given** que a verificação mostre formato ou local divergente, **When** isso for
   confirmado, **Then** o caso é corrigido com migração do legado, como nas US1 e US2.

---

### User Story 5 - Contrato verificável por agente (Priority: P2)

Quem mantém o Maia altera o registro de um agente. Um teste por agente falha se o arquivo
gerado sair do formato que o agente espera, e existe um roteiro manual curto para validar
cada agente real.

**Why this priority**: os três defeitos vieram de formatos nunca checados contra o agente.
Sem contrato, o problema volta.

**Independent Test**: alterar de propósito a chave de um alvo e ver o teste de contrato
daquele agente falhar; seguir o roteiro manual de um agente e chegar ao servidor `maia`
listado.

**Acceptance Scenarios**:

1. **Given** cada agente suportado, **When** a suíte de testes roda, **Then** existe um teste
   que compara o arquivo gerado com o formato exato documentado para aquele agente (local,
   chave, estrutura, ausência de caminho absoluto).
2. **Given** a documentação do projeto, **When** alguém quer validar um agente real, **Then**
   encontra um passo a passo por agente com a fonte oficial citada e o resultado esperado.

### Edge Cases

- Arquivo de config do agente com JSON/YAML/TOML inválido: o Maia não sobrescreve; falha
  com mensagem que indica o arquivo e não altera os demais agentes.
- `.cursor/mcp.json` com `maia` nas duas chaves (`servers` e `mcpServers`): a entrada em
  `mcpServers` é atualizada e a de `servers` removida.
- Entrada `maia` no arquivo legado editada à mão (comando ou args diferentes): a migração
  grava a entrada padrão do Maia no lugar novo e remove a antiga; a saída avisa.
- Projeto "local-only": nenhuma config global é tocada em nenhum agente; o bloco de
  instruções diz o que falta, como já exige o FR-005 da 009.
- Rodar `maia init <agente>` duas vezes seguidas: o segundo run não muda nenhum arquivo nem
  repete aviso de migração.
- Pasta `.continue/mcpServers/` inexistente: é criada.
- Arquivo global do Cline alterado pela extensão enquanto o Maia grava: o Maia relê o
  arquivo imediatamente antes de gravar e só muda a entrada do projeto.
- Projeto movido de pasta depois de registrado no global do Cline: a entrada antiga aponta
  para uma pasta que não existe mais; ao registrar o projeto na pasta nova, o Maia lista as
  entradas suas que apontam para pastas inexistentes e oferece removê-las na mesma
  confirmação.
- Agente removido do projeto (`maia agent rm <id>`): o Maia tira o agente do `maia.json`,
  remove a entrada `maia` do arquivo de config do projeto (preservando o resto), remove o
  bloco gerenciado do arquivo de instruções e o perfil em `.maia/agents/<id>/`. As cópias de
  skills na pasta nativa do agente ficam, e a saída avisa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Para cada agente suportado, a pesquisa da feature MUST registrar qual arquivo o
  agente lê, em qual formato e de que pasta inicia o servidor, citando a documentação oficial
  e, quando possível, o resultado do teste com o agente real.
- **FR-002**: O registro do proxy para o Cursor MUST usar `.cursor/mcp.json` com a chave
  `mcpServers`, no formato stdio documentado pelo Cursor, indicando o projeto por uma
  variável de pasta que o Cursor expande (research D2).
- **FR-003**: O registro do proxy para o Continue MUST usar `.continue/mcpServers/maia.yaml`,
  com `mcpServers` como lista de itens contendo `name`, `command` e `args`.
- **FR-004**: Entradas `maia` gravadas por versões anteriores no local ou formato errado
  (`servers.maia` no `.cursor/mcp.json`, `mcpServers.maia` no `.continue/config.json`, entrada
  em `.cline/mcp.json`) MUST ser migradas ou removidas por `maia init`, `maia mcp add` e
  `maia i`, preservando todas as outras entradas e configurações dos arquivos.
- **FR-005**: Toda migração MUST ser informada na saída do CLI, com o arquivo de origem e o
  de destino, e MUST ser idempotente.
- **FR-006**: Para o Cline, o Maia MUST oferecer gravar a entrada do projeto no arquivo global
  `cline_mcp_settings.json` só com confirmação explícita em terminal interativo (padrão
  "não"), e MUST NOT gravar sem TTY, em projeto "local-only" ou quando a pessoa recusar.
- **FR-006a**: A gravação no arquivo global MUST preservar todas as entradas e configurações
  existentes, MUST identificar a entrada pelo projeto de forma que projetos diferentes não se
  sobrescrevam, e MUST fazer o servidor iniciado pelo Cline encontrar aquele projeto mesmo
  que o Cline o inicie fora da pasta do projeto.
- **FR-006b**: Quando o agente `cline` for removido do projeto, o Maia MUST oferecer, com a
  mesma confirmação, remover só a entrada daquele projeto do arquivo global.
- **FR-007**: Quando o registro automático não for possível ou não for efetivo sem um passo
  extra (Cline sem escrita global, Codex sem projeto confiável), a saída do CLI e o bloco de
  instruções do agente MUST dizer isso e mostrar o passo que falta (FR-005 da 009).
- **FR-008**: Nenhum arquivo de projeto escrito para qualquer agente MUST conter caminho
  absoluto da máquina (FR-004 da 009 continua valendo). O arquivo global do Cline não é
  arquivo de projeto nem é versionado, então pode conter o caminho do projeto quando isso for
  necessário para o FR-006a.
- **FR-009**: Arquivos de config do agente que não puderem ser lidos (sintaxe inválida) MUST
  NOT ser sobrescritos; o Maia MUST falhar com mensagem que indique o arquivo.
- **FR-010**: A suíte MUST ter um teste de contrato por agente suportado, verificando local,
  chave, estrutura e ausência de caminho absoluto do arquivo gerado.
- **FR-011**: A documentação MUST incluir um roteiro manual de validação por agente real e
  atualizar a seção "Erros conhecidos" do README (en/pt-BR) e os follow-ups do `AGENT.md`
  conforme cada caso for corrigido.
- **FR-012**: O Maia MUST oferecer `maia agent rm <id...>` para tirar um agente do projeto,
  com a limpeza descrita nos casos de borda e, para o Cline, a oferta do FR-006b.

### Key Entities

- **Alvo de agente**: o agente suportado, com o arquivo de registro que o agente lê, o
  formato desse arquivo, a estratégia de pasta do projeto e o arquivo de instruções.
- **Registro legado**: um local ou formato que versões anteriores do Maia gravavam para um
  agente e que precisa ser migrado ou removido.
- **Situação do registro**: o que o bloco de instruções e a saída do CLI relatam por agente:
  registrado, pulado (com motivo) ou dependente de passo manual (com o passo).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos agentes com registro automático, o servidor `maia` aparece no
  agente real (ou bate exatamente com o formato da documentação oficial citada, quando o
  teste real não for possível) logo após `maia init <agente>`, sem edição manual.
- **SC-002**: Em projetos criados por versões anteriores, 100% das entradas não-`maia` dos
  arquivos de config migrados continuam presentes e iguais após a migração.
- **SC-003**: Nenhum bloco de instruções gerado afirma um registro que o agente não lê
  (zero casos nos testes de contrato e no roteiro manual).
- **SC-004**: Alterar o formato de registro de qualquer agente faz pelo menos um teste falhar.
- **SC-005**: Uma pessoa segue o roteiro manual de um agente e confirma o servidor `maia` em
  menos de 5 minutos.

## Assumptions

- A documentação oficial citada na issue (Cursor, Continue, Cline, Codex) é a referência
  quando não houver acesso ao agente real; divergências encontradas no teste real prevalecem.
- O nome do arquivo do Continue é `maia.yaml`, para não colidir com arquivos de outras
  ferramentas na mesma pasta.
- O `.continue/config.json` legado é mantido (sem a entrada `maia`), nunca apagado, porque
  pode ter outras configurações da pessoa.
- Claude Code e Copilot já foram corrigidos ou verificados na 009 e ficam fora do escopo,
  exceto pelo teste de contrato (FR-010), que cobre todos os agentes.
- A descoberta da raiz do projeto pelo `maia mcp-server` (FR-004a da 009) continua valendo;
  a forma de a entrada global do Cline indicar o projeto (pasta de trabalho, argumento ou
  variável de ambiente) e o nome único da entrada ficam para o plano.
- O local do `cline_mcp_settings.json` depende do editor e do sistema operacional (pasta de
  dados da extensão). O plano define quais locais são suportados; fora deles vale o registro
  pendente com instruções.
- Esta é a primeira exceção ao princípio de não alterar configs globais de agentes; ela vale
  só para o Cline, que não tem alternativa por projeto.
- Os demais aspectos de skills e instruções por agente (pastas de skills, arquivos de
  instruções) ficam como estão, salvo o texto de situação do registro.
