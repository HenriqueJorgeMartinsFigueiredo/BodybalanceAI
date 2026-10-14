# Desenvolvimento — comandos rápidos

## Pré-requisitos

| Ferramenta | Versão | Instalação (Windows) |
|---|---|---|
| Node.js | ≥ 22.18 | https://nodejs.org |
| JDK | 21 (exigido pelos emuladores do Firestore/Storage) | `winget install EclipseAdoptium.Temurin.21.JDK` |
| Firebase CLI | atual | `npm i -g firebase-tools` |

Confira: `node --version`, `java -version`, `firebase --version`.

> **Java 8 no PATH do sistema:** se `java -version` mostrar 1.8, o PATH do sistema (que vem antes do PATH do usuário) tem o Java da Oracle (`...\Oracle\Java\java8path`). Remova essa entrada do PATH do sistema (precisa de admin) ou, no terminal atual:
>
> ```powershell
> $env:JAVA_HOME = "$env:USERPROFILE\.jdks\jdk-21.0.12.1+1"
> $env:Path = "$env:JAVA_HOME\bin;$env:Path"
> ```

## Motor (`engine/`)

```bash
cd engine
npm install
npm test          # todos os testes precisam passar
npm run typecheck # checagem de tipos
```

Mudou algum número em `engine/src/config.ts`? Atualize `docs/02-BASE-CIENTIFICA.md` no mesmo commit e rode `npm test`.

## Emuladores do Firebase

O projeto padrão é `demo-bodybalanceai` (`.firebaserc`). O prefixo `demo-` faz os emuladores rodarem **sem login e sem projeto real** — nada vai para a nuvem.

```bash
# na raiz do repositório
firebase emulators:start
```

| Serviço | Endereço |
|---|---|
| Emulator UI | http://127.0.0.1:4000 |
| Auth | 127.0.0.1:9099 |
| Firestore | 127.0.0.1:8080 |
| Storage | 127.0.0.1:9199 |
| Functions | 127.0.0.1:5001 (a partir da Fase 1) |

Pare com `Ctrl+C`.

O emulador de Functions entra na Fase 1: adicionar o bloco `functions` de topo (`"source": "functions"`) e `emulators.functions` (porta 5001) no `firebase.json`. Antes disso, configurá-lo sem a pasta `functions/` faz o CLI abortar.

Guardar e reaproveitar dados de teste (a pasta é ignorada pelo git):

```bash
firebase emulators:start --import=./emulator-data --export-on-exit
```

> Use apenas dados fictícios no emulador. Nunca importe dados reais de usuários.

## Regras de segurança

`firestore.rules` e `storage.rules` negam tudo até a Fase 8, quando entram as regras reais e os testes de regras no emulador.

## Segredos

- Nunca commite chaves, `.env`, contas de serviço ou keystores (o `.gitignore` já cobre os casos comuns).
- A chave da IA (Gemini) fica no Secret Manager: `firebase functions:secrets:set GEMINI_API_KEY` (Fase 4). Para o emulador, use `functions/.secret.local` (ignorado pelo git).
- Nunca cole chaves no chat do agente.

## Próximas fases

- Functions: `cd functions && npm test` (Fase 1).
- App: `cd app && flutter analyze && flutter test` (Fase 2).
