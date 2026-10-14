---
name: implementar-fase
description: Executa uma fase do roteiro de desenvolvimento (docs/05-PROMPTS-ANTIGRAVITY.md) com plano, implementação, testes e walkthrough. Use quando o usuário pedir para fazer a "Fase N" ou a próxima fase do app.
---

# Implementar uma fase do roteiro

## 1. Entender

1. Leia `AGENTS.md` e a seção da fase pedida em `docs/05-PROMPTS-ANTIGRAVITY.md`.
2. Leia todos os documentos que a fase manda ler.
3. Confira se as fases anteriores estão concluídas (arquivos e testes existem). Se faltar algo, avise antes de continuar.

## 2. Planejar (esperar aprovação)

Gere o plano de implementação com:

- arquivos que vai criar/alterar;
- dependências novas (se houver, justifique — só as previstas em `docs/03-ARQUITETURA.md`);
- como cada critério de aceite da fase será verificado;
- riscos (dados sensíveis, números de saúde, regras de segurança).

Pare e espere aprovação.

## 3. Implementar

- Siga as regras de `.agents/rules/` que se aplicam aos arquivos tocados.
- Números de saúde só via motor. Textos só via localização.
- Commits pequenos.

## 4. Verificar

Rode e mostre a saída de tudo que se aplica:

```
cd engine && npm test
# functions (se existirem)
cd functions && npm test
# app (se existir)
cd app && flutter analyze && flutter test
```

Depois rode o skill `revisar-ciencia` se a fase mexeu em motor, functions ou telas com números.

## 5. Entregar

Walkthrough com: o que foi feito, como testar manualmente no emulador/simulador, critérios de aceite (✅/❌) e pendências para a próxima fase.
