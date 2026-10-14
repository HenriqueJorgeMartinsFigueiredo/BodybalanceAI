---
name: revisar-ciencia
description: Revisa se uma alteração mantém os números de saúde do app fiéis à base científica. Use antes de concluir qualquer mudança em engine/, em functions que chamam o motor ou em telas que exibem calorias, macros, prazos, % de gordura, séries ou repetições.
---

# Revisar ciência

Siga os passos na ordem e entregue um relatório curto no final.

## 1. Levantar o que mudou

- Liste os arquivos alterados (`git diff --name-only` contra o último commit da branch principal).
- Separe em: motor (`engine/`), functions, app, docs.

## 2. Motor

Para cada constante nova ou alterada em `engine/src/config.ts`:

1. Tem `sources`? Os IDs existem em `engine/src/references.ts`?
2. O valor bate com a tabela correspondente em `docs/02-BASE-CIENTIFICA.md`? Se não bate, o doc foi atualizado na mesma alteração?
3. Se é `PREMISSA_PROJETO`, ela está na tabela de premissas (seção 7 do doc 02)?

Rode e cole a saída:

```
cd engine && npm test
```

Todos os testes precisam passar. Se um teste de invariante foi alterado para "passar", trate como **bloqueante** e explique por quê.

## 3. Functions

- Alguma fórmula foi escrita fora do motor? (procure por `* 7700`, `/ 7`, `log10`, `Math.log`, multiplicadores como `1.55`, `2.3`, `1.6`). Se sim, **bloqueante**.
- A entrada é validada com zod antes de chamar o motor?

## 4. App

- Algum número de saúde é calculado em Dart? (procure por contas com peso, kcal, proteína, semanas). Se sim, **bloqueante**.
- Todo número exibido tem o botão "De onde vem isso?" com as `sources` do motor?
- Textos seguem `.agents/rules/textos-do-app.md` (sem "bioimpedância" para foto, % de gordura em faixa, sem promessa de data em `tracked_only`)?

## 5. Relatório

Formato:

```
Resultado: APROVADO | APROVADO COM RESSALVAS | BLOQUEADO
Testes do motor: N passaram / M falharam
Bloqueantes: (lista ou "nenhum")
Ressalvas: (lista ou "nenhuma")
Docs atualizados: sim/não (quais)
```
