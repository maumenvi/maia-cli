# Contract: ajuda, instalação por busca, autorização e `--as` (US2, US3, US6)

## Ajuda (todos os comandos)

`maia <comando> [...] (--help|-h) [...]` imprime as linhas de ajuda do comando no stdout e
termina com exit 0. Não lê o projeto, não consulta catálogo nem rede e não escreve arquivos.
Para comando desconhecido, imprime a ajuda geral.

## `maia skills add <alvo> [--as <nome>] [--all-llms | --llms <ids>]`

| Alvo | TTY | Resultado |
|------|-----|-----------|
| `owner/repo@skill` | qualquer | instala direto |
| termo igual ao `name` de exatamente 1 resultado | qualquer | instala direto |
| termo ambíguo (0 exatos ou mais de 1 resultado) | sim | lista `n) <displayName> (<source>) [trusted\|untrusted]` e pergunta `Choose an option (1-N, 0 to cancel):`; 0 não instala |
| termo ambíguo | não | exit 1: `maia: "<termo>" matches several catalog entries; rerun with an exact identifier:` + uma linha por candidato `  <owner/repo@skill>` |
| nenhum resultado | qualquer | exit 1: `maia: Skill "<termo>" was not found in configured catalogs` (como hoje) |

## `maia mcp i|add|install <nome> [--env-g] [--all-llms | --llms <ids>]`

Mesma tabela, usando o nome canônico do registry como identificador exato.

## Autorização (depois de escolher o candidato)

| Fonte | Flag | TTY | `allowedLlms` | Saída extra |
|-------|------|-----|---------------|-------------|
| confiável | — | — | `['*']` | — |
| qualquer | `--all-llms` | — | `['*']` | — |
| qualquer | `--llms a,b` | — | `['a','b']` | — |
| não confiável | — | sim | pergunta `Authorize <kind>:<name> from an untrusted source for all configured agents? [y/N]`: sim → `['*']`, não → `[]` | — |
| não confiável | — | não | `[]` | `Installed <kind>:<name> without agent access (untrusted source). Run "maia <skills\|mcp> add <id> --all-llms" to authorize it.` |

## Colisão de nome (skills)

Com um agente configurado cujo `nativeCommands` contém o nome local:
`warning: skill "<nome>" has the same name as the built-in /<nome> command of <Agente>; install it under another name with --as <nome>.`
(stderr; a instalação segue normalmente).

## `--as <nome>`

- Valida `^[A-Za-z0-9._-]+$`; inválido termina com exit 1 e `maia: Invalid skill name "<nome>"`.
- O nome local vira `<nome>`. A dependência e o lock guardam `sourceName: <nome na fonte>`.
- Saída: `Installed skill:<nome> (from <nome na fonte>)`.
