# Base científica do motor

Este documento é a fonte da verdade para **todo número** que o app mostra ao usuário. O código em `engine/src/config.ts` deve refletir exatamente o que está aqui. Mudou um número? Mude os dois e rode os testes.

Convenções:

- **[Fonte]** = número tirado de diretriz, consenso ou estudo.
- **[Premissa]** = escolha do projeto, sem fonte direta. Precisa ser revisada por nutricionista e profissional de educação física e calibrada com dados reais do app.

---

## 1. Avaliação corporal (o que a foto pode e não pode fazer)

### 1.1 Só fotos + dados informados (não é bioimpedância)

O BodyBalanceAI usa apenas fotos e dados que o usuário informa. Não mede bioimpedância (isso exige corrente elétrica, não câmera) nem se integra com balanças. Fontes do % de gordura:

| Fonte | Como entra no app | Obrigatória? | Erro-padrão usado na ponderação |
|---|---|---|---|
| Foto (IA) | Gemini estima uma **faixa** a partir de 3 fotos padronizadas | Sim (é o centro do app) | 5,0 p.p. **[Premissa]** |
| Equação de Deurenberg (IMC + idade + sexo) | o motor calcula sozinho com altura, peso, idade e sexo | Automática | 4,1 p.p. **[Fonte]** |
| Fita métrica (método da Marinha dos EUA) | usuário mede pescoço, cintura (e quadril, mulheres) | Opcional | 3,5 p.p. **[Premissa]** |

As estimativas são combinadas por média ponderada pelo inverso da variância e o resultado sai sempre como faixa. Se a foto e a equação divergirem mais de 6 pontos, o app avisa — é o caso típico de pessoas musculosas, porque o IMC não separa músculo de gordura.

**Equação de Deurenberg** ([Deurenberg, Weststrate & Seidell, 1991](https://pubmed.ncbi.nlm.nih.gov/2043597/)), adultos:

`%G = 1,20·IMC + 0,23·idade − 10,8·sexo − 5,4` (homem = 1, mulher = 0; erro-padrão da estimativa 4,1 p.p.)

Limitações declaradas: leve superestimação em pessoas com obesidade; não separa músculo de gordura. Por isso ela nunca é usada sozinha quando há fotos.

**Por que a foto tem o maior erro assumido (por enquanto):** existe evidência de que modelos de visão computacional *treinados especificamente para isso* estimam % de gordura por foto de celular com erro médio de ~2,2 pontos percentuais contra DXA ([Majmudar et al., 2022, npj Digital Medicine](https://pmc.ncbi.nlm.nih.gov/articles/PMC9243018/)). Um modelo de linguagem genérico (Gemini) **não é** esse modelo validado. Até o app ter um estudo próprio comparando com DXA, a foto entra com erro assumido maior que o da equação. Quando houver validação própria, o erro da foto cai e ela passa a pesar mais na combinação — é só mudar `METHOD_SE` em `engine/src/bodyComposition.ts`.

### 1.2 Método da Marinha dos EUA (fita métrica, opcional)

[Hodgdon & Beckett, 1984 — homens (DTIC ADA143890), mulheres (DTIC ADA146456)](https://apps.dtic.mil/sti/pdfs/ADA143890.pdf). Versão em centímetros:

- Homens: `%G = 495 / (1,0324 − 0,19077·log10(cintura − pescoço) + 0,15456·log10(altura)) − 450`
- Mulheres: `%G = 495 / (1,29579 − 0,35004·log10(cintura + quadril − pescoço) + 0,22100·log10(altura)) − 450`

Cintura na altura do umbigo; pescoço logo abaixo da laringe; quadril na parte mais larga. O teste automatizado confere que a versão em cm bate com a original em polegadas.

### 1.3 Indicadores de saúde

- **IMC:** baixo peso < 18,5 kg/m² (OMS). O app nunca aceita meta de peso que leve a IMC < 18,5.
- **Razão cintura/estatura** ([NICE NG246](https://www.nice.org.uk/guidance/NG246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity)): 0,40–0,49 saudável; 0,50–0,59 risco aumentado; ≥ 0,60 risco alto. Mensagem ao usuário: "mantenha a cintura menor que metade da altura".
- **Categorias de % de gordura (ACE):** homens — essencial < 6, atleta 6–13, fitness 14–17, aceitável 18–24, obesidade ≥ 25; mulheres — essencial < 14, atleta 14–20, fitness 21–24, aceitável 25–31, obesidade ≥ 32.

---

## 2. Gasto energético

### 2.1 Taxa metabólica basal — Mifflin-St Jeor

[Mifflin et al., 1990](https://doi.org/10.1093/ajcn/51.2.241):

- Homens: `10·peso(kg) + 6,25·altura(cm) − 5·idade + 5`
- Mulheres: `10·peso(kg) + 6,25·altura(cm) − 5·idade − 161`

Escolhida porque, na revisão sistemática de [Frankenfield et al., 2005](https://doi.org/10.1016/j.jada.2005.02.005), foi a equação que mais vezes acertou dentro de 10 % do valor medido — mas ainda erra mais que isso em parte das pessoas. **Por isso o app recalibra** (seção 6).

### 2.2 Gasto total inicial

TMB × fator de atividade: sedentário 1,2 · leve 1,375 · moderado 1,55 · ativo 1,725 · muito ativo 1,9. São multiplicadores convencionais **[Premissa]**: servem só como ponto de partida.

### 2.3 Por que não projetar meses à frente com "7.700 kcal = 1 kg"

[Hall et al., 2011 (Lancet)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/) mostrou que a regra estática superestima a perda de peso ao longo do tempo, porque o gasto cai conforme o peso cai. O app usa 7.700 kcal/kg **apenas** para:

1. calcular o déficit/superávit inicial; e
2. converter o erro da semana em ajuste de calorias no check-in (com dados reais).

O prazo da meta é calculado por **ritmo percentual semanal** (composto), não por soma de calorias.

---

## 3. Viabilidade da meta

Toda meta tem métrica numérica + prazo em semanas. O motor converte em ritmo semanal e compara com os limites abaixo.

### 3.1 Emagrecimento

| Regra | Valor | Fonte |
|---|---|---|
| Ritmo recomendado | 0,5–1,0 % do peso por semana | [Helms et al., 2014](https://doi.org/10.1186/1550-2783-11-20) |
| Onde ficar dentro da faixa | interpolação pelo % de gordura: homens 12 %→0,5 / 25 %→1,0; mulheres 20 %→0,5 / 32 %→1,0 | **[Premissa]** (Helms recomenda ir mais devagar quanto mais magro) |
| Meta de % de gordura mínima sem profissional | homens 6 %, mulheres 14 % | ACE + [IOC REDs 2023](https://pubmed.ncbi.nlm.nih.gov/37752011/) |
| Peso-alvo a partir de % de gordura | `massa magra atual / (1 − %G alvo)` — supõe massa magra preservada | Cálculo; otimista, corrigido no check-in |
| Teto de energia | o ritmo máximo também fica limitado ao que cabe no déficit máximo (seção 4.1) e no piso calórico: `ritmo_máx = déficit_máx × 7 / 7.700 / peso` | NHLBI; garante que uma meta "ok" seja alcançável pela dieta gerada |

Fórmulas:

- Semanas até a meta: `n = ln(peso_alvo / peso_atual) / ln(1 − ritmo)`
- Ritmo para cumprir um prazo: `ritmo = 1 − (peso_alvo / peso_atual)^(1/semanas)`

Resultados possíveis: **ok**, **agressiva** (dentro do máximo, acima do recomendado), **inviável no prazo** (o app propõe o prazo mínimo e o recomendado), **insegura** (bloqueia), **só acompanhamento** (métricas sem previsão confiável, como carga no supino).

### 3.2 Ganho de massa muscular

| Regra | Valor | Fonte |
|---|---|---|
| Ganho de peso — iniciante/intermediário | 0,25–0,5 % do peso por semana | [Iraki et al., 2019](https://doi.org/10.3390/sports7070154) |
| Ganho de peso — avançado | 0,10–0,25 %/semana | Iraki diz "mais conservador"; números **[Premissa]** |
| Fração do ganho que vira massa magra (só para estimar prazo de meta em "kg de massa magra") | 50 % | **[Premissa]** — não há número único na literatura |
| % de gordura em faixa de obesidade (ACE) | sugerir recomposição antes do superávit | **[Premissa]** |

### 3.3 Saúde, recomposição e performance

Sem previsão de data. O app acompanha a métrica a cada check-in:

- **Saúde:** meta típica = razão cintura/estatura < 0,5 + 150–300 min/semana de aeróbio moderado + força 2x/semana ([OMS 2020](https://www.ncbi.nlm.nih.gov/books/NBK566048/)). Se IMC ≥ 25, inclui perda lenta (0,5 %/semana).
- **Recomposição:** calorias de manutenção + proteína alta + treino de força.
- **Performance (força ou resistência):** a métrica (ex.: carga no agachamento, tempo nos 10 km) é registrada e acompanhada; o app não promete data.

---

## 4. Dieta (metas numéricas)

### 4.1 Calorias

| Objetivo | Regra | Fonte |
|---|---|---|
| Emagrecimento | `gasto − (ritmo × peso × 7.700 / 7)` | Helms 2014; Hall 2011 |
| Déficit máximo | menor entre 1.000 kcal/dia e 25 % do gasto | [NHLBI](https://internet-prod.nhlbi.nih.gov/health/educational/wecan/portion/documents/CORESET4.pdf) (redução de 500–1.000 kcal/dia) |
| Piso sem acompanhamento | 1.200 kcal (mulheres) / 1.500 kcal (homens) | NHLBI (planos de baixa caloria) |
| Ganho de massa | gasto × (1 + 15 % iniciante / 10 % intermediário / 5 % avançado) | Iraki 2019 (~10–20 %); avançado **[Premissa]** |
| Manutenção / saúde / performance | gasto estimado | — |
| Resistência | calorias sobem se for preciso para cobrir o carboidrato mínimo | [ACSM/AND/DC 2016](https://doi.org/10.1249/MSS.0000000000000852) |

### 4.2 Proteína

| Situação | Alvo | Fonte |
|---|---|---|
| Em déficit | 2,3 g/kg de **massa magra** (faixa 2,3–3,1) | Helms 2014; [ISSN 2017](https://doi.org/10.1186/s12970-017-0177-8) |
| Manutenção e superávit | 1,6 g/kg de peso (faixa útil 1,6–2,2) | [Morton 2018](https://doi.org/10.1136/bjsports-2017-097608) (ponto de quebra ~1,6 g/kg); Iraki 2019 |
| Resistência | 1,4 g/kg (faixa ISSN 1,4–2,0) | ISSN 2017 |
| Por refeição | ≥ 0,25 g/kg (ou 20–40 g) | ISSN 2017 |

Usar massa magra no déficit evita prescrever proteína exagerada para quem tem muita gordura corporal.

### 4.3 Gordura e carboidrato

- **Gordura:** 25 % das calorias; nunca abaixo de 20 %. Helms usa 15–30 % para atletas de fisiculturismo; para o público geral o app usa 20 % como piso **[Premissa]**.
- **Carboidrato:** o que sobra das calorias.
- **Performance de resistência** (ACSM/AND/DC 2016), em g/kg/dia: leve 3–5 · moderado (~1 h/dia) 5–7 · alto (1–3 h/dia) 6–10 · extremo (≥ 4 h/dia) 8–12. Carga extrema → recomenda nutricionista esportivo.

### 4.4 Qualidade dos alimentos

O app não inventa regras de qualidade: usa o **Guia Alimentar para a População Brasileira** (Ministério da Saúde, 2ª ed., 2014) — base em alimentos in natura ou minimamente processados, processados com moderação, evitar ultraprocessados. O próprio Conselho Federal de Nutricionistas reafirma o Guia como referência principal no país.

### 4.5 Cardápio

As metas acima viram cardápio assim (ver `docs/03-ARQUITETURA.md`):

1. A IA **só escolhe alimentos e combinações** (culturalmente adequados, respeitando restrições e preferências).
2. O **motor calcula as gramas** usando uma tabela de composição brasileira (TACO/UNICAMP ou TBCA/USP). Modelo de linguagem não faz a conta.
3. Cardápio individualizado é ato privativo de nutricionista no Brasil — ver `docs/04-SEGURANCA-E-LEGAL.md` antes de lançar essa função.

---

## 5. Treino

### 5.1 Força

| Variável | Regra | Fonte |
|---|---|---|
| Frequência | todos os grandes grupos ≥ 2x/semana | [ACSM 2026](https://acsm.org/resistance-training-guidelines-update-2026/); OMS 2020; Schoenfeld 2016 |
| Volume semanal por grande grupo | Saúde 4/6/8 · Emagrecimento 8/10/12 · Recomposição 10/12/14 · Hipertrofia 10/14/18 · Força 6/9/12 (iniciante/intermediário/avançado) | Pelland et al. (ir de ~6 para ~12 séries traz ganho claro; retornos decrescentes depois); valores exatos **[Premissa]** |
| Séries indiretas | contam 0,5 série (ex.: supino conta 0,5 para tríceps) | Pelland et al. (método "fracionário") |
| Grupos menores | 60 % do alvo dos grandes, descontando as indiretas | **[Premissa]** |
| Repetições — hipertrofia | multiarticulares 6–10, isolados 10–15 | [Schoenfeld 2021](https://doi.org/10.3390/sports9020032): hipertrofia ocorre em faixa ampla de cargas |
| Proximidade da falha — hipertrofia | RIR 1–2 (iniciantes 2–3) | [Robinson 2024](https://doi.org/10.1007/s40279-024-02069-2): hipertrofia melhora perto da falha; força quase não depende disso |
| Força | 3–6 repetições, ~80–90 % de 1RM, RIR 1–3 | ACSM 2026 (~80 % 1RM); Schoenfeld 2021; Robinson 2024 |
| Saúde | 8–15 repetições, RIR 2–4 | ACSM 2026: ir à falha não é necessário para o adulto médio |
| Descanso | multiarticulares 2–3 min; isolados 1–2 min | Schoenfeld 2016 (descanso mais longo favoreceu força e hipertrofia) |
| Progressão | progressão dupla (repetições → carga +2,5–5 %) | ACSM 2026 (sobrecarga progressiva); percentuais **[Premissa]** |

**Caber no tempo da sessão:** se a sessão estimada passar do tempo que a pessoa informou, o motor corta primeiro as séries diretas dos grupos menores (core, panturrilha, bíceps, tríceps) e depois séries dos grandes grupos, sem descer abaixo da "dose mínima" (o volume do objetivo saúde) **[Premissa]**. Se ainda não couber, avisa e sugere mais dias ou bi-séries — estratégia de economia de tempo descrita por Iversen et al., 2021. Iniciantes repetem o mesmo exercício principal nas sessões da semana para aprender a técnica **[Premissa]**.

Divisões por dias disponíveis: 2–3 dias corpo inteiro; 4 dias superior/inferior; 5 dias superior/inferior + empurrar/puxar/pernas; 6 dias empurrar/puxar/pernas 2x. O teste automatizado garante ≥ 2x/semana por grande grupo em todas as opções.

Mensagem central do ACSM 2026 para o app: **a maior diferença é sair do zero para qualquer treino de força**; o melhor programa é o que a pessoa consegue manter.

### 5.2 Aeróbio

| Objetivo | Minutos/semana (moderado) | Fonte |
|---|---|---|
| Saúde | 150–300 (ou 75–150 vigoroso) | OMS 2020 |
| Emagrecimento | começa em 150 e sobe até 225 | [Donnelly 2009 (ACSM)](https://pubmed.ncbi.nlm.nih.gov/19127177/): < 150 min tem efeito mínimo; 225–420 min dá as maiores perdas; > 250 min ajuda a manter |

---

## 6. Check-in semanal (o que corrige os erros das equações)

1. **Tendência de peso** por regressão linear das pesagens (ideal: diária, ao acordar). Nunca "peso de hoje vs. semana passada".
2. Exige **≥ 14 dias** e ≥ 8 pesagens antes de mexer nas calorias **[Premissa]** (o efeito de água e glicogênio mascara a primeira semana).
3. Se a adesão autorrelatada < 80 %, não mexe nas calorias: primeiro melhora a adesão **[Premissa]**.
4. Erro tolerado: ±0,15 p.p. de peso/semana **[Premissa]**.
5. Ajuste = `erro × peso × 7.700 / 7`, limitado a **±250 kcal por check-in** **[Premissa]**, nunca abaixo do piso.
6. Perda > 1,5 %/semana → aumenta 250 kcal mesmo com adesão baixa.
7. **Sinais de deficiência energética** ([IOC REDs 2023](https://pubmed.ncbi.nlm.nih.gov/37752011/)): alteração menstrual, cansaço persistente, lesões/doenças frequentes, humor baixo, tontura → **pausa o déficit** e recomenda médico/nutricionista.
8. Fotos a cada 2–4 semanas com o mesmo protocolo; fita métrica a cada 2 semanas.

---

## 7. Lista de premissas a validar com profissionais

| # | Premissa | Onde | Como validar |
|---|---|---|---|
| P1 | Erros-padrão da foto (5 p.p.) e da fita (3,5 p.p.) | `bodyComposition.ts` | Estudo próprio comparando foto do app com DXA em amostra de usuários |
| P2 | Interpolação do ritmo de emagrecimento por % de gordura | `config.ts` | Revisão por nutricionista esportivo |
| P3 | Ritmo de ganho para avançados (0,10–0,25 %) | `config.ts` | Revisão + dados de check-in |
| P4 | 50 % do ganho vira massa magra | `config.ts` | Acompanhar a evolução das estimativas dos usuários em ganho e o estudo de validação |
| P5 | Volumes semanais exatos por objetivo | `config.ts` | Revisão por profissional de educação física |
| P6 | Gordura mínima 20 % das calorias | `config.ts` | Revisão por nutricionista |
| P7 | Regras do check-in (14 dias, 80 % adesão, ±0,15, ±250 kcal) | `checkin.ts` | Simulação + dados reais |
| P8 | Fatores de atividade | `config.ts` | Substituídos pelo gasto adaptativo após 2–4 semanas |
| P9 | Corte de volume para caber no tempo (ordem de corte e "dose mínima") | `training.ts` | Revisão por profissional de educação física |
| P10 | Iniciantes repetem o mesmo exercício principal | `training.ts` | Revisão por profissional de educação física |

---

## 8. Referências

1. Jäger R, et al. ISSN Position Stand: protein and exercise. *J Int Soc Sports Nutr*. 2017;14:20. https://doi.org/10.1186/s12970-017-0177-8
2. Morton RW, et al. Protein supplementation and resistance training: meta-analysis. *Br J Sports Med*. 2018;52(6):376-384. https://doi.org/10.1136/bjsports-2017-097608
3. Helms ER, Aragon AA, Fitschen PJ. Natural bodybuilding contest preparation. *J Int Soc Sports Nutr*. 2014;11:20. https://doi.org/10.1186/1550-2783-11-20
4. Iraki J, et al. Nutrition Recommendations for Bodybuilders in the Off-Season. *Sports*. 2019;7(7):154. https://doi.org/10.3390/sports7070154
5. ACSM. Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults. *Med Sci Sports Exerc*. 2026. https://acsm.org/resistance-training-guidelines-update-2026/
6. Pelland JC, et al. The Resistance Training Dose Response (weekly volume and frequency). *Sports Medicine* / SportRxiv 2024. https://sportrxiv.org/index.php/server/preprint/view/460
7. Schoenfeld BJ, Ogborn D, Krieger JW. Resistance training frequency and hypertrophy. *Sports Med*. 2016;46(11):1689-1697.
8. Schoenfeld BJ, et al. Loading Recommendations… Repetition Continuum. *Sports*. 2021;9(2):32. https://doi.org/10.3390/sports9020032
9. Robinson ZP, et al. Proximity to failure, strength and hypertrophy. *Sports Med*. 2024;54(9):2209-2231. https://doi.org/10.1007/s40279-024-02069-2
10. Schoenfeld BJ, et al. Longer interset rest periods enhance muscle strength and hypertrophy. *J Strength Cond Res*. 2016;30(7):1805-1812.
11. Mifflin MD, et al. A new predictive equation for resting energy expenditure. *Am J Clin Nutr*. 1990;51(2):241-247. https://doi.org/10.1093/ajcn/51.2.241
12. Frankenfield D, et al. Predictive equations for resting metabolic rate: systematic review. *J Am Diet Assoc*. 2005;105(5):775-789. https://doi.org/10.1016/j.jada.2005.02.005
13. Hall KD, et al. Quantification of the effect of energy imbalance on bodyweight. *Lancet*. 2011;378(9793):826-837. https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/
14. WHO. Guidelines on physical activity and sedentary behaviour. 2020. https://www.ncbi.nlm.nih.gov/books/NBK566048/
15. Donnelly JE, et al. ACSM Position Stand: physical activity for weight loss. *Med Sci Sports Exerc*. 2009;41(2):459-471. https://pubmed.ncbi.nlm.nih.gov/19127177/
16. Thomas DT, Erdman KA, Burke LM. Nutrition and Athletic Performance (ACSM/AND/DC). *Med Sci Sports Exerc*. 2016;48(3):543-568. https://doi.org/10.1249/MSS.0000000000000852
17. Mountjoy M, et al. 2023 IOC consensus statement on REDs. *Br J Sports Med*. 2023;57(17):1073-1097. https://pubmed.ncbi.nlm.nih.gov/37752011/
18. NHLBI/NIH. Low-calorie diets for weight loss. https://internet-prod.nhlbi.nih.gov/health/educational/wecan/portion/documents/CORESET4.pdf
19. Hodgdon JA, Beckett MB. Prediction of percent body fat for U.S. Navy men/women. NHRC, 1984. https://apps.dtic.mil/sti/pdfs/ADA143890.pdf · https://apps.dtic.mil/sti/pdfs/ADA146456.pdf
20. NICE NG246 — central adiposity / waist-to-height ratio. https://www.nice.org.uk/guidance/NG246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity
21. Majmudar MD, et al. Smartphone camera based assessment of adiposity. *NPJ Digit Med*. 2022;5:79. https://pmc.ncbi.nlm.nih.gov/articles/PMC9243018/
22. Ministério da Saúde. Guia Alimentar para a População Brasileira. 2ª ed. 2014.
23. Iversen VM, Norum M, Schoenfeld BJ, et al. Designing Time-Efficient Training Programs for Strength and Hypertrophy: A Narrative Review. *Sports Med*. 2021;51:2079-2095.
24. Deurenberg P, Weststrate JA, Seidell JC. Body mass index as a measure of body fatness: age- and sex-specific prediction formulas. *Br J Nutr*. 1991;65(2):105-114. https://pubmed.ncbi.nlm.nih.gov/2043597/
