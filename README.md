# BodyBalanceAI

App mobile (em desenvolvimento) que estima a composição corporal por fotos e monta um plano de dieta e treino com **metas numéricas, prazo realista e a fonte científica de cada número**.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-motor-3178C6?logo=typescript&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-app-02569B?logo=flutter&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-backend-FFCA28?logo=firebase&logoColor=black)
![Testes](https://img.shields.io/badge/testes-34%20passando-brightgreen)

## O problema

Apps de dieta e treino costumam prometer resultados sem dizer de onde vêm os números, e aceitam metas que não cabem no prazo.

## A solução

O usuário informa sexo, idade, altura e peso, tira 3 fotos (frente, lado, costas) e define uma meta com prazo. O app responde:

1. **Composição corporal** sempre como faixa (ex.: 21–27% de gordura), combinando IA nas fotos com a equação de Deurenberg
2. **"Essa meta cabe nesse prazo?"** Se não couber, mostra o prazo mínimo seguro e o recomendado
3. **Dieta:** calorias e macros por dia
4. **Treino:** força + aeróbio dentro dos dias e minutos disponíveis
5. **Check-in semanal** que ajusta o plano com os dados reais

Cada número tem um botão **"de onde vem isso?"** com a diretriz ou estudo usado.

## Decisões de arquitetura

- **A IA não faz contas.** Calorias, macros, prazos e treino saem de um motor determinístico e testado. A IA só analisa as fotos.
- **Chave da IA só no servidor.** O app nunca chama o Gemini direto; passa por Cloud Functions com validação.
- **Privacidade (LGPD) desde o início.** Consentimento separado para dados de saúde e fotos; regras do Firestore negam tudo por padrão.
- **Triagem de segurança.** Menores de 18, gestantes e pessoas com histórico de transtorno alimentar são encaminhados a um profissional.

## Stack

| Camada | Tecnologia |
|---|---|
| App | Flutter, Riverpod, go_router |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions) |
| IA de foto | Gemini via API, chamado só pelo servidor |
| Motor de cálculo | TypeScript puro, sem dependências em runtime |
| Testes | `node:test`, incluindo varredura com 2.000 perfis aleatórios |

## Status

| Parte | Situação |
|---|---|
| Motor de cálculo (`engine/`) | ✅ Pronto, 34 testes passando |
| Regras do Firebase e emuladores | ✅ Configurados |
| Documentação de produto, ciência e arquitetura | ✅ Pronta |
| App Flutter | 🚧 Próxima fase |
| Cloud Functions e pipeline da foto | 🚧 Próxima fase |

## Rodando o motor

Requisito: Node.js 22.18 ou mais novo.

```bash
git clone https://github.com/HenriqueJorgeMartinsFigueiredo/BodybalanceAI.git
cd BodybalanceAI/engine
npm install
npm test                         # roda os 34 testes
node examples/gerar-exemplo.ts   # gera examples/exemplo-plano.json
```

Exemplo de saída (homem, 30 anos, 90 kg, meta de 16% de gordura em 20 semanas):

```json
{
  "body":   { "bodyFatPct": 24.1, "bodyFatRange": [20.9, 27.2], "bmi": 27.8 },
  "energy": { "bmrKcal": 1880, "tdeeKcal": 2914 },
  "goal":   { "status": "ok", "targetWeightKg": 81.3, "minWeeks": 14 },
  "nutrition": { "kcal": { "value": 2410, "sources": ["MIFFLIN_1990", "HALL_2011", "..."] } }
}
```

O arquivo completo está em [`engine/examples/exemplo-plano.json`](engine/examples/exemplo-plano.json).

## Estrutura

```
engine/      motor de cálculo em TypeScript + testes
docs/        PRD, base científica, arquitetura, segurança/LGPD e guia de desenvolvimento
.agents/     regras e skills para desenvolvimento assistido por IA
firebase.json, firestore.rules, storage.rules   configuração do backend
```

| Documento | Conteúdo |
|---|---|
| [01-PRD](docs/01-PRD.md) | Proposta, personas, fluxo e 16 telas |
| [02-BASE-CIENTIFICA](docs/02-BASE-CIENTIFICA.md) | Fórmulas, limites e fontes |
| [03-ARQUITETURA](docs/03-ARQUITETURA.md) | Stack, modelo de dados e pipeline da foto |
| [04-SEGURANCA-E-LEGAL](docs/04-SEGURANCA-E-LEGAL.md) | Triagem, LGPD e regras das lojas |
| [DEV](docs/DEV.md) | Comandos de teste e emuladores |
| [00-GUIA-ANTIGRAVITY](docs/00-GUIA-ANTIGRAVITY.md) | Como continuar o desenvolvimento com o agente |

## Aviso

Projeto educacional. O app não substitui médico, nutricionista ou profissional de educação física, e as estimativas por foto têm margem de erro.

---

Feito por [Henrique Jorge](https://github.com/HenriqueJorgeMartinsFigueiredo).
