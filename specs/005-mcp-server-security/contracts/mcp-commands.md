# Contract: Comandos de MCP

**Feature**: `005-mcp-server-security` | **Requisitos**: FR-001, FR-005, FR-006 | **Critérios**: SC-002, SC-003

Os comandos desta página **já existem e funcionam**. O contrato documenta o
comportamento vigente como baseline de regressão, e marca as duas mudanças desta
feature.

## `maia mcp find <query>`

Busca MCPs nos catálogos configurados, apresenta os resultados para seleção, e
instala o escolhido. Sem resultados ⇒ mensagem informativa, código `0`.

## `maia mcp add <nome>`

Instala o melhor casamento para `<nome>` sem etapa interativa de seleção. Sem
casamento ⇒ erro nomeando o MCP procurado.

## `maia mcp sync`

Reconcilia os MCPs registrados com a configuração do projeto e reporta a contagem de
servidores sincronizados e o arquivo escrito.

## Credenciais *(FR-006, SC-003)*

Fluxo vigente, mantido:

1. Requisitos de credencial são extraídos do resultado do catálogo.
2. Valores são pedidos com **eco desligado** (`SecretPromptOutput` mudo) — nada
   aparece no terminal durante a digitação.
3. Valores são gravados em `.maia/mcp.env`, que está no `.gitignore`.
4. A configuração do MCP referencia a variável por placeholder (`${env:NOME}` ou `{NOME}`), nunca pelo
   valor.

**Invariante SC-003**: em nenhum ponto do ciclo — descoberta, instalação, execução —
um valor de credencial alcança stdout, stderr, um log, ou um arquivo versionado.
Apenas o nome da variável aparece.

**Mudança desta feature**: o stderr de um processo de MCP é repassado ao usuário
**redigido**. Ocorrências literais de um valor injetado viram `[REDACTED:<NOME_VAR>]`.
Valores com menos de 8 caracteres não são redigidos, porque substrings curtas casariam
com texto não-relacionado.

## Ambiente do processo *(FR-005, SC-002)*

Um processo de MCP recebe **exclusivamente**:

1. As chaves de `SAFE_INHERITED_ENV_KEYS` presentes em `process.env` — `PATH`,
   `PATHEXT`, `SystemRoot`, `WINDIR`, `ComSpec`, `TMPDIR`, `TMP`, `TEMP`, `LANG`,
   `LC_ALL`, `LC_CTYPE`, `TERM`.
2. As variáveis que aquele MCP declarou, com placeholders resolvidos.

Nada mais. Não há herança de `process.env` completo, e um MCP que não declara nenhuma
variável não recebe nenhum segredo do ambiente pai.

**Mudança desta feature**: variável referenciada por placeholder que não resolve para
valor não-vazio faz o start **falhar antes do spawn**, nomeando **todas** as
faltantes de uma vez. Hoje resolve para string vazia e o processo sobe quebrado,
falhando depois com um erro de transporte que não menciona a variável.

A mensagem nomeia a variável; nunca mostra valor parcial.
