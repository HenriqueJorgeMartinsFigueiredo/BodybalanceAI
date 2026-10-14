# PRD — BodyBalanceAI

App de avaliação corporal por fotos e plano de treino e dieta com metas numéricas.
Plataformas: iOS e Android (Flutter). Idioma: português do Brasil.

## 1. Proposta

O usuário informa sexo, idade, altura e peso, tira 3 fotos padronizadas (frente, lado, costas), define **uma meta numérica com prazo** e recebe:

1. uma estimativa honesta da composição corporal (sempre como faixa), combinando a IA nas fotos com a equação de Deurenberg calculada dos dados informados. Medir pescoço/cintura/quadril com fita é **opcional** e só aumenta a precisão;
2. a resposta "**essa meta cabe nesse prazo?**" — e, se não couber, o prazo mínimo seguro e o recomendado;
3. metas diárias de calorias e macronutrientes + orientação de escolhas alimentares;
4. um programa de treino de força + aeróbio que cabe nos dias e minutos que a pessoa tem;
5. um check-in semanal que ajusta tudo com base nos dados reais.

Cada número no app tem um botão **"de onde vem isso?"** que mostra a fonte (diretriz, estudo ou premissa do projeto). Isso é diferencial de produto **e** requisito da App Store (diretriz 1.4.1: divulgar dados e metodologia de medições de saúde).

### O que o app NÃO é

- Não mede bioimpedância e não se integra com balança de bioimpedância. Nunca diga em tela, ícone ou loja que o app mede bioimpedância.
- Não diagnostica nada.
- Não substitui nutricionista, profissional de educação física ou médico (ver `04-SEGURANCA-E-LEGAL.md`).
- Não é para menores de 18 anos, gestantes/lactantes nem pessoas com histórico de transtorno alimentar (o app encaminha para profissional).

## 2. Público

| Persona | Meta típica | O que precisa ver |
|---|---|---|
| Ana, 32, quer emagrecer | "de 29 % para 23 % de gordura em 20 semanas" | se o prazo é realista; calorias; treino de 3x/semana em casa |
| Bruno, 24, quer ganhar massa | "+4 kg de massa magra em 9 meses" | superávit pequeno; treino 4–5x; progressão |
| Carla, 51, quer saúde | "cintura < metade da altura" + "150 min de caminhada" | metas simples; força 2x/semana; sem contagem obsessiva |
| Diego, 29, performance | "agachamento de 100 → 130 kg" ou "10 km em < 50 min" | força/carboidrato por carga de treino; acompanhamento |

## 3. Objetivos e métricas aceitas

| Objetivo (`GoalType`) | Métricas numéricas aceitas | Previsão de prazo? |
|---|---|---|
| Emagrecimento (`fat_loss`) | peso (kg) ou % de gordura | Sim |
| Ganho de massa (`muscle_gain`) | peso (kg) ou massa magra (kg) | Sim |
| Recomposição (`recomposition`) | % de gordura, cintura | Não — acompanhamento |
| Saúde (`health`) | razão cintura/estatura (exige medir a cintura), minutos de atividade | Não — acompanhamento |
| Performance força (`performance_strength`) | carga (kg) num exercício | Não — acompanhamento |
| Performance resistência (`performance_endurance`) | tempo/distância | Não — acompanhamento |

Regra de produto: **o app nunca promete data quando não há base científica para prever**. Ele diz isso com essas palavras.

## 4. Fluxo principal

```
Boas-vindas → Consentimento (LGPD, destacado) → Triagem de saúde
   → Perfil (sexo, idade, altura, peso, atividade, experiência, dias e minutos de treino, equipamento)
   → Avaliação: 3 fotos guiadas (+ fita métrica opcional)
   → Resultado da avaliação (faixa de % de gordura, IMC, cintura/estatura)
   → Meta: tipo + métrica + valor + prazo
   → Viabilidade: ok / agressiva / inviável (com prazos sugeridos) / insegura
   → Plano: Dieta (metas + guia) | Treino (sessões) | Aeróbio
   → Rotina: pesagem diária, registro de treino, registro simples de comida
   → Check-in semanal (domingo): ajuste automático + mensagens
   → Reavaliação com fotos a cada 2–4 semanas
```

## 5. Telas (MVP)

1. **Onboarding** — 3 cartões: o que o app faz, o que não faz (estimativa por foto, não exame nem bioimpedância), privacidade.
2. **Consentimento** — caixas separadas e desmarcadas: (a) dados de saúde para gerar o plano; (b) fotos corporais para estimativa; (c) opcional: uso anônimo para melhorar o app. Link para política de privacidade. Sem (a) e (b) o app explica o que não vai funcionar.
3. **Triagem** — perguntas da `ScreeningAnswers` + data de nascimento. Bloqueios com mensagem acolhedora e indicação de profissional.
4. **Perfil** — formulário com validação (altura 120–230 cm, peso 30–300 kg etc.).
5. **Captura de fotos** — câmera guiada: silhueta-guia na tela, frente/lado/costas, contagem regressiva de 10 s, checagem de luz e enquadramento antes de enviar. Instruções: roupa de treino justa (sem nudez), manhã, em jejum, mesma luz e distância.
6. **Fita métrica (opcional)** — oferecida depois das fotos com "pular". Ilustração de onde medir cada circunferência, 2 medidas por local (o app usa a média). A cintura também é necessária se a meta for razão cintura/estatura.
7. **Resultado da avaliação** — faixa de % de gordura (barra com intervalo), métodos usados, massa magra/gorda, IMC, cintura/estatura com a classificação NICE. Botão "de onde vem isso?".
8. **Definir meta** — seletor de tipo → métrica → valor → prazo (semanas ou data).
9. **Viabilidade** — card com status e, se inviável, 2 botões: "usar prazo recomendado (N sem)" / "ajustar meta".
10. **Plano — Dieta** — calorias, proteína, gordura, carboidrato; proteína por refeição; 3 regras do Guia Alimentar; avisos (piso calórico etc.).
11. **Plano — Treino** — lista de sessões; cada exercício com séries × repetições (ou segundos), RIR explicado em linguagem simples, descanso; vídeo/ilustração do movimento.
12. **Registro de treino** — carga e repetições por série; sugere aumento de carga pela progressão dupla.
13. **Pesagem** — 1 toque por dia; gráfico com tendência (não só pontos).
14. **Check-in semanal** — adesão (slider), sintomas de alerta (checkbox), resultado do ajuste com explicação.
15. **Progresso** — fotos lado a lado (mesma pose), tendência de peso, medidas, cargas.
16. **Configurações/Privacidade** — exportar meus dados, apagar fotos, apagar conta, revogar consentimentos.

## 6. Requisitos funcionais (critérios de aceite)

- RF1. Todo número de plano exibido vem do motor (`engine/`) e mostra suas fontes. Nenhum número é gerado por LLM.
- RF2. A IA de foto devolve **faixa** de % de gordura + checagem de qualidade; fotos ruins são recusadas com o motivo ("luz insuficiente", "corpo cortado").
- RF3. A meta só é salva com métrica numérica e prazo; a tela de viabilidade aparece sempre.
- RF4. Metas inseguras (IMC-alvo < 18,5; % de gordura abaixo de 6 % H / 14 % M) não geram plano.
- RF5. Triagem com bloqueio → nenhum número de dieta é exibido; treino só se liberado.
- RF6. Check-in não altera calorias com menos de 14 dias de pesagens; ajuste máximo de ±250 kcal; nunca abaixo do piso.
- RF7. Sintomas de alerta → pausa do déficit + mensagem de procurar profissional.
- RF8. Usuário consegue apagar todas as fotos e a conta em até 2 toques a partir de Configurações; apagamento efetivo no servidor (incluindo Storage).
- RF9. Funciona offline para registrar treino e peso; sincroniza depois.
- RF10. Acessibilidade: textos com escala dinâmica, contraste AA, leitor de tela nos gráficos (resumo textual).

## 7. Requisitos não funcionais

- Geração de plano < 3 s (motor é puro e rápido; a análise de foto pode levar mais e mostra progresso).
- Fotos: criptografadas em repouso, acesso só do dono, URLs assinadas de curta duração, nunca usadas para treinar modelos sem consentimento separado.
- Logs e analytics **sem** dados de saúde ou fotos.
- Versão do motor (`engineVersion`) gravada em cada plano para auditoria.

## 8. Fora do MVP (v2+)

- Cardápio com alimentos e gramas (depende do modelo legal — ver doc 04) usando tabela TACO/TBCA.
- Integração com Apple Health / Health Connect (peso e passos).
- Modo profissional: nutricionista/educador físico acompanha clientes e aprova planos.
- Estudo de validação próprio (fotos vs. DXA) para calibrar o erro da IA.
- Lembretes inteligentes; widgets.

## 9. Métricas de sucesso

- % de usuários que completam a primeira avaliação (fotos + fita).
- % que chegam ao 4º check-in semanal (retenção que importa).
- % de metas marcadas "inviável" que aceitam o prazo recomendado.
- Erro médio entre ritmo planejado e ritmo real após 8 semanas.
- Zero incidentes de dados de saúde/fotos.
