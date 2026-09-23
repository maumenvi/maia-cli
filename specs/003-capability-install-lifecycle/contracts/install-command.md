# Contract: `maia install|i [kind] [name]` — comportamentos alterados

Contrato de comando CLI — cobre apenas os comportamentos alterados por este
plano (FR-004, FR-008). O restante do contrato de `maia install`/`maia i`
(flags de versão/fonte/escopo, restrição de tool ao registro local,
restauração sem argumentos) é baseline existente e inalterado — ver spec.md
FR-001–FR-003, FR-005, FR-007, FR-009.

## Behavior 1 — Rollback em falha durante instalação (FR-008)

**Given**: Uma instalação de skill, tool, ou MCP é interrompida por uma
exceção após a materialização do artefato ter ocorrido, mas antes de
`buildLock()` completar (qualquer ponto intermediário da sequência de
passos).

**Then**: exit code diferente de zero; o artefato materializado é apagado
(revertido); nenhuma entrada é deixada no manifesto sem lockfile
correspondente; nenhum arquivo é deixado no diretório fallback sem entrada
de manifesto correspondente.

**Given** (regressão): uma instalação completa normalmente, sem interrupção.

**Then**: comportamento inalterado — manifesto, lockfile, artefato, e
configuração de agente todos atualizados, exit code 0.

## Behavior 2 — MCP com transporte incompatível pula o agente afetado (FR-004)

**Given**: Um MCP declara um transporte que um agente configurado específico
não suporta representar nativamente.

**Then**: a instalação prossegue e conclui com sucesso; a configuração
nativa daquele agente específico não inclui o MCP recém-instalado (a
sincronização daquele agente para aquela MCP é pulada); um aviso explícito é
emitido identificando o agente e o motivo; os demais agentes configurados
(cujo formato suporta o transporte) recebem a configuração normalmente; o
MCP é registrado no manifesto/lockfile normalmente (a instalação em si não
falha).

**Given** (regressão): todo transporte declarado hoje é suportado por todo
agente configurado (comportamento atual, já que nenhum `AgentTarget`
declara restrição — ver Decision 2 em research.md).

**Then**: comportamento inalterado — todos os agentes configurados recebem
a configuração normalmente, nenhum aviso é emitido.

## Out of scope for this contract

- O formato exato da mensagem de aviso emitida no Behavior 2 — detalhe de
  implementação, não normatizado aqui além de "explícito e identificando o
  agente".
- Qualquer mudança ao fluxo de descoberta/busca que precede a instalação —
  coberto por [[002-capability-catalog-discovery]].
