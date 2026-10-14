# Arquitetura técnica

## 1. Visão geral

```
┌──────────────────────── App Flutter (iOS/Android) ────────────────────────┐
│ Onboarding · Consentimento · Triagem · Câmera guiada (ML Kit Pose)        │
│ Avaliação · Meta · Plano · Registro de treino/peso · Check-in · Progresso │
└───────────────┬───────────────────────────────────────────┬───────────────┘
                │ Firebase Auth + App Check                 │ Firestore (cache offline)
                ▼                                           ▼
┌──────────── Cloud Functions (Node 22, TypeScript) ────────────┐   ┌──────────────┐
│ analyzePhotos  → Gemini (visão, saída JSON validada)          │   │  Firestore   │
│ createPlan     → engine.generatePlan()                        │──▶│  (por usuário)│
│ weeklyCheckin  → engine.weeklyCheckin()                       │   └──────────────┘
│ exportMyData / deleteMyData (LGPD)                            │   ┌──────────────┐
└───────────────────────────────────────────────────────────────┘──▶│ Cloud Storage│
                         ▲                                          │ (fotos)      │
                 engine/ (motor puro, testado)                      └──────────────┘
```

Princípio central: **o app e a IA nunca calculam números de saúde**. O motor (`engine/`) é a única fonte de números; a IA de foto só devolve uma faixa de % de gordura e uma checagem de qualidade, que o motor combina com a equação de Deurenberg (calculada dos dados do perfil) e, se houver, com a fita métrica.

As mensagens que o motor devolve (`messages`, `flags[].message`) já vêm em português do Brasil, com números formatados em pt-BR. Cada aviso também tem um `code` estável (ex.: `CALORIE_FLOOR`) — use o código se um dia o app for traduzido.

## 2. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| App | Flutter + Riverpod + go_router | iOS e Android com uma base; bom suporte no Antigravity |
| Câmera e pose | `camera` + Google ML Kit Pose Detection (no aparelho) | checa enquadramento e pose antes de enviar a foto |
| Gráficos | `fl_chart` | tendência de peso, medidas, cargas |
| Backend | Firebase: Auth, Firestore, Storage, Cloud Functions 2ª geração, App Check | gerenciado, regras de segurança por usuário |
| Região | `southamerica-east1` (São Paulo) quando o serviço estiver disponível | latência; se algum serviço (ex.: o modelo de IA) rodar fora do Brasil, declarar a transferência internacional na política de privacidade (LGPD art. 33) |
| IA de foto | Gemini via API, chamada **só pelo servidor** | chave nunca vai para o app; saída estruturada (JSON Schema) |
| Motor | `engine/` em TypeScript puro | testável, versionado, igual em qualquer lugar |
| Validação | `zod` nas functions | toda entrada do app e toda saída da IA é validada |

**Modelo do Gemini:** configure por variável de ambiente `GEMINI_VISION_MODEL`. Em outubro de 2026 a página oficial de modelos lista `gemini-3.8-flash` como Flash estável mais recente; confira https://ai.google.dev/gemini-api/docs/models antes de fixar. A documentação do Google indica a *Interactions API* como interface padrão desde junho de 2026 — peça ao agente para seguir a doc atual do SDK `@google/genai`.

## 3. Estrutura de pastas (workspace)

```
/
├── AGENTS.md                  ← regras sempre ativas para o agente do Antigravity
├── .agents/
│   ├── rules/                 ← regras por contexto (ciência, dados sensíveis, textos)
│   └── skills/                ← procedimentos reutilizáveis (/revisar-ciencia, /implementar-fase)
├── docs/                      ← PRD, base científica, arquitetura, legal, prompts
├── engine/                    ← motor puro + testes (já pronto neste kit)
├── functions/                 ← Cloud Functions (a criar na Fase 1)
├── app/                       ← Flutter (a criar na Fase 2)
├── firestore.rules
├── storage.rules
└── firebase.json
```

**Atenção ao deploy das functions:** o Firebase só envia a pasta `functions/`. Não use dependência `file:../engine`. Use um passo de `predeploy` que compila o motor e copia o resultado para dentro de `functions/` (ou um workspace npm com bundling). Os testes do motor devem continuar rodando a partir de `engine/`.

## 4. Modelo de dados (Firestore)

Tudo fica sob `users/{uid}`. Nada de saúde em coleções globais.

| Caminho | Conteúdo | Quem escreve |
|---|---|---|
| `users/{uid}` | perfil: sexo, data de nascimento, altura, nível de atividade, experiência, dias/minutos de treino, equipamento, refeições/dia; `consents` (versão do termo + data por finalidade) | app |
| `users/{uid}/screenings/{id}` | respostas da triagem + resultado | app (respostas) / function (resultado) |
| `users/{uid}/measurements/{id}` | data, peso; pescoço, cintura e quadril se o usuário medir (opcional) | app |
| `users/{uid}/photoSets/{id}` | caminhos das 3 fotos, data, `analysis` (faixa, qualidade, modelo, versão do prompt) | app cria; function grava `analysis` |
| `users/{uid}/goals/{id}` | tipo, métrica, valor, prazo, `assessment` | app cria; function grava `assessment` |
| `users/{uid}/plans/{id}` | `FullPlan` completo + `engineVersion` + `active` | **só function** |
| `users/{uid}/weighIns/{yyyy-mm-dd}` | peso do dia | app |
| `users/{uid}/foodDays/{yyyy-mm-dd}` | kcal aproximada ou "segui / não segui" | app |
| `users/{uid}/workoutLogs/{id}` | sessão, exercícios, séries (carga, reps, RIR) | app |
| `users/{uid}/checkins/{id}` | `CheckinResult` | **só function** |

Fotos no Storage: `users/{uid}/photos/{photoSetId}/{front|side|back}.jpg`.

## 5. Regras de segurança (esboço)

Firestore — atenção: em regras do Firestore, **qualquer** regra que permita o acesso vence. Por isso não use curinga recursivo de escrita; liste as coleções.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isOwner(uid) { return request.auth != null && request.auth.uid == uid; }

    match /users/{uid} {
      allow read, create, update: if isOwner(uid);
      allow delete: if false; // apagar conta só pela function deleteMyData

      match /measurements/{id}  { allow read, write: if isOwner(uid); }
      match /weighIns/{id}      { allow read, write: if isOwner(uid); }
      match /foodDays/{id}      { allow read, write: if isOwner(uid); }
      match /workoutLogs/{id}   { allow read, write: if isOwner(uid); }
      match /screenings/{id}    { allow read, create: if isOwner(uid); allow update, delete: if false; }
      match /photoSets/{id}     { allow read, create: if isOwner(uid);
                                  allow update: if isOwner(uid) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['analysis']); }
      match /goals/{id}         { allow read, create: if isOwner(uid);
                                  allow update: if isOwner(uid) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['assessment']); }
      match /plans/{id}         { allow read: if isOwner(uid); allow write: if false; }
      match /checkins/{id}      { allow read: if isOwner(uid); allow write: if false; }
    }
  }
}
```

Storage:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/photos/{setId}/{file} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid
                    && request.resource.size < 8 * 1024 * 1024
                    && request.resource.contentType == 'image/jpeg';
      allow update, delete: if false; // apagar só pela function
    }
  }
}
```

Teste as regras com o Emulator Suite antes de publicar (a Fase 7 do `05-PROMPTS-ANTIGRAVITY.md` pede isso).

## 6. Cloud Functions

| Function | Tipo | Faz |
|---|---|---|
| `analyzePhotos` | callable | confere dono e consentimento de fotos → baixa as 3 fotos → chama o Gemini com saída estruturada → valida com zod → aplica guardas (abaixo) → grava `analysis` |
| `assessGoal` | callable | roda `assessGoal` do motor para mostrar a viabilidade **antes** de salvar a meta |
| `createPlan` | callable | lê perfil, triagem, medidas mais recentes, análises de foto e meta ativa → `generatePlan()` → grava `plans/{id}` e desativa o anterior |
| `weeklyCheckin` | callable | lê pesagens dos últimos 21 dias + adesão + sintomas → `weeklyCheckin()` → grava o resultado e, se houver ajuste, nova versão do plano |
| `exportMyData` | callable | gera JSON + fotos num arquivo temporário com URL assinada que expira |
| `deleteMyData` | callable | apaga subcoleções, pasta de fotos no Storage e o usuário do Auth |

Todas: App Check obrigatório, `zod` na entrada, logs sem dados de saúde, limite de chamadas por usuário (ex.: 10 análises de foto/dia).

## 7. Pipeline da foto

### 7.1 Protocolo de captura (mostrado no app)

- Roupa de treino justa (top/shorts); **sem nudez** — o app recusa.
- Manhã, em jejum, depois de ir ao banheiro; mesma luz e mesmo lugar sempre.
- Celular na altura do quadril, a ~2–3 m, corpo inteiro no quadro; braços levemente afastados.
- Três poses: frente, lado direito, costas. Contagem regressiva de 10 s.

### 7.2 Checagem no aparelho (antes de enviar)

ML Kit Pose Detection: exige pontos de cabeça a tornozelos visíveis, uma única pessoa e orientação compatível com a pose pedida. Checagem simples de brilho do quadro. Foto reprovada → instrução específica ("afaste o celular", "acenda a luz").

### 7.3 Chamada ao Gemini (servidor)

Instrução de sistema (versão `photo-v1`):

> Você avalia visualmente a composição corporal de um ADULTO a partir de 3 fotos (frente, lado, costas) em roupa de treino. Faça apenas duas coisas: (1) avaliar se as fotos servem para a estimativa; (2) estimar uma FAIXA de percentual de gordura corporal. Regras: não comente aparência, beleza ou atratividade; não faça diagnóstico nem recomendação; se a pessoa parecer menor de idade, se houver nudez, mais de uma pessoa, corpo cortado, roupa larga, imagem borrada ou pouca luz, marque `quality.ok = false` e liste os motivos. A faixa deve refletir a incerteza real de uma estimativa visual (largura mínima de 6 pontos percentuais). Sexo, idade, altura e peso informados são apenas contexto. Responda somente no formato JSON pedido.

Esquema de saída (JSON Schema enviado como `responseSchema`):

```json
{
  "type": "object",
  "properties": {
    "quality": {
      "type": "object",
      "properties": {
        "ok": { "type": "boolean" },
        "issues": {
          "type": "array",
          "items": { "type": "string", "enum": ["low_light", "blurry", "body_cropped", "wrong_pose", "loose_clothing", "multiple_people", "possible_minor", "nudity"] }
        }
      },
      "required": ["ok", "issues"]
    },
    "bodyFatPct": {
      "type": "object",
      "properties": { "low": { "type": "number" }, "high": { "type": "number" } },
      "required": ["low", "high"]
    },
    "confidence": { "type": "string", "enum": ["low", "medium", "high"] }
  },
  "required": ["quality", "confidence"]
}
```

### 7.4 Guardas no servidor (depois da resposta)

1. Validar com zod; resposta inválida → tentar 1 vez; falhou de novo → erro amigável.
2. `possible_minor` → não grava estimativa, pede confirmação de idade e registra o evento.
3. `nudity` → apaga as fotos imediatamente e pede novas.
4. Faixa com largura < 6 → alarga simetricamente para 6; limitar entre 3 % e 60 %.
5. Gravar `model`, `promptVersion` e data junto da análise (auditoria e recalibração futura).
6. O valor entra no motor como `{ method: "photo_ai", percent: (low+high)/2, low, high }`.

## 8. Cardápio (v2 — depende do modelo legal do doc 04)

1. Base de alimentos: tabela brasileira de composição (TACO/UNICAMP ou TBCA/USP) importada para uma coleção somente leitura, com ID por alimento.
2. A IA recebe metas do motor + preferências/restrições e devolve **só IDs de alimentos e estrutura das refeições**.
3. Uma função determinística calcula as gramas (ajuste por mínimos quadrados para bater proteína, gordura, carboidrato e calorias, com limites de porção realistas).
4. Se um nutricionista estiver no fluxo, ele revisa e aprova antes de o usuário ver.

## 9. Observabilidade

- Crashlytics no app; Cloud Logging nas functions — **sem** peso, % de gordura, fotos ou respostas de triagem nos logs.
- Métricas de produto agregadas (contagens), nunca valores de saúde individuais.
- Alerta se `analyzePhotos` tiver taxa de erro > 5 % ou se `possible_minor`/`nudity` disparar acima do normal.
