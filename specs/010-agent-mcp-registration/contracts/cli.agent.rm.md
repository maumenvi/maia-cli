# Contract: `maia agent rm <id...>` (FR-012, FR-006b)

Aliases: `maia agent remove <id...>`. Ajuda em `maia agent --help` e `COMMAND_HELP.agent`.

## Efeitos, por agente informado

| Passo | Efeito |
|-------|--------|
| 1 | remove `agents.<id>` de `maia.json` |
| 2 | remove só a entrada `maia` do arquivo de config do projeto (JSON, Zed, TOML); para o Continue, apaga `.continue/mcpServers/maia.yaml` |
| 3 | remove o bloco `<!-- maia:capabilities:start -->…end -->` do arquivo de instruções; o arquivo fica |
| 4 | remove `.maia/agents/<id>/` |
| 5 | Cline: se a entrada do projeto existir em algum candidato global, pergunta (padrão "não"; sem TTY não pergunta e não remove) e remove só essa chave |
| 6 | lista a pasta nativa de skills, se o alvo tiver uma: `Skill copies in .claude/skills were kept; delete them manually if no longer needed.` |

## Erros

| Caso | Exit | Mensagem |
|------|------|----------|
| Sem ids | 1 | `Usage: maia agent rm <name...>` |
| Id desconhecido | 1 | `Unknown agent "<id>". Supported: …` (nada é alterado) |
| Agente não configurado no projeto | 0 | `<Agente> is not configured in this project.` |
| Arquivo de config com JSON/TOML inválido | 1 | mensagem de `readJson`; os passos 1, 3 e 4 não rodam para esse agente |

## Saída (sucesso)

```text
Removed Cursor from maia.json.
Removed the "maia" proxy from .cursor/mcp.json.
Removed Maia's capability block from .cursor/rules/maia.mdc.
```
