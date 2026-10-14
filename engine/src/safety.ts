/**
 * Triagem antes de gerar qualquer plano.
 * O app NÃO gera números de dieta/treino quando a triagem pede um profissional.
 */
import { CONFIG } from "./config.ts";
import type { Flag, GoalType, Profile, ScreeningAnswers } from "./types.ts";
import { bmi } from "./bodyComposition.ts";

export type ScreeningStatus = "ok" | "needs_professional" | "blocked";

export interface ScreeningResult {
  status: ScreeningStatus;
  allowCalorieDeficit: boolean;
  allowNumericDiet: boolean;
  allowTraining: boolean;
  flags: Flag[];
}

export function screen(profile: Profile, answers: ScreeningAnswers, goalType: GoalType): ScreeningResult {
  const flags: Flag[] = [];
  let allowCalorieDeficit = true;
  let allowNumericDiet = true;
  let allowTraining = true;

  if (profile.ageYears < CONFIG.minAdultAge.value) {
    flags.push({
      code: "MINOR",
      severity: "block",
      message: "Este app é para maiores de 18 anos. Adolescentes precisam de orientação específica de um profissional.",
      sources: ["WHO_PA_2020", "PREMISSA_PROJETO"],
    });
    return { status: "blocked", allowCalorieDeficit: false, allowNumericDiet: false, allowTraining: false, flags };
  }

  if (answers.pregnantOrLactating) {
    allowCalorieDeficit = false;
    allowNumericDiet = false;
    flags.push({
      code: "PREGNANCY",
      severity: "block",
      message: "Na gestação e amamentação o plano alimentar precisa ser feito com nutricionista e acompanhamento médico.",
      sources: ["WHO_PA_2020"],
    });
  }

  if (answers.eatingDisorderHistory) {
    allowCalorieDeficit = false;
    allowNumericDiet = false;
    flags.push({
      code: "EATING_DISORDER_HISTORY",
      severity: "block",
      message:
        "Com histórico de transtorno alimentar, metas de calorias e de peso podem fazer mal. Recomendamos acompanhamento com nutricionista e psicólogo.",
      sources: ["HELMS_2014", "IOC_REDS_2023"],
    });
  }

  if (answers.exerciseWarningSymptoms && !answers.hasProfessionalClearance) {
    allowTraining = false;
    flags.push({
      code: "EXERCISE_SYMPTOMS",
      severity: "block",
      message: "Dor no peito, desmaio ou tontura ao se exercitar exigem avaliação médica antes de começar o treino.",
      sources: ["PREMISSA_PROJETO"],
    });
  }

  if (answers.chronicConditionNeedingClearance && !answers.hasProfessionalClearance) {
    allowCalorieDeficit = false;
    allowNumericDiet = false;
    flags.push({
      code: "NEEDS_CLEARANCE",
      severity: "block",
      message: "Com essa condição de saúde, peça liberação ao seu médico antes de mudar dieta e treino.",
      sources: ["WHO_PA_2020", "PREMISSA_PROJETO"],
    });
  }

  const currentBmi = bmi(profile.weightKg, profile.heightCm);
  if (currentBmi < CONFIG.minTargetBmi.value && (goalType === "fat_loss" || goalType === "recomposition")) {
    allowCalorieDeficit = false;
    flags.push({
      code: "UNDERWEIGHT_FAT_LOSS",
      severity: "block",
      message: "Seu IMC já está abaixo de 18,5. Não vamos montar um plano de emagrecimento.",
      sources: CONFIG.minTargetBmi.sources,
    });
  }

  const status: ScreeningStatus = flags.some((f) => f.severity === "block") ? "needs_professional" : "ok";
  return { status, allowCalorieDeficit, allowNumericDiet, allowTraining, flags };
}
