# Segurança do usuário, LGPD e regulamentação

> Este documento organiza os pontos que o projeto precisa resolver. **Não é parecer jurídico.** Antes de publicar, valide com um advogado de direito digital/saúde e com os conselhos profissionais (CRN e CREF).

## 1. Triagem de saúde (implementada em `engine/src/safety.ts`)

| Situação | O que o app faz |
|---|---|
| Menor de 18 anos | Bloqueia o uso. |
| Gestante ou amamentando | Não mostra números de dieta; orienta procurar nutricionista e médico. |
| Histórico de transtorno alimentar | Não mostra calorias, déficit nem metas de peso; orienta nutricionista + psicólogo. |
| Doença crônica que exige liberação (cardiovascular, renal, diabetes com insulina etc.) | Sem liberação: sem números de dieta. Com liberação: segue com aviso. |
| Dor no peito, desmaio ou tontura ao se exercitar | Sem liberação médica: sem treino. |
| IMC < 18,5 com meta de emagrecimento | Não monta plano de emagrecimento. |
| Meta de % de gordura < 6 % (H) / 14 % (M) ou peso-alvo com IMC < 18,5 | Meta marcada como insegura; sem plano. |
| Sinais de deficiência energética no check-in | Pausa o déficit e orienta procurar profissional (consenso IOC REDs 2023). |

Mensagens de bloqueio: acolhedoras, sem culpa, sempre com o próximo passo. Se a pessoa demonstrar sofrimento emocional, mostrar o CVV (ligação gratuita **188**).

Regras de conteúdo para o app inteiro:

- Nada de "antes e depois" com linguagem de vergonha; fotos são do próprio usuário e privadas.
- Nada de comentários sobre aparência vindos da IA (o prompt proíbe; o servidor descarta campos extras).
- O app nunca sugere jejum prolongado, diuréticos, laxantes, "detox" ou suplementos como necessários.

## 2. Profissões regulamentadas no Brasil — o ponto mais sensível do projeto

### 2.1 Nutrição — Lei nº 8.234/1991

O art. 3º da lei lista como atividades **privativas do nutricionista**, entre outras, a assistência e educação nutricional a indivíduos e a prescrição/planejamento de dietas. O Sistema CFN/CRN afirma publicamente que prescrição dietética é atividade privativa do nutricionista e que, feita por outro profissional, caracteriza exercício ilegal da profissão.

**Implicação para o app:** gerar um **cardápio individualizado** (alimentos, quantidades, horários) para uma pessoa específica tende a ser enquadrado como prescrição dietética. Metas de calorias/macros com explicação e fontes, mais as orientações gerais do Guia Alimentar, ficam numa zona menos arriscada — mas não isenta.

### 2.2 Educação física — Lei nº 9.696/1998

O exercício das atividades de Educação Física é prerrogativa dos profissionais registrados nos Conselhos Regionais (CREF). Programas de treino individualizados gerados por software são zona cinzenta.

### 2.3 Três modelos de operação (escolha um antes de lançar)

| Modelo | Como funciona | Risco regulatório | Custo |
|---|---|---|---|
| **A. Educativo com responsável técnico** | App mostra metas numéricas com fontes e orientações gerais; nutricionista (CRN) e profissional de educação física (CREF) são responsáveis técnicos, revisam regras, textos e premissas do motor. Sem cardápio individual. | Médio | Baixo |
| **B. Profissional no fluxo** | Plano gerado pelo motor vai para um profissional que revisa e aprova (equipe própria ou parceiros). Cardápio liberado. | Baixo | Alto (por usuário) |
| **C. Ferramenta para profissionais (B2B)** | O app é vendido a nutricionistas/personal trainers, que prescrevem para os clientes usando o motor. | Baixo | Médio |

Sugestão de caminho: lançar em **A** (MVP sem cardápio), validar retenção, e evoluir para **B** ou **C** quando ativar o cardápio.

### 2.4 Software como dispositivo médico (ANVISA)

A ANVISA regula software como dispositivo médico (RDC nº 657/2022). Se o app alegar **diagnóstico ou tratamento** de doença, pode cair nessa categoria. Mantenha o posicionamento de **bem-estar e condicionamento físico**, sem alegações clínicas. Confirme o enquadramento com o advogado.

## 3. LGPD (Lei nº 13.709/2018)

| Tema | O que fazer no app |
|---|---|
| Dado sensível | Dados de saúde (peso, % de gordura, triagem) e fotos corporais são dados pessoais sensíveis (art. 5º, II). |
| Base legal | Consentimento **específico e destacado** (art. 11, I): caixa própria, separada dos termos de uso, uma por finalidade (gerar plano; analisar fotos; pesquisa anônima opcional). Registrar versão do termo, data e hora. |
| Revogação | Revogar consentimento em Configurações, com efeito imediato (para fotos: apagar). |
| Direitos do titular | Acesso, correção, portabilidade e eliminação (art. 18): `exportMyData` e `deleteMyData`. |
| Transferência internacional | Se algum processamento ocorrer fora do Brasil (ex.: modelo de IA em outra região), declarar na política de privacidade e seguir o art. 33. |
| Menores | O app é 18+; idade verificada no cadastro. |
| Encarregado (DPO) | Nomear e publicar o contato (art. 41). |
| Relatório de impacto | Elaborar o RIPD para o tratamento de dados sensíveis (art. 38) antes do lançamento. |
| Segurança | Criptografia em trânsito e em repouso; acesso só do dono; URLs assinadas curtas; logs sem dados de saúde; plano de resposta a incidentes (comunicar ANPD e titulares quando aplicável). |
| Retenção | Fotos: manter enquanto a conta existir ou até o usuário apagar; oferecer apagamento automático de fotos antigas (ex.: > 12 meses). |
| IA | Contrato/termos do provedor de IA não podem permitir uso das fotos para treinar modelos. Confirme as condições de uso de dados da API escolhida. |

## 4. Lojas de aplicativos

### Apple App Store — diretriz 1.4.1

Apps médicos que possam fornecer dados imprecisos recebem escrutínio maior; apps precisam **divulgar dados e metodologia** que sustentem alegações de precisão de medições de saúde, e devem lembrar o usuário de consultar um médico. O app atende isso com:

- botão "de onde vem isso?" em todo número (fontes do motor);
- página "Como estimamos" com a tabela de métodos e erros assumidos (doc 02, seção 1);
- texto fixo de aviso (`DISCLAIMER_PT` no motor) e lembrete para consultar profissional;
- **nunca** afirmar que mede bioimpedância ou que a foto tem precisão de exame.

Dados do HealthKit (se integrar): não usar para publicidade nem vender; seguir as regras de dados de saúde da Apple.

### Google Play

Preencher a declaração de apps de saúde no Play Console e seguir a política contra desinformação de saúde. Mesmas regras de texto.

## 5. Textos: faça / não faça

| Não escreva | Escreva |
|---|---|
| "Bioimpedância pela câmera" | "Estimativa de gordura corporal por foto" |
| "Seu percentual de gordura é 18,3 %" | "Estimativa: entre 16 % e 21 % (fita + foto)" |
| "Dieta personalizada" (modelo A) | "Metas de calorias e proteína para o seu objetivo" |
| "Garantido em 12 semanas" | "No ritmo recomendado, cerca de 12 semanas" |
| "Diagnóstico", "tratamento", "cura" | "Acompanhamento", "orientação", "meta" |
| "Você está gordo / fora de forma" | Números neutros + classificação da diretriz citada |

## 6. Nome "BodyBalanceAI" — checar marca antes de investir

O nome não promete bioimpedância, o que resolve o risco de alegação enganosa. O risco que sobra é de **marca**:

- A Les Mills tem a marca **LES MILLS BODYBALANCE** registrada e ativa nos EUA (registro 5975275, classe 9 — conteúdos digitais de fitness), e o BODYBALANCE é um programa de aulas conhecido em academias, inclusive no Brasil.
- Já existe na App Store um app chamado "Body Balance: Calories & Water" (saúde e fitness).

Não é impedimento automático, mas faça uma **busca de anterioridade no INPI** (classes 9 — software, 41 — treinamento físico, 44 — serviços de saúde/nutrição) e, se for lançar fora do Brasil, no USPTO/EUIPO. Peça ao advogado uma opinião antes de registrar domínio, logo e conta nas lojas. Se houver conflito, variações como um nome próprio + "AI" costumam ser mais seguras.

## 7. Checklist antes de publicar

- [ ] Busca de marca "BodyBalanceAI" no INPI (e USPTO/EUIPO se for internacional) e pedido de registro.
- [ ] Modelo de operação (A, B ou C) definido e validado com advogado.
- [ ] Responsáveis técnicos (CRN e CREF) revisaram o doc 02 e a lista de premissas.
- [ ] Política de privacidade e termos de uso publicados; RIPD elaborado; encarregado nomeado.
- [ ] Consentimentos separados funcionando e registrados.
- [ ] Exportar e apagar dados testados de ponta a ponta (inclusive Storage).
- [ ] Regras do Firestore/Storage testadas no emulador (outro usuário não lê nada).
- [ ] Textos revisados contra a tabela da seção 5.
- [ ] Página "Como estimamos" no app e no site.
