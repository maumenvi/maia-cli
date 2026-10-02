## Resumo

A feature 009 corrigiu o registro do proxy `maia` no Claude Code (`.mcp.json`). Na mesma pesquisa apareceram três agentes em que o arquivo que o Maia grava provavelmente **não é lido**, ou é lido com o formato errado. Nesses agentes, nenhum MCP instalado pelo Maia chega ao agente, e o bloco de instruções (`AGENTS.md`, `.clinerules/maia.md`, …) afirma um registro que não funciona.

Nada disso foi testado com os agentes reais: as conclusões vêm do código do Maia e da documentação pública de cada agente. A spec deve começar confirmando cada caso.

## 1. Cursor: chave errada no `.cursor/mcp.json`

- **No Maia**: `src/agent/agents/registry/cursor.ts` declara `configFormat: 'servers'`, então o arquivo gerado é `{ "servers": { "maia": … } }`.
- **No Cursor**: a [documentação](https://cursor.com/docs/mcp) usa `{ "mcpServers": { … } }`.
- **Efeito provável**: o Cursor ignora o arquivo e o `maia` não aparece.
- **O que já está certo desde a 009**: o `cwd` é `${workspaceFolder}`, que o Cursor expande.
- **Correção sugerida**: mudar para `configFormat: 'mcp-servers'` e migrar a chave `servers.maia` existente para `mcpServers.maia`, preservando o resto do arquivo, como foi feito com o legado do Claude.

## 2. Cline: o arquivo de projeto não é lido

- **No Maia**: grava `.cline/mcp.json` no projeto (`src/agent/agents/registry/cline.ts`).
- **No Cline**: ele lê servidores MCP só do arquivo **global** `cline_mcp_settings.json`, gerenciado pela extensão. A PR que expandiria `${workspaceFolder}` foi fechada sem merge ([cline/cline#2990](https://github.com/cline/cline/pull/2990)).
- **Efeito**: o registro no projeto não tem efeito.
- **Pontos de decisão para a spec**:
  - O Maia hoje não altera configs globais de agentes ("local-only").
  - Opções: (a) documentar que o Cline exige um passo manual e mostrar a entrada a colar; (b) oferecer escrita no arquivo global com confirmação explícita; (c) deixar de anunciar o Cline como agente com registro automático.
  - Se o arquivo global for escrito, o `cwd` precisa ser resolvido: o Cline pode iniciar o servidor fora do projeto, e então o `maia mcp-server` falha com "no Maia project found", que é o comportamento desde a 009.

## 3. Continue: formato de config antigo

- **No Maia**: grava `.continue/config.json` (`src/agent/agents/registry/continue.agent.ts`).
- **No Continue**: a [documentação atual](https://docs.continue.dev/customize/deep-dives/mcp) usa YAML (`config.yaml`) e, por projeto, arquivos em `.continue/mcpServers/*.yaml`, que o Continue junta automaticamente. Nesse formato `mcpServers` é uma lista de itens com `name`, `command` e `args`.
- **Correção sugerida**: gerar `.continue/mcpServers/maia.yaml`. Também é preciso decidir o que fazer com o `.continue/config.json` legado que o Maia já gravou (mover a entrada `maia`, como no Claude).

## Também para conferir na spec

- **Codex**: o `.codex/config.toml` de projeto só é aplicado em projeto marcado como confiável ([docs](https://developers.openai.com/codex/mcp)). Talvez valha avisar na instalação.
- **Zed**: o formato `context_servers` e a pasta de lançamento parecem corretos (o Zed inicia na raiz do projeto), mas não foram verificados.
- **Para todos os agentes**: um teste de contrato por agente, com o formato exato do arquivo gerado, e um passo manual documentado de validação com o agente real (como o que está pendente para o Claude Code).

## Critérios de aceite (proposta)

- [ ] Para cada agente suportado, o arquivo gerado é o que o agente lê, no formato que ele espera, confirmado com o agente real ou com a documentação oficial citada.
- [ ] Arquivos gerados por versões anteriores no formato/lugar errado são migrados sem perder outras entradas.
- [ ] Quando o registro automático não é possível (ex.: Cline sem escrita global), o bloco de instruções e a saída do CLI dizem isso claramente, como o FR-005 da 009 já exige.
- [ ] Nenhum caminho absoluto em arquivo de projeto (FR-004 da 009 continua valendo).

## Referências

- `specs/009-agent-integration-fixes/research.md`, decisão D3 (tabela por agente)
- `AGENT.md`, seção "Notes for future changes", follow-ups
