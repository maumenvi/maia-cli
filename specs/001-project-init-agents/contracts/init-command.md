# Contract: `maia init [agent...]`

Contrato de comando CLI — descreve comportamento observável (argv →
stdout/stderr/exit-code/efeitos no sistema de arquivos), não a implementação
interna. Este documento cobre apenas os quatro comportamentos alterados por este
plano; o comportamento inalterado (criação de manifesto/lockfile, aliasing de
agente, escrita de configuração nativa, idempotência) é baseline existente e já
testado.

## Invocation

```text
maia init [agentId...]
```

- `agentId...`: zero ou mais identificadores ou aliases de agente (ex.: `claude`,
  `copilot`, `vscode`).

## Behavior 1 — Não-interativo, sem agentes (FR-003, FR-014)

**Given**: `process.stdin.isTTY === false` (ou `process.stdout.isTTY === false`) E
nenhum argumento `agentId` foi passado.

**Then**:
- Exit code: diferente de zero.
- stderr: uma mensagem explícita declarando que nenhum agente foi fornecido em um
  ambiente não-interativo e instruindo o desenvolvedor a passar ids de agente como
  argumentos.
- Filesystem: nenhum manifesto, lockfile, diretório fallback, ou arquivo de
  configuração nativa de agente é criado ou modificado. Se um manifesto já existia,
  ele permanece byte-a-byte inalterado.

**Given**: `process.stdin.isTTY === true` E `process.stdout.isTTY === true` E
nenhum argumento `agentId` foi passado E o usuário envia uma linha vazia no prompt.

**Then** (comportamento existente inalterado): prossegue com inicialização
fallback-only, exit code 0.

## Behavior 2 — Versão de schema de manifesto incompatível (FR-012)

**Given**: Um `maia.json` existente cujo campo `maiaVersion` não é satisfeito pelo
range suportado pela CLI em execução.

**Then**:
- Exit code: diferente de zero.
- stderr: uma mensagem explícita nomeando tanto o `maiaVersion` declarado pelo
  manifesto quanto o range que a CLI em execução suporta, e instruindo o
  desenvolvedor a migrar o manifesto ou usar uma versão compatível da CLI.
- Filesystem: nenhum arquivo é criado ou modificado — o manifesto existente, o
  lockfile, e qualquer configuração nativa de agente permanecem byte-a-byte
  inalterados.

**Given**: Um `maia.json` existente cujo `maiaVersion` é satisfeito pela CLI em
execução, ou nenhum `maia.json` existente.

**Then** (inalterado): a inicialização prossegue normalmente.

## Behavior 3 — Falha de escrita durante o salvamento de manifesto/lockfile (FR-014)

**Given**: A escrita de sistema de arquivos subjacente para o manifesto ou lockfile
falha no meio do caminho (ex.: `ENOSPC`, `EACCES` depois que o arquivo temporário
foi aberto).

**Then**:
- Exit code: diferente de zero.
- stderr: uma mensagem explícita identificando a falha de escrita (expondo o
  código/mensagem de erro `fs` subjacente).
- Filesystem: o conteúdo anterior do manifesto/lockfile (se houver) permanece
  intacto e não modificado; nenhum arquivo órfão com sufixo `.tmp` é deixado para
  trás no caminho de sucesso ou falha (limpo em caso de falha).

## Behavior 4 — Limpeza de diretório fallback vazio (FR-013)

Não faz parte do contrato do próprio `init` diretamente, mas é exercitado através
do `maia rm`:

**Given**: `maia rm skill <name>` (ou `tool`/`mcp`) remove a última entrada
remanescente materializada em seu diretório fallback (`.maia/skills/`,
`.maia/tools/`, `.maia/mcp/`).

**Then**:
- O diretório fallback agora vazio é removido do disco.
- Se o diretório ainda contém outras entradas, ele é deixado no lugar, intocado.
- Se o diretório não existe (já removido, ou nunca criado), a operação é um no-op —
  nenhum erro é levantado para o diretório já ausente.

## Out of scope for this contract

- O formato do próprio `maia.json` / `maia.lock.json` (inalterado por esta feature —
  ver [data-model.md](../data-model.md)).
- Seleção, aliasing, e escrita de configuração nativa de agente (FR-004–FR-011) —
  comportamento existente, já implementado e testado, não modificado por este
  plano.
- Instalação/remoção de capacidades além do efeito colateral de diretório vazio
  descrito acima — o contrato de ciclo de vida completo vive em
  [[003-capability-install-lifecycle]].
