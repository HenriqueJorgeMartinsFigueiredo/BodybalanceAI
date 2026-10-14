// Gera examples/exemplo-plano.json — mostra o formato de saída do motor
// no fluxo padrão do BodyBalanceAI: só fotos (IA) + dados do perfil, sem fita.
// Uso: node examples/gerar-exemplo.ts
import { writeFileSync } from "node:fs";
import { generatePlan } from "../src/index.ts";

const plan = generatePlan({
  profile: {
    sex: "male", ageYears: 30, heightCm: 180, weightKg: 90, activityLevel: "moderate",
    experience: "intermediate", trainingDaysPerWeek: 4, sessionMinutes: 75, equipment: "gym", mealsPerDay: 4,
  },
  bodyFatEstimates: [{ method: "photo_ai", percent: 24, low: 20, high: 28, measuredAt: "2026-10-13" }],
  goal: { type: "fat_loss", metric: "body_fat_pct", targetValue: 16, deadlineWeeks: 20 },
  screening: {
    pregnantOrLactating: false, eatingDisorderHistory: false, chronicConditionNeedingClearance: false,
    exerciseWarningSymptoms: false, hasProfessionalClearance: false,
  },
  today: "2026-10-13",
});
writeFileSync(new URL("./exemplo-plano.json", import.meta.url), JSON.stringify(plan, null, 2));
console.log("ok");
