# Regras
Principios não-negociaveis 

Fluxo toda spec, plano, tarefa, codigo, code review, correção do code review caso necessario, teste, revisão humana (caso solicitado pular essa parte) seguem.

1. Teste e parte da tarefa. Nenhuma logica nova entra sem teste. Typecheck e teste sempre verdes
2. Seguranca por padrão. Sem segredos no repo. Acoes destrutivas passam por guardrails (deny list + pre-commit), não pela confiança no modelo.
3. Spec antes de codigo. Mudancas relevantes passam por spec -> plan -> task -> implement, com revisão humana entre as fases
4. Pequeno e reversivel. Cada tarefa cabe em um commit
5. Cada classe, funcao e type tem seu proprio arquivo e com comentario
6. Pastas devem ser organizadas por escopo bem definido
7. Clean code e obrigatorio
8. Funções puras sempre que for possivel
9. Nome dos arquivos deve seguir o padão: toda palavra deve ser separa por ".".  Arquivos de test deve ter .test.ts. Exemplo: user.dto.in.ts

# Stack
 - Node.js
 - node:test
 - TS nativo do node em desenvolvimento

# Organização do repositorio

