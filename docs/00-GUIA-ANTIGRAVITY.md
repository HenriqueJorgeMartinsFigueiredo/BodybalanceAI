# Guia do kit de desenvolvimento (Antigravity)

Este pacote é o ponto de partida do projeto. Ele já traz a parte mais difícil de acertar — **a ciência e as regras de segurança** — pronta e testada, e prepara o Antigravity para construir o resto sem inventar números.

## O que tem aqui

| Pasta/arquivo | O que é |
|---|---|
| `AGENTS.md` | Regras que o agente do Antigravity lê sempre (idioma, regras invioláveis, mapa dos docs). |
| `.agents/rules/` | Regras por contexto: motor científico, dados sensíveis (LGPD), textos do app. |
| `.agents/skills/` | `/revisar-ciencia` (confere se uma mudança respeita a base científica) e `/implementar-fase` (executa uma fase com plano, testes e walkthrough). |
| `docs/01-PRD.md` | Produto: proposta, personas, fluxo, 16 telas, critérios de aceite. |
| `docs/02-BASE-CIENTIFICA.md` | Todas as fórmulas, limites e fontes (ISSN, ACSM 2026, OMS, Helms, Iraki, Morton, Hall, IOC…), mais a lista de premissas a validar. |
| `docs/03-ARQUITETURA.md` | Flutter + Firebase + Gemini; modelo de dados, regras de segurança, functions, pipeline da foto com prompt e JSON Schema. |
| `docs/04-SEGURANCA-E-LEGAL.md` | Triagem, LGPD, leis do nutricionista e do educador físico, App Store/Google Play, textos permitidos. |
| `docs/05-PROMPTS-ANTIGRAVITY.md` | Roteiro em 10 fases com prompts prontos para colar. |
| `engine/` | Motor de cálculo em TypeScript: composição corporal, gasto energético, viabilidade da meta, dieta, treino, check-in semanal e triagem. 34 testes, incluindo uma varredura de 2.000 perfis aleatórios. |

## Como começar no Antigravity

1. Crie uma pasta para o projeto e copie **todo** o conteúdo deste kit para a raiz dela (incluindo a pasta oculta `.agents`).
2. Abra a pasta no Antigravity. No painel do agente, menu **…** → **Customizations**: confira se aparecem as 3 regras e os 2 skills.
3. No terminal: `cd engine && npm install && npm test` — os 34 testes devem passar (Node 22.18 ou mais novo).
4. Abra `docs/05-PROMPTS-ANTIGRAVITY.md`, copie o prompt da **Fase 0** e cole no painel do agente. Leia o plano antes de aprovar.
5. Siga uma fase por vez. Ao final de cada uma, confira os critérios de aceite e faça commit.

Dica: deixe o agente pedir sua revisão antes de rodar comandos no terminal até você ganhar confiança no fluxo.

## Três decisões já tomadas (e por quê)

1. **Só fotos + dados do usuário.** O % de gordura combina a estimativa da IA nas 3 fotos com a equação de Deurenberg (calculada a partir de sexo, idade, altura e peso). A fita métrica é opcional e só melhora a precisão. Não há balança de bioimpedância. O resultado é sempre uma faixa, e o app nunca diz que mede bioimpedância (App Store, diretriz 1.4.1).
2. **A IA não faz contas.** Calorias, macros, prazos e treino saem do motor determinístico, com fonte para cada número. A IA só olha as fotos e (na v2) escolhe alimentos.
3. **Metas viram ritmo semanal.** "Quero 15 % de gordura em 8 semanas" é convertido em % do peso por semana e comparado com os limites seguros; se não cabe, o app mostra o prazo mínimo e o recomendado.

## O que fazer fora do código (antes de publicar)

- Escolher o modelo de operação (A, B ou C) em `docs/04-SEGURANCA-E-LEGAL.md` — no Brasil, prescrição de dieta é atividade privativa de nutricionista.
- Conseguir um nutricionista (CRN) e um profissional de educação física (CREF) para revisar o doc 02 e as premissas marcadas.
- Advogado para política de privacidade, termos, RIPD e enquadramento regulatório.
- Busca de marca no INPI para "BodyBalanceAI" antes de investir no nome (ver `docs/04-SEGURANCA-E-LEGAL.md`, seção 5).

## Comandos do motor

```
cd engine
npm install
npm test                         # 34 testes
node examples/gerar-exemplo.ts   # regenera examples/exemplo-plano.json
```
