---
trigger: glob
globs: "app/lib/**/*.dart, app/lib/l10n/**"
description: "Regras de redação e de interface para todos os textos exibidos ao usuário no app Flutter."
---

# Textos e interface

- Todo texto visível vem dos arquivos de localização (pt-BR). Nada fixo no código.
- Linguagem simples, frases curtas, sem jargão. Se um termo técnico for inevitável (RIR, % de gordura), explique na primeira vez.
- **Proibido:** "bioimpedância" para a foto; "diagnóstico", "tratamento", "cura"; "garantido"; qualquer comentário sobre aparência; tom de culpa ou vergonha.
- % de gordura sempre como **faixa** ("entre 16 % e 21 %"), com os métodos usados.
- Prazos: "no ritmo recomendado, cerca de N semanas". Metas `tracked_only`: dizer que não prometemos data.
- Todo número de saúde mostra o botão "De onde vem isso?" com as fontes do motor. Fontes do tipo premissa aparecem como "escolha do app, revisada por profissional".
- Bloqueios da triagem: acolher, explicar em uma frase e dar o próximo passo (qual profissional procurar). Na tela de transtorno alimentar, incluir o CVV (188).
- Acessibilidade: escala de texto dinâmica, contraste AA, `Semantics` em gráficos com um resumo textual.
- Consulte a tabela "faça / não faça" em `docs/04-SEGURANCA-E-LEGAL.md`, seção 5.
