# Contrato: `toolkits` no manifesto e no lockfile

Formato completo em [data-model.md](../data-model.md) §3–§4.

## Invariantes

1. `buildLockFromManifest(manifest)` é pura: `lock.toolkits` é função de
   `manifest.toolkits`, `manifest.agents` e do catálogo embutido.
2. `lockfileVersion === 2` ⇔ `Object.keys(lock.toolkits ?? {}).length > 0`.
3. `assertLockfileVersionCompatible` aceita `1` e `2`; qualquer outro valor falha com
   `LockfileVersionCompatibilityError`.
4. `isLockStale` compara `toolkits` (projeção inclui o campo; ausente ≡ `{}`).
5. Toolkit no manifesto ausente do catálogo ⇒ `buildLockFromManifest` lança
   `Unknown toolkit "<n>" in maia.json (not in Maia's built-in catalog)` (FR-003a).
6. `scope: "global"` com `supportsGlobal: false` no manifesto ⇒ erro de validação
   no build do lock (manifesto editado à mão).
7. `verifySourceLock` (hash) não inspeciona `toolkits`; a verificação de toolkits é
   por presença/versão na camada CLI (FR-019).

## Compatibilidade

| Lock | Maia antigo (aceita só 1) | Maia novo |
|---|---|---|
| sem toolkits, v1 | OK (sem mudança) | OK |
| com toolkits, v2 | falha explícita de versão (não ignora toolkits) | OK |
