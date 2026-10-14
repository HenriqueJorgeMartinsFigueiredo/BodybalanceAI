# BodyBalanceAI — roteiro de desenvolvimento no Antigravity (prompts prontos)

Como usar:

1. Faça **uma fase por vez**, na ordem. Cole o prompt da fase no painel do agente.
2. Antes de aprovar, leia o **Implementation Plan** que o agente gera. Se ele propuser calcular números de saúde fora do `engine/`, recuse.
3. Ao final de cada fase, confira os **critérios de aceite** e peça o *Walkthrough*. Só então faça commit e passe para a próxima.
4. Se precisar de ajuda para conferir algo de ciência, digite `/revisar-ciencia`. Para executar uma fase com o checklist completo, `/implementar-fase`.

> As regras em `AGENTS.md` e `.agents/rules/` são carregadas automaticamente pelo Antigravity. Você não precisa repeti-las nos prompts.

---

## Fase 0 — Preparar o workspace

```
Leia AGENTS.md, docs/01-PRD.md e docs/03-ARQUITETURA.md.

Tarefa:
1. Inicialize um repositório git na raiz (se ainda não houver) com .gitignore para Node, Flutter e Firebase.
2. Rode os testes do motor: `cd engine && npm install && npm test`. Todos precisam passar. Não altere nada no engine nesta fase.
3. Crie a estrutura vazia do Firebase na raiz (firebase.json, firestore.rules, storage.rules, .firebaserc com um placeholder de projeto) e configure o Emulator Suite (Auth, Firestore, Storage, Functions).
4. Crie um README de desenvolvimento curto em docs/DEV.md com os comandos para rodar testes e emuladores.

Critérios de aceite:
- `npm test` no engine passa.
- `firebase emulators:start` sobe sem erro (pode estar sem functions ainda).
- Nenhum segredo commitado.
```

## Fase 1 — Cloud Functions com o motor

```
Leia docs/03-ARQUITETURA.md (seções 3, 4 e 6) e engine/src/index.ts.

Tarefa: criar functions/ em TypeScript (Node 22, Cloud Functions 2ª geração, região southamerica-east1).
1. O deploy das functions precisa incluir o motor sem dependência `file:` fora da pasta functions. Implemente um predeploy que compila engine/ e copia o resultado para dentro de functions/. Explique a solução no plano.
2. Schemas zod espelhando os tipos de engine/src/types.ts (Profile, Measurements, BodyFatEstimate, Goal, ScreeningAnswers).
3. Callables: `assessGoal`, `createPlan`, `weeklyCheckin` conforme a tabela da seção 6. Todas exigem auth e App Check (no emulador, App Check pode ficar em modo debug).
4. createPlan lê os dados do Firestore do próprio usuário, chama generatePlan(), grava em users/{uid}/plans/{id} com active=true e desativa o plano anterior numa transação.
5. Testes com o emulador: plano é gerado; usuário A não consegue gerar plano com dados do usuário B; entrada inválida retorna erro claro.

Não faça:
- Não reimplemente nenhuma fórmula; só chame o engine.
- Não registre em log peso, % de gordura, triagem ou meta.

Critérios de aceite:
- Testes das functions passam no emulador.
- `npm test` do engine continua passando.
```

## Fase 2 — App Flutter: base, login e consentimentos

```
Leia docs/01-PRD.md (seções 4, 5 e 7) e docs/04-SEGURANCA-E-LEGAL.md (seção 3).

Tarefa: criar app/ em Flutter (iOS + Android) com Riverpod e go_router.
1. Tema claro/escuro, tipografia com escala dinâmica, textos em pt-BR via arquivos de localização (nada de texto fixo no código).
2. Login com Apple, Google e e-mail (Firebase Auth). Firestore com persistência offline.
3. Telas de onboarding do BodyBalanceAI (3 cartões; um deles explica que a estimativa vem das fotos e dos dados informados, e que não é exame nem bioimpedância) e de consentimento com 3 caixas separadas e desmarcadas: dados de saúde (obrigatória para o plano), fotos corporais (obrigatória para análise por foto), pesquisa anônima (opcional). Grave versão do termo + data/hora em users/{uid}.consents.
4. Tela de Configurações com: revogar cada consentimento, links para política de privacidade e termos (placeholders).

Critérios de aceite:
- `flutter analyze` sem avisos; `flutter test` passa (testes de widget das telas de consentimento).
- Sem consentimento de saúde, o app não deixa avançar para a triagem e explica por quê.
```

## Fase 3 — Triagem e perfil

```
Leia engine/src/safety.ts, engine/src/types.ts (ScreeningAnswers, Profile) e docs/04-SEGURANCA-E-LEGAL.md (seção 1).

Tarefa:
1. Tela de triagem com data de nascimento + as perguntas de ScreeningAnswers em linguagem simples. Grave em users/{uid}/screenings.
2. Mostre o resultado da triagem exatamente como o motor decidir (chame uma callable que roda `screen()` ou deixe para createPlan, mas a UI não decide bloqueios sozinha). Mensagens de bloqueio acolhedoras com o próximo passo; inclua o CVV 188 na tela de histórico de transtorno alimentar.
3. Tela de perfil com validação de faixas (altura 120–230 cm, peso 30–300 kg, dias de treino 2–6, minutos 20–180) e explicação de cada nível de atividade e de experiência.

Critérios de aceite:
- Menor de 18 anos não passa da triagem.
- Testes de widget cobrem: bloqueio por idade, gestação, histórico de transtorno alimentar.
```

## Fase 4 — Avaliação: fotos guiadas, fita métrica e IA

```
Leia docs/03-ARQUITETURA.md (seção 7 inteira) e docs/02-BASE-CIENTIFICA.md (seção 1).

Tarefa:
1. Câmera guiada (frente, lado, costas) com silhueta-guia, contagem regressiva de 10 s e checagem no aparelho com ML Kit Pose Detection (corpo inteiro, uma pessoa, pose certa) e brilho. Instruções do protocolo na tela.
2. Upload para users/{uid}/photos/{setId}/ e criação de photoSets/{setId}.
3. Callable `analyzePhotos` no servidor: usa o modelo da variável GEMINI_VISION_MODEL, a instrução de sistema e o JSON Schema da seção 7.3 (versão photo-v1), valida com zod e aplica todas as guardas da seção 7.4. Consulte a documentação atual do SDK @google/genai antes de escrever a chamada. Chave em Secret Manager, nunca no app.
4. Tela OPCIONAL da fita métrica, oferecida depois das fotos com botão "pular": ilustração de cada ponto, 2 medidas por local, o app usa a média. Não existe campo para balança de bioimpedância nem exame — o app usa só fotos e dados informados.
5. Tela de resultado: faixa de % de gordura (barra com intervalo), métodos usados (foto, cálculo pelo IMC e, se houver, fita), massa magra e gorda, IMC, cintura/estatura com classificação NICE, e o botão "de onde vem isso?" listando as fontes que o motor devolveu.

Não faça:
- Não mostre um número único de % de gordura; sempre a faixa.
- Não use a palavra "bioimpedância" para a foto.

Critérios de aceite:
- Foto com corpo cortado é recusada no aparelho com instrução específica.
- Pulando a fita, o resultado aparece normalmente (foto + equação pelo IMC) com a sugestão opcional de medir.
- Teste da function com resposta simulada do Gemini cobrindo: ok, faixa estreita (é alargada para 6), possible_minor, nudity (fotos apagadas), JSON inválido.
```

## Fase 5 — Meta e viabilidade

```
Leia engine/src/goals.ts e docs/02-BASE-CIENTIFICA.md (seção 3).

Tarefa:
1. Tela "Definir meta": tipo → métrica (só as permitidas para o tipo, ver docs/01-PRD.md seção 3) → valor → prazo (semanas ou data).
2. Antes de salvar, chame a callable assessGoal e mostre o card de viabilidade com o status e as mensagens do motor:
   - ok / agressiva: botão "Gerar meu plano"
   - inviável no prazo: botões "Usar prazo recomendado (N semanas)" e "Ajustar meta"
   - insegura: explicação + "Ajustar meta"
   - só acompanhamento: texto do motor dizendo que não prometemos data
3. Ao confirmar, salve a meta e chame createPlan.

Critérios de aceite:
- Teste de widget para cada status.
- Nenhuma conta de prazo na UI; tudo vem do motor.
```

## Fase 6 — Plano: dieta, treino e aeróbio

```
Leia o formato de saída em engine/examples/exemplo-plano.json e docs/01-PRD.md (telas 10 e 11).

Tarefa:
1. Aba Dieta: calorias, proteína, gordura, carboidrato, proteína por refeição, as 3 orientações do Guia Alimentar e os avisos (flags) do motor.
2. Aba Treino: sessões da semana; cada exercício com séries × repetições (ou segundos quando unit = "seconds"), RIR explicado ("pare quando sentir que faria mais 1–2 repetições"), descanso e nota de carga. Placeholder para ilustração/vídeo do exercício.
3. Aeróbio: minutos de início, meta e a progressão do motor.
4. Componente reutilizável "De onde vem isso?" que recebe a lista de fontes de um número e abre uma folha com as citações; fontes do tipo "premissa" aparecem marcadas como "escolha do app, revisada por profissional".
5. Página "Como estimamos" (acessível pelas Configurações) com o conteúdo da seção 1 de docs/02-BASE-CIENTIFICA.md e o DISCLAIMER_PT do motor.

Critérios de aceite:
- Todo número exibido tem o botão de fontes.
- Testes de widget renderizam o exemplo-plano.json sem erro.
```

## Fase 7 — Rotina, check-in semanal e progresso

```
Leia engine/src/checkin.ts e docs/02-BASE-CIENTIFICA.md (seção 6).

Tarefa:
1. Pesagem diária com 1 toque; gráfico mostrando a linha de tendência (mesmo método do motor), não só os pontos.
2. Registro de treino por série (carga, repetições, RIR) com sugestão de aumento de carga pela progressão dupla do plano. Funciona offline.
3. Registro simples de alimentação por dia ("segui", "segui parcialmente", "não segui" ou kcal aproximada).
4. Check-in semanal (domingo, com notificação local): slider de adesão, checkboxes dos sintomas de alerta, chama weeklyCheckin e mostra a decisão e as mensagens do motor. Se houver ajuste, o plano novo aparece com a diferença destacada.
5. Tela de progresso: fotos da mesma pose lado a lado, tendência de peso, medidas, cargas do exercício principal.

Critérios de aceite:
- Com menos de 14 dias de pesagem o check-in diz "dados insuficientes" e não muda nada.
- Marcar qualquer sintoma de alerta numa meta de emagrecimento pausa o déficit e mostra a orientação.
```

## Fase 8 — Privacidade, regras de segurança e observabilidade

```
Leia docs/03-ARQUITETURA.md (seções 5, 6 e 9) e docs/04-SEGURANCA-E-LEGAL.md (seção 3).

Tarefa:
1. Implemente firestore.rules e storage.rules conforme a seção 5 e escreva testes de regras no emulador: dono lê/escreve o permitido; outro usuário não lê nada; ninguém escreve plans/ e checkins/ pelo app.
2. Callables exportMyData (JSON + fotos, URL assinada que expira) e deleteMyData (Firestore + Storage + Auth). Teste de ponta a ponta no emulador.
3. Apagamento de fotos individuais e opção de apagar fotos com mais de 12 meses.
4. Crashlytics no app e revisão de todos os logs: nenhum dado de saúde.

Critérios de aceite:
- Testes de regras passam.
- Depois de deleteMyData, nada do usuário existe no Firestore, Storage ou Auth do emulador.
```

## Fase 9 — Preparação para as lojas

```
Leia docs/04-SEGURANCA-E-LEGAL.md (seções 4, 5 e 6).

Tarefa:
1. Revise todos os textos do app contra a tabela "faça / não faça" e liste o que mudou.
2. Rascunhe a descrição da loja (pt-BR) sem alegações proibidas, as notas para o revisor da Apple explicando a metodologia (link para a página "Como estimamos") e as respostas de privacidade (App Privacy da Apple e Data safety do Google Play).
3. Gere a lista de capturas de tela necessárias e quais telas mostrar.
4. Rode a checklist da seção 6 e marque o que falta (itens jurídicos ficam para o responsável).
```
