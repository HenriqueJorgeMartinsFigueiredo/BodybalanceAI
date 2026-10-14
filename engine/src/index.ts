/**
 * Ponto de entrada do motor: recebe perfil, medidas, estimativas de gordura,
 * meta e triagem, e devolve o plano completo com as fontes de cada número.
 *
 * Funções puras, sem I/O: rodam igual em Cloud Functions, num teste ou no app.
 */
import { aceCategory, bmi, combineBodyFat, composition, deurenbergBodyFatPct, navyBodyFatPct, waistToHeight } from "./bodyComposition.ts";
import { estimatedTdee, mifflinStJeor } from "./energy.ts";
import { assessGoal, type GoalAssessment } from "./goals.ts";
import { buildNutritionPlan, type NutritionPlan } from "./nutrition.ts";
import { describeSources, type Source, type SourceId } from "./references.ts";
import { screen, type ScreeningResult } from "./safety.ts";
import { buildTrainingPlan, type TrainingPlan } from "./training.ts";
import type { BodyFatEstimate, Flag, Goal, Measurements, Profile, ScreeningAnswers } from "./types.ts";

export * from "./bodyComposition.ts";
export * from "./checkin.ts";
export * from "./energy.ts";
export * from "./goals.ts";
export * from "./nutrition.ts";
export * from "./references.ts";
export * from "./safety.ts";
export * from "./training.ts";
export * from "./types.ts";
export { CONFIG } from "./config.ts";

export const ENGINE_VERSION = "1.0.0";

export const DISCLAIMER_PT =
  "Este plano é uma orientação educativa baseada em diretrizes científicas e não substitui consulta com médico, nutricionista ou profissional de educação física. Estimativas de gordura por foto e por fita métrica têm margem de erro.";

export interface PlanInput {
  profile: Profile;
  /** Fita métrica — opcional. */
  measurements?: Measurements;
  /** Estimativas da IA de foto (normalmente uma por conjunto de 3 fotos). Pode ser vazio. */
  bodyFatEstimates: BodyFatEstimate[];
  goal: Goal;
  screening: ScreeningAnswers;
  today?: string; // ISO; injetável para testes
}

export interface FullPlan {
  engineVersion: string;
  createdAt: string;
  screening: ScreeningResult;
  /** Ausente quando a triagem bloqueia o uso (ex.: menor de idade). */
  body?: {
    bodyFatPct: number;
    bodyFatRange: [number, number];
    methodsUsed: string[];
    fatMassKg: number;
    fatFreeMassKg: number;
    bmi: number;
    aceCategory: string;
    waistToHeight?: { ratio: number; class: string };
  };
  energy?: { bmrKcal: number; tdeeKcal: number };
  goal?: GoalAssessment;
  nutrition: NutritionPlan | null;
  training: TrainingPlan | null;
  flags: Flag[];
  sources: Source[];
  disclaimer: string;
}

export function generatePlan(input: PlanInput): FullPlan {
  const { profile, measurements, goal } = input;
  const usedSources: SourceId[] = [];
  const flags: Flag[] = [];

  const now = input.today ?? new Date().toISOString();

  // 1) Triagem — se bloquear o uso, não processa mais nada (nem as fotos).
  const screening = screen(profile, input.screening, goal.type);
  flags.push(...screening.flags);
  if (screening.status === "blocked") {
    return {
      engineVersion: ENGINE_VERSION,
      createdAt: now,
      screening,
      disclaimer: DISCLAIMER_PT,
      nutrition: null,
      training: null,
      flags,
      sources: describeSources([...new Set(flags.flatMap((f) => f.sources))]),
    };
  }

  // 2) Composição corporal: foto (IA) + equação pelo IMC (sempre) + fita (se houver)
  const estimates = [...input.bodyFatEstimates];
  const eq = deurenbergBodyFatPct(profile.sex, profile.weightKg, profile.heightCm, profile.ageYears);
  estimates.push({ method: "bmi_equation", percent: eq.value, measuredAt: now });
  if (measurements?.neckCm && measurements.waistCm && (profile.sex === "male" || measurements.hipCm)) {
    const navy = navyBodyFatPct(profile.sex, profile.heightCm, measurements.neckCm, measurements.waistCm, measurements.hipCm);
    estimates.push({ method: "navy_tape", percent: navy.value, measuredAt: now });
  }
  const bf = combineBodyFat(estimates);
  flags.push(...bf.flags);
  usedSources.push(...bf.sources);
  const comp = composition(profile.weightKg, bf.percent);
  const whtr = measurements?.waistCm ? waistToHeight(measurements.waistCm, profile.heightCm) : undefined;
  if (whtr) usedSources.push(...whtr.sources);

  const body: NonNullable<FullPlan["body"]> = {
    bodyFatPct: bf.percent,
    bodyFatRange: [bf.low, bf.high],
    methodsUsed: bf.methodsUsed,
    fatMassKg: comp.fatMassKg,
    fatFreeMassKg: comp.fatFreeMassKg,
    bmi: bmi(profile.weightKg, profile.heightCm),
    aceCategory: aceCategory(profile.sex, bf.percent),
    waistToHeight: whtr?.value,
  };
  usedSources.push("ACE_BODY_FAT", "WHO_BMI");

  const base = {
    engineVersion: ENGINE_VERSION,
    createdAt: now,
    screening,
    body,
    disclaimer: DISCLAIMER_PT,
  };

  // 3) Energia
  const bmr = mifflinStJeor(profile.sex, profile.weightKg, profile.heightCm, profile.ageYears);
  const tdee = estimatedTdee(bmr.value, profile.activityLevel);
  usedSources.push(...bmr.sources, ...tdee.sources);

  // 4) Meta
  const assessment = assessGoal(profile, comp, goal, tdee.value);
  flags.push(...assessment.flags);
  usedSources.push(...assessment.sources);
  const goalBlocked = assessment.status === "unsafe" || assessment.status === "invalid";

  // 5) Dieta e treino
  const nutrition = goalBlocked ? null : buildNutritionPlan(profile, comp, goal.type, assessment, tdee.value, screening);
  if (nutrition) {
    flags.push(...nutrition.flags);
    for (const k of ["kcal", "proteinG", "fatG", "carbsG", "proteinPerMealG", "foodGuidance"] as const) {
      usedSources.push(...nutrition[k].sources);
    }
  }
  const training = screening.allowTraining ? buildTrainingPlan(profile, goal.type) : null;
  if (training) {
    flags.push(...training.flags);
    usedSources.push(...training.sources, ...training.progression.sources, ...training.aerobic.sources);
  }

  return {
    ...base,
    energy: { bmrKcal: bmr.value, tdeeKcal: tdee.value },
    goal: assessment,
    nutrition,
    training,
    flags,
    sources: describeSources(usedSources),
  };
}
