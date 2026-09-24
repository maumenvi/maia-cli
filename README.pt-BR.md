# Maia

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D26.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

[English](./README.md) | Português

O Maia é a forma mais rápida de transformar o uso de agentes em um fluxo repetível e pronto para produção.

Em vez de configurar cada cliente manualmente, procurar arquivos de configuração, duplicar integrações e manter setups isolados para Claude, Copilot, Cursor, Zed, Cline e Continue, o Maia oferece uma camada única de controle para descobrir, instalar e expor skills, MCPs e tools dentro do seu projeto.

Com poucos comandos, você pode:

- inicializar uma estrutura pronta para agentes;
- instalar e organizar skills, MCPs e tools;
- expor tudo por meio de um único MCP server;
- conectar um ou vários agentes ao mesmo projeto;
- reduzir a fricção de setup e acelerar a adoção de AI no time.

Se a ideia for ter um hub operacional único para capacidades de agentes, com configuração reproduzível, onboarding mais rápido e integração prática com os principais clientes do mercado, o Maia foi feito para isso.

## Por que usar o Maia?

Porque trabalhar com agentes em projetos reais não deveria significar configurar cada cliente manualmente, duplicar integrações e manter várias fontes de verdade.

O Maia resolve isso ao oferecer:

- um único fluxo para instalar e organizar skills, MCPs e tools;
- um MCP server central para expor as capacidades instaladas;
- configuração automática para diferentes agentes e editores;
- onboarding mais rápido para times inteiros;
- uma base mais previsível, reproduzível e escalável para desenvolvimento com AI.

Na prática, o Maia encurta o caminho entre "quero usar esse agente no meu projeto" e "o agente já está operando com as capacidades certas".

## CLI-only por design

O Maia tem um objetivo único: tornar o setup de capacidades para agentes algo operacional, reproduzível e compartilhável a partir do terminal.

Isso significa que este repositório é centrado em:

- inicialização do projeto com skills, tools e estado MCP centralizados em `.maia/`;
- configuração de um ou vários agentes/editores;
- instalação guiada por catálogo com fluxos de lock e verify;
- um MCP server embutido que expõe as capacidades instaladas.

Se uma funcionalidade não apoiar diretamente esse fluxo de CLI, ela não deve estar neste repositório.

## Casos de uso

O Maia é útil em cenários como:

- times que querem padronizar o uso de agentes entre Claude, Copilot, Cursor e outros clientes;
- projetos que precisam distribuir o mesmo conjunto de skills e MCPs para vários desenvolvedores;
- ambientes em que agentes precisam acessar ferramentas reais do projeto sem configuração manual repetitiva;
- laboratórios e times de produto que querem comparar rapidamente diferentes agentes sobre a mesma base operacional;
- organizações que precisam de um ponto central para governar capacidades, acesso e integrações de AI.

## Comparação: setup manual vs Maia

### Sem Maia

- cada agente precisa ser configurado separadamente;
- os arquivos de MCP ficam espalhados pelo ambiente;
- o onboarding de novos desenvolvedores leva mais tempo;
- a consistência entre ambientes diminui;
- a manutenção de skills, tools e MCPs vira custo operacional.

### Com Maia

- um único fluxo instala e organiza capacidades;
- um único MCP server expõe tudo para os agentes;
- vários agentes podem ser conectados ao mesmo projeto ao mesmo tempo;
- a configuração fica mais previsível e reproduzível;
- o time ganha velocidade para adotar, testar e evoluir workflows com AI.

## Índice

- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Uso básico](#uso-básico)
- [Getting Started (CLI)](#getting-started-cli)
- [Catálogos e credenciais](#catálogos-e-credenciais)
  - [Skills](#skills)
  - [MCP](#mcp)
  - [Credenciais MCP](#credenciais-mcp)
- [Toolkits](#toolkits)
- [Segurança e confiança das fontes](#segurança-e-confiança-das-fontes)
- [Referência de comandos](#referência-de-comandos)
  - [Bootstrap do catálogo](#bootstrap-do-catálogo)
  - [Instalação estilo npm](#instalação-estilo-npm)
  - [Lock e contexto](#lock-e-contexto)
  - [Outros comandos](#outros-comandos)
- [Documentação em `/doc`](#documentação-em-doc)

## Requisitos

- Node.js >= 26

## Instalação

Para usar `maia` diretamente no terminal como comando puro, instale globalmente:

```bash
npm install -g @maumenvi/maia-cli
```

Esse é o caminho suportado para deixar o comando `maia` disponível sem prefixos como `npx`, `npm exec` ou `npm run`.

Se você estiver instalando a partir de um checkout local, use:

```bash
npm install -g .
# ou
npm link
```

Um `npm install` simples dentro de um projeto não adiciona `node_modules/.bin` ao PATH do shell por padrão, então o comando `maia` não será encontrado como comando direto a menos que esse diretório já esteja no PATH. Em um projeto local, o binário continua disponível em `node_modules/.bin/maia` e pode ser invocado explicitamente ou adicionado ao PATH.

## Uso básico

```bash
maia init
maia init claude
maia init claude vscode
maia add claude vscode
maia list-tools
maia list-tools react
maia skills find react
maia mcp find filesystem
maia lock
maia verify
```

## Getting Started (CLI)

Fluxo rápido:

```bash
maia init
maia init copilot
maia init claude copilot
maia add agent claude copilot
maia list-tools
maia skills find react
maia mcp find filesystem
maia lock
maia verify
```

Resultado típico:

- o projeto recebe as pastas de capacidades do Maia;
- cada agente selecionado recebe um endpoint MCP identificado e um perfil de autorização em `.maia/agents/<id>/`;
- cada agente selecionado também é integrado nativamente: os MCPs instalados são registrados individualmente no config MCP do próprio agente, ao lado do proxy `maia`; as skills autorizadas são copiadas para a pasta nativa quando houver suporte (ex.: `.claude/skills/`) e, caso contrário, ficam disponíveis pelo MCP Maia; e um bloco gerenciado `maia:capabilities` é inserido/atualizado no arquivo de instruções do agente (`CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`, …);
- skills, MCPs e tools instalados ficam mais fáceis de versionar, compartilhar e reproduzir.

Atualizar o CLI local neste repositório:

```bash
maia-update-local /home/marco/Documentos/projetos/maia-cli
```

## Catálogos e credenciais

### Skills

O CLI pode descobrir skills por meio de:

- `provider: "skills.sh"` (`https://skills.sh`)
- `provider: "github-skills"` (`https://api.github.com`)

Comportamento de resiliência:

- usa o identificador canônico para instalar uma skill;
- se uma entrada estiver stale ou indisponível, `maia skills add <query>` tenta automaticamente o próximo resultado;
- em `maia skills find`, você pode selecionar outra opção se a origem escolhida falhar.

### MCP

As entradas de MCP são descobertas a partir do registro configurado (`provider: "mcp"`), por padrão:

- `https://registry.modelcontextprotocol.io`

O runtime MCP embutido negocia as revisões legadas `2025-06-18` e `2024-11-05`, com `initialize`/`initialized`, e também suporta o fluxo moderno e stateless `2026-07-28`. Revisões incompatíveis são rejeitadas explicitamente, sem reescrita silenciosa.

Para servidores stdio e NPX, o Maia repassa somente um conjunto pequeno de variáveis necessárias ao sistema/runtime e os valores declarados explicitamente no `env` daquele MCP. O restante do ambiente do processo pai, inclusive credenciais não declaradas, não é herdado.

### Credenciais MCP

Em `maia mcp find`:

- mostra `Requer chave/token: ...`;
- mostra `Onde obter: ...` quando o metadata do registry inclui descrição ou URL.

Em `maia mcp add` (ou instalação por seleção no `find`):

- detecta as variáveis necessárias;
- pede os valores sem exibir os segredos no terminal interativo;
- cria ou atualiza `.maia/mcp.env` apenas com as variáveis referenciadas pelos MCPs instalados;
- preserva entradas customizadas e remove defaults auto-gerados obsoletos dos templates antigos;
- recompõe essas variáveis de MCP durante `maia install` e `maia ci` a partir do `maia.lock.json`, sem sobrescrever o `.env` real do projeto.

Abrir um transporte MCP lê somente `.maia/mcp.env`; o `.env` do projeto não é carregado nem modificado. O Maia mantém o manifesto e o lock em `maia.json` e `maia.lock.json`, e as capacidades de fallback em `.maia/mcp`, `.maia/skills` e `.maia/tools`, além dos perfis de autorização em `.maia/agents`.

Cada bootstrap nativo executa `maia mcp-server --agent <id>`. Essa identidade permite que o MCP agregado exponha somente skills, tools e MCPs autorizados para o agente selecionado. Arquivos nativos obrigatórios, como `.vscode/mcp.json` ou `.codex/config.toml`, permanecem nos caminhos exigidos pelos clientes; todo o estado pertencente ao Maia fica em `.maia/`.

Além do proxy `maia`, o `configureAgents` grava as capacidades autorizadas diretamente nos locais canônicos de cada agente, para que o agente as reconheça sem precisar ser lembrado:

| Agente | Config MCP | Skills | Instruções |
| --- | --- | --- | --- |
| Claude | `.mcp.json` (fallback `.claude/claude_desktop_config.json`) | `.claude/skills/<nome>/SKILL.md` | `CLAUDE.md` |
| VS Code Copilot | `.vscode/mcp.json` | — | `.github/copilot-instructions.md` |
| Cursor | `.cursor/mcp.json` | — | `.cursor/rules/maia.mdc` |
| Zed | `.zed/settings.json` | — | `AGENTS.md` |
| Cline | `.cline/mcp.json` | — | `.clinerules/maia.md` |
| Continue | `.continue/config.json` | — | `AGENTS.md` |
| OpenAI Codex | `.codex/config.toml` | — | `AGENTS.md` |

Somente as capacidades autorizadas para o agente (via `allowedLlms` / `llmAccessDefault`) são entregues, e o bloco de instruções fica entre os marcadores `<!-- maia:capabilities:start -->` / `<!-- maia:capabilities:end -->`, de modo que reexecuções nunca duplicam nem sobrescrevem o seu conteúdo.

## Toolkits

Um **toolkit** é um fluxo de trabalho para agentes, de terceiros, com instalador próprio,
como o [GitHub Spec Kit](https://github.com/github/spec-kit). O Maia não copia os arquivos do
toolkit: ele executa o **instalador nativo** (sem shell, só argv), direcionado aos agentes do
`maia.json`, e registra o resultado no `maia.json` e no `maia.lock.json` para que todo o time
tenha o mesmo ambiente.

```bash
maia toolkit i speckit                    # última release estável, neste projeto
maia toolkit install speckit --version 1.0.11
maia toolkit i speckit -g                 # instala a ferramenta globalmente e inicializa este projeto
maia toolkit ls [--json]
maia toolkit rm speckit                   # pergunta se deve apagar os arquivos do toolkit
```

- Antes de executar qualquer coisa, o Maia mostra os comandos nativos exatos e a origem e pede
  confirmação (`-y` pula). Os pré-requisitos são checados antes (o Spec Kit precisa de
  [`uv`](https://docs.astral.sh/uv/) e Git).
- `-g` só vale quando o toolkit suporta instalação global; caso contrário o Maia avisa e instala
  no projeto como se `-g` não tivesse sido informado.
- Agentes que o toolkit não consegue combinar são pulados com aviso (as integrações `copilot` e
  `zed` do Spec Kit não coexistem com outras).
- `maia i` e `maia ci` instalam toolkits ausentes sem perguntar, na versão travada. Um toolkit
  presente em **outra** versão faz o comando falhar em vez de sobrescrever suas edições; troque
  de versão explicitamente com `maia toolkit i <nome> --version <x>`.
- `maia verify` confere toolkits por presença e versão (não por hash, já que os arquivos são
  feitos para serem editados).
- O servidor MCP do Maia expõe a ferramenta somente leitura `maia_toolkits` (o que cada toolkit
  faz, versão, escopo, caminhos, docs). Ela nunca instala nada.
- `maia toolkit rm` remove o toolkit do `maia.json`/`maia.lock.json` e só apaga arquivos com
  confirmação explícita, passando pelos guardrails. Uma ferramenta global nunca é desinstalada.

Um lockfile com toolkits usa `lockfileVersion: 2`, para que versões antigas do Maia falhem em
vez de ignorá-los. Projetos sem toolkits continuam com `lockfileVersion: 1`.

## Segurança e confiança das fontes

Fontes remotas são consideradas não confiáveis por padrão. O campo `trusted` registra uma decisão revisada de procedência; ele não cria sandbox nem certifica um pacote. Entradas stdio e NPX executam com as permissões do usuário do sistema operacional, embora o Maia limite as variáveis de ambiente herdadas.

Revise comandos executáveis e dependências, prefira refs imutáveis, fixe versões, restrinja credenciais e acesso de LLMs e use um ambiente isolado e de menor privilégio no CI. Consulte a [política completa de segurança e confiança](./SECURITY.md).

## Referência de comandos

### Bootstrap do catálogo

```bash
maia init [agent...]
maia add <agent...>
maia add agent <agent...>
maia source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]
maia source ls
```

Agentes suportados:

- `claude`
- `copilot`
- `vscode` (alias de `copilot`)
- `code` (alias de `copilot`)
- `cursor`
- `cursor-ide` (alias de `cursor`)
- `zed`
- `cline`
- `continue`
- `continue-dev` (alias de `continue`)

Você pode configurar vários agentes ao mesmo tempo:

```bash
maia init claude vscode
maia add claude copilot
maia add agent claude cursor zed
```

Os agentes selecionados são sempre persistidos em `maia.json`; nenhuma flag adicional de salvamento é necessária. Os fluxos de instalação e CI regeneram o perfil e o bootstrap MCP nativo de cada agente salvo. Quando nenhum agente é selecionado, o Maia mantém as capacidades de fallback em `.maia`.

### Skills

```bash
maia skills find <query>
maia skills add <skill-name|owner/repo@skill>
```

### MCP

```bash
maia mcp find <query>
maia mcp add <name>
maia mcp sync
```

### Instalação estilo npm

```bash
maia i skill <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
maia i mcp <name> [--source <alias>] [--transport <stdio|npx|http|sse|ws>] [...]
maia i tool <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]
```

### Lock e contexto

```bash
maia lock
maia verify
maia ci
maia context build
maia context show --for dev
maia context show --for llm
```

Novos manifests ativam `strictVerify` por padrão. O `maia ci` valida os metadados e a integridade do lock antes de escrever arquivos, restaura os artefatos travados e então verifica seus hashes.

### Toolkits

```bash
maia toolkit i|install <nome> [-g|--global] [--version <x.y.z>] [-y|--yes]
maia toolkit ls|list [--json]
maia toolkit rm|remove <nome> [-y|--yes]
```

### Outros comandos

```bash
maia ls [skill|mcp|tool]
maia list-tools [query]
maia rm <skill|mcp|tool> <name>
maia version
```

## Documentação em `/doc`

- [Arquitetura do código-fonte](./doc/architecture.md)
- [Avaliação técnica atualizada](./doc/avaliação.md)
- [Pendências restantes](./doc/falta.md)

## Guardrails para ações destrutivas

O Maia bloqueia operações destrutivas de arquivo por política, não por intenção. A
checagem roda em quatro pontos: o comando `maia guardrail check`, um hook de
pre-commit, o gate de CI, e o `maia remove` antes de apagar um artefato materializado.

```bash
maia guardrail check <caminho...>   # saída 0 permitido, 1 bloqueado, 2 config malformada
npm run guardrails:install          # habilita o hook de pre-commit
```

A política fica em `.maia/guardrails.json`:

```json
{
  "version": 1,
  "denyPatterns": ["build/**", "**/*.secret"]
}
```

Comportamento:

- **Sem config**: valem os defaults embutidos (`**/*.env`, `**/credentials/**`). Não é erro.
- **Config válida**: seus padrões somam aos defaults. Uma config nunca afrouxa o baseline.
- **Config malformada**: toda ação destrutiva é bloqueada (fail-closed) e o erro de parse é reportado. Um guardrail que falha aberto dá falsa sensação de segurança.

**Não há override em runtime.** Nenhuma flag, token ou confirmação converte um bloqueio
em permissão; a única forma de liberar um caminho é editar `denyPatterns`, e essa edição
fica versionada e revisável. A decisão é tomada apenas pelo caminho do alvo.

O hook de pre-commit é contornável com `git commit --no-verify`, que não pode ser
desabilitado — por isso o CI repete a checagem como gate não-contornável.
