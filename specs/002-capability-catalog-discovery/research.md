# Phase 0 Research: Catálogo de Capacidades & Descoberta

Todos os campos do Technical Context foram resolvidos por inspeção do repositório
(`search-catalog.ts`, `create-catalog-providers.ts`, `agent-catalog-store.ts`,
`source.ts`) e pela sessão de clarificação de 2026-09-21. Este documento cobre as
5 decisões de abordagem necessárias para fechar os gaps do Summary em plan.md.

## Decision 1: Formato de retorno de `searchCatalog` para reportar falhas (FR-006)

**Decision**: Mudar o tipo de retorno de `searchCatalog` de `CatalogSearchResult[]`
para um novo `CatalogSearchOutcome { results: CatalogSearchResult[]; failures:
CatalogSearchFailure[] }`, onde `CatalogSearchFailure = { providerId: string; kind:
CatalogKind; message: string }`. A implementação usa o mesmo
`Promise.allSettled` já existente, mas agora mapeia `result.status === 'rejected'`
para uma entrada de falha em vez de descartá-la.

**Rationale**: `Promise.allSettled` já isola falhas por provedor corretamente — o
problema é só que a informação da rejeição é jogada fora depois. Preservar essa
informação no tipo de retorno é a mudança mínima que resolve FR-006/SC-002/SC-003
sem alterar a estratégia de concorrência já testada e funcionando.

**Alternatives considered**:
- *Lançar uma exceção agregada quando qualquer provedor falha*: rejeitado —
  contradiz diretamente FR-006 ("tentar qualquer outra alternativa disponível"),
  que exige que falhas parciais não impeçam os resultados das fontes que
  funcionaram.
- *Logar a falha no console em vez de retorná-la estruturadamente*: rejeitado —
  não é acessível ao modo `--json` (US2 cenário 3), e mistura uma decisão de
  apresentação dentro de uma função de domínio (`searchCatalog` fica em
  `agent/catalog/`, não em `cli/`), violando a separação já usada no projeto entre
  lógica pura e I/O de apresentação.
- *Retornar `results` e lançar as falhas coletadas como um array anexado ao erro
  (throw com `.failures`)*: rejeitado — força todo chamador a usar try/catch
  mesmo no caminho feliz (a maioria das buscas terá zero falhas), mais verboso que
  simplesmente sempre retornar as duas listas juntas.

## Decision 2: Onde e como exibir as falhas de fonte nos comandos `list-*`

**Decision**: Cada comando `list-skills`/`list-tools`/`list-capabilities` passa a
imprimir uma seção `Fontes indisponíveis:` (ou equivalente) logo após a seção de
resultados de descoberta remota, sempre que `outcome.failures.length > 0` —
independentemente de `outcome.results` estar vazio ou não (Clarification 3: falha
parcial nunca fica silenciosa). No modo `--json`, o payload ganha um campo
`sourceFailures: Array<{ provider: string; message: string }>` paralelo ao campo
de resultados existente.

**Rationale**: Aparecer sempre (não só quando resultados = 0) é exatamente o que a
Clarification 3 decidiu — esconder a falha quando outra fonte respondeu criaria a
falsa impressão de cobertura completa da busca. Uma seção de texto separada segue
o padrão visual já usado pelo comando (seções "Local registry:", "Catalog
discovery:" já existem) em vez de misturar a falha dentro da lista de resultados.

**Alternatives considered**:
- *Anexar a falha como um resultado especial na mesma lista (`{ error: true, ...
  }`)*: rejeitado — poluiria o tipo `CatalogSearchResult` com um caso especial que
  todo consumidor downstream (incluindo o fluxo de instalação) precisaria checar.
- *Exit code diferente de zero quando há falhas parciais*: rejeitado — o spec não
  pede isso, e um exit code não-zero para uma busca que teve sucesso parcial
  quebraria scripts que hoje tratam qualquer resultado (mesmo vazio) como sucesso;
  a informação já é visível no texto/JSON, que é suficiente para US4.

## Decision 3: Deduplicação local-sobre-remoto (FR-008)

**Decision**: Nova função pura `excludeLocallyInstalled(results:
CatalogSearchResult[], installed: LockPackage[]): CatalogSearchResult[]` em
`providers/core/exclude-locally-installed.ts`, chamada pelos comandos `list-*`
logo após `searchCatalog` retornar, antes da exibição. A comparação usa
`result.kind === pkg.type && result.name === pkg.name` (mesmo par usado por
`getInstalledPackages` para identificar um pacote), não `result.id`, porque
`CatalogSearchResult.id` é qualificado pela fonte (ex.:
`vercel-labs/skills/react`) enquanto `LockPackage.name` é o nome local instalado
— o campo comparável em comum entre os dois é `name` dentro do mesmo `kind`.

**Rationale**: Uma função pura e separada mantém a regra testável isoladamente
(Princípio VIII da Constituição) e reaproveitável pelos três comandos `list-*`
sem depender da forma de exibição de nenhum deles. Comparar por `(kind, name)` em
vez de `id` evita falsos negativos — dois resultados podem ser "a mesma
capacidade" para fins de exibição mesmo vindo de fontes com IDs distintos, mas a
spec só define precedência para o caso descrito no Edge Case ("mesmo
identificador"), então esta é a leitura mais direta: mesmo par kind+name que o
próprio inventário local já usa como chave de identidade.

**Alternatives considered**:
- *Deduplicar dentro de `searchCatalog` em vez de no comando*: rejeitado —
  `searchCatalog` não tem acesso a `store.getInstalledPackages()` hoje (só recebe
  `manifest.registries`); passar a store para dentro dele ampliaria
  desnecessariamente sua superfície e misturaria "consultar provedores remotos"
  com "consultar estado local", duas responsabilidades distintas que hoje já são
  compostas no nível do comando CLI (ver `list-skills-command.ts`, que já chama
  `store.getInstalledPackages` e `searchCatalog` separadamente).
- *Marcar o resultado remoto duplicado como "já instalado" em vez de omiti-lo*:
  rejeitado — a Clarification 5 (Opção A) decidiu explicitamente por omissão, não
  por anotação.

## Decision 4: Validação de sintaxe de URL de fonte Git (FR-005)

**Decision**: Nova função pura `isValidGitSourceUrl(url: string): boolean` em
`agent/catalog/source/is-valid-git-source-url.ts`, chamada por `sourceCommand`
antes de `store.addSource`. Validação mínima: rejeita string vazia/só espaços, e
exige que a URL comece com um protocolo reconhecível (`https://`, `git@`,
`ssh://`, `git://`) ou termine em `.git` — mesmo espírito da checagem heurística
já usada em `resolveSourceCommit` (`FULL_GIT_SHA_PATTERN` e a checagem de host
`github.com|gitlab.com|bitbucket.org|*.git`), mas aplicada mais cedo, no momento
do `add`, em vez de só na hora de resolver o commit.

**Rationale**: A checagem "isso parece um repositório Git" já existe implicitamente
em `resolve-source-commit.ts` para decidir se tenta resolver o commit de verdade —
reaproveitar a mesma heurística no `add` (extraída para uma função pura
compartilhada) evita introduzir uma segunda noção de "URL válida" divergente da
que já existe no código, e satisfaz a Clarification 4 (rejeitar imediatamente, sem
alteração de arquivo).

**Alternatives considered**:
- *Validação completa via regex RFC 3986 de URL genérica*: rejeitado — aceitaria
  URLs sintaticamente válidas mas claramente não-Git (ex.: `https://example.com`),
  o que não ajuda o usuário a pegar o erro cedo; a spec pede rejeitar o que "não
  parece um repositório Git", não qualquer URL malformada.
- *Fazer uma checagem de rede (HEAD request) no momento do `add`*: rejeitado — municia
  o FR-005 com uma dependência de rede síncrona que o spec não pede, e conflitaria
  com FR-005 já existente "rejeitado imediatamente" (uma checagem de rede não é
  imediata e pode falhar por razões não relacionadas à validade da URL).

## Decision 5: Cobertura de teste para cenários hoje não testados

**Decision**: `tests/cli/source.test.ts` (novo) cobre `source add` com URL válida
e inválida, e `source ls` exibindo referência + trust. `tests/cli/list-skills.test.ts`
ganha casos novos: (a) uma fonte falha via `fetch` mockado rejeitando, outra
responde — falha aparece junto dos resultados; (b) todas as fontes falham — "nenhum
resultado" é reportado distinto de erro; (c) um resultado remoto duplica um nome já
instalado localmente — resultado remoto é omitido. `tests/shared/` ganha testes
unitários dedicados para os dois predicados puros novos
(`is-valid-git-source-url.test.ts`, `exclude-locally-installed.test.ts`).

**Rationale**: Segue exatamente o padrão de teste já estabelecido em
`tests/cli/list-skills.test.ts`/`list-tools.test.ts` (mock de `globalThis.fetch`,
`AgentCatalogStore` real contra `mkdtempSync`), evitando introduzir um framework
ou padrão de teste novo. `source.test.ts` fecha uma lacuna de cobertura zero
identificada na investigação, consistente com o Princípio I (Test-First) da
Constituição.

**Alternatives considered**: nenhuma alternativa de framework/padrão foi
considerada — o padrão existente já é adequado e reutilizável sem modificação.
