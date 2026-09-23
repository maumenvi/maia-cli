# Contract: `maia lock`, `maia verify`, `maia context`

Contrato de comandos CLI — cobre apenas os comportamentos alterados por este plano.

## `maia lock`

### Behavior 1 — Determinismo (FR-001, SC-003)

**Given**: Um projeto cujo estado instalado não mudou desde o último `maia lock`.

**Then**: o conteúdo gerado é byte-a-byte idêntico ao anterior (o lockfile não
contém nenhum campo que varie entre execuções), **e** o arquivo em disco não é
reescrito — seu timestamp de modificação é preservado. A saída informa que não
houve mudança, em vez de alegar atualização.

**Given**: Um projeto cujo manifesto ou artefatos mudaram.

**Then** (inalterado): o lockfile é reescrito com o novo conteúdo e a saída informa
a atualização.

## `maia verify`

### Behavior 2 — Relato agregado (FR-002)

**Given**: Uma instalação com múltiplos problemas simultâneos (por exemplo, dois
artefatos com hash divergente e um ausente).

**Then**: exit code diferente de zero, e **todos** os problemas são impressos —
identificando cada pacote e o tipo de problema — antes da falha. A execução não
para no primeiro.

### Behavior 3 — Pacote sem hash registrado (FR-002, SC-002)

**Given**: Um lockfile que registra um pacote materializado sem `artifactHash`.

**Then**: a verificação falha reportando que o lockfile está incompleto e
orientando a regerá-lo. Um arquivo não-vazio **não** é suficiente para declarar
sucesso.

### Behavior 4 — Versão de schema incompatível (FR-010)

**Given**: Um lockfile com `lockfileVersion` não suportado.

**Then**: falha reportando ambas as versões, distinta de erro de integridade —
mesmo comportamento do `ci` (ver contracts/ci-command.md Behavior 2).

### Behavior 5 — Lockfile ausente (baseline, inalterado)

**Given**: Nenhum lockfile no projeto.

**Then**: falha instruindo a rodar `maia lock` primeiro.

## `maia context`

### Behavior 6 — Exibir contexto nunca construído (FR-006)

**Given**: Um projeto onde `maia context build` nunca foi executado.

**Then**: `maia context show` falha com uma orientação explícita para rodar o
comando de construção primeiro — não um erro cru de arquivo ausente, e **sem**
construir o contexto automaticamente.

**Given**: Contexto previamente construído.

**Then** (inalterado): o contexto solicitado (`--for dev` ou `--for llm`) é
exibido.

## Out of scope for this contract

- O formato exato das mensagens.
- A estrutura interna dos artefatos de contexto (inalterada; são derivados e
  regeneráveis conforme as Assumptions do spec).
