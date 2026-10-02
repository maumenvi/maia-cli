# Contract: skill como pasta (US4)

## Layout no projeto

```text
.maia/skills/<nome>/SKILL.md
.maia/skills/<nome>/<qualquer arquivo/subpasta da skill na fonte>
<skillsDir do agente>/<nome>/…   (espelho da pasta acima)
```

## Limites e rejeições

| Condição | Resultado |
|----------|-----------|
| mais de 200 arquivos ou mais de 5 MB no total | exit 1: `maia: Skill "<nome>" exceeds the size limit (<n> files, <m> MB)`; nada é gravado |
| caminho com `..`, absoluto ou symlink na fonte | o arquivo é rejeitado; exit 1: `maia: Skill "<nome>" contains an unsafe path: <caminho>` |
| pasta sem `SKILL.md` | exit 1: `maia: Skill "<nome>" was not found in <url>` (como hoje) |
| fonte well-known sem lista de arquivos | instala só `SKILL.md` + `warning: Only SKILL.md is available from <url>; supporting files were not published.` |

## Lock (`maia.lock.json`)

```json
"skill:security-review": {
  "path": "skills/security-review",
  "files": {
    "SKILL.md": "sha256:…",
    "references/injection.md": "sha256:…"
  },
  "artifactHash": "sha256:<hash da lista ordenada>",
  "…": "…"
}
```

`lockfileVersion: 3` quando o manifesto tem dependência de skill com `path` de pasta (não
depende do disco). `files` não entra na comparação de lock desatualizado do `maia ci`.

## `maia verify`

Uma linha por problema, no formato que já existe (`formatLockVerificationProblems`):

- `File missing for skill:<nome>: <caminho>`
- `File changed for skill:<nome>: <caminho>`
- `Unexpected file for skill:<nome>: <caminho>`
- pasta de skill sem `files` no lock → o problema `missing-artifact-hash` que já existe

## Migração

`maia i` sem argumentos, com dependência de skill remota de `path` terminado em `SKILL.md`:
rematerializa a pasta inteira no mesmo commit da fonte, atualiza `path` para `skills/<nome>`
e imprime `Upgraded skill:<nome> to include its supporting files.`.
