# Regras do projeto BodyBalanceAI (sempre ativas)

App iOS/Android (Flutter + Firebase) que estima a composição corporal **só com fotos e dados que o usuário informa** (sexo, idade, altura, peso; fita métrica opcional), avalia se uma meta numérica cabe no prazo e gera metas de dieta e um programa de treino. Não há integração com balança de bioimpedância. Detalhes: `docs/01-PRD.md`.

## Idioma

- Converse comigo e escreva todos os textos do app em **português do Brasil**.
- Código, nomes de variáveis e commits em inglês. Comentários podem ser em português.

## Regras invioláveis

1. **Números de saúde só saem do motor (`engine/`).** Calorias, macros, prazos, ritmos, séries, repetições, % de gordura combinado, ajustes de check-in: tudo vem de funções de `engine/src`. O app e as Cloud Functions apenas chamam o motor e exibem o resultado. Um modelo de linguagem nunca calcula esses números.
2. **Constantes numéricas ficam em `engine/src/config.ts`**, cada uma com fonte. Mudar um número exige atualizar `docs/02-BASE-CIENTIFICA.md` na mesma alteração e rodar `cd engine && npm test`.
3. **O app não mede bioimpedância.** Nunca escreva (em UI, loja, marketing) que ele mede. O % de gordura é uma *estimativa em faixa* que combina foto (IA) + equação pelo IMC (+ fita, se o usuário medir).
4. **Respeite a triagem.** Se `screen()` bloquear, a UI não mostra números de dieta (e/ou treino). A UI nunca decide bloqueios por conta própria.
5. **Dados de saúde e fotos são sensíveis (LGPD).** Ficam só em `users/{uid}`; nunca em logs, analytics, mensagens de erro ou URLs públicas. A chave da IA fica no servidor (Secret Manager), nunca no app.
6. **Todo número exibido tem fontes.** Use o componente "De onde vem isso?" com a lista `sources` que o motor devolve.
7. **Não prometa datas** para metas que o motor marca como `tracked_only`.

## Mapa da documentação

| Arquivo | Use quando |
|---|---|
| `docs/01-PRD.md` | dúvidas de produto, telas, critérios de aceite |
| `docs/02-BASE-CIENTIFICA.md` | qualquer número, fórmula ou fonte |
| `docs/03-ARQUITETURA.md` | stack, dados, regras de segurança, functions, pipeline da foto |
| `docs/04-SEGURANCA-E-LEGAL.md` | triagem, LGPD, conselhos profissionais, lojas, textos |
| `docs/05-PROMPTS-ANTIGRAVITY.md` | roteiro de fases |
| `engine/examples/exemplo-plano.json` | formato de saída do motor |

## Forma de trabalhar

- Uma fase do roteiro por vez. Gere um plano de implementação antes de escrever código e espere aprovação.
- Antes de dizer que terminou: rode os testes de tudo que tocou (`engine`: `npm test`; `functions`: testes no emulador; `app`: `flutter analyze` e `flutter test`) e informe o resultado.
- Não adicione dependências fora das previstas em `docs/03-ARQUITETURA.md` sem perguntar.
- Nunca peça nem cole chaves de API no chat; use variáveis de ambiente/Secret Manager.
- Commits pequenos, um assunto por commit.
