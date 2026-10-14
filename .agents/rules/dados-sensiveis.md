---
trigger: model_decision
description: "Aplicar ao mexer em Firestore, Storage, regras de segurança, logs, analytics, chamadas à IA, fotos, consentimentos, exportação ou exclusão de dados."
---

# Dados sensíveis (LGPD) — regras

- Peso, medidas, % de gordura, triagem, metas, planos e fotos são **dados pessoais sensíveis**. Base legal: consentimento específico e destacado, por finalidade (ver `docs/04-SEGURANCA-E-LEGAL.md`, seção 3).
- Tudo fica sob `users/{uid}`. Nada de coleções globais com dados de saúde.
- `plans/` e `checkins/` só são escritos por Cloud Functions; as regras negam escrita do app.
- Fotos: `users/{uid}/photos/...`, JPEG, < 8 MB, leitura só do dono, apagamento só pela function. Nunca gere URL pública permanente.
- Logs, Crashlytics e analytics: proibido registrar peso, medidas, % de gordura, respostas de triagem, conteúdo de meta, fotos ou resposta da IA. Registre só IDs técnicos e códigos de erro.
- Chamada à IA de foto: só no servidor, chave no Secret Manager, saída validada com zod, guardas da seção 7.4 de `docs/03-ARQUITETURA.md` (possível menor, nudez, faixa mínima de 6 pontos).
- Antes de checar consentimento: confira `users/{uid}.consents` com a versão atual do termo; sem consentimento, a função recusa com erro explicativo.
- `deleteMyData` apaga Firestore, Storage e Auth. Ao criar uma coleção nova, inclua-a na exclusão e na exportação no mesmo commit.
- Ao alterar `firestore.rules` ou `storage.rules`, atualize e rode os testes de regras no emulador.
