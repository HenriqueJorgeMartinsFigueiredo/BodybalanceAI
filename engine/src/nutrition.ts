/**
 * Metas nutricionais: calorias, proteína, gordura e carboidrato.
 *
 * O resultado são METAS NUMÉRICAS + orientações de escolha de alimentos do
 * Guia Alimentar. A transformação em cardápio (refeições, porções, substituições)
 * deve ser feita/validada por nutricionista — ver docs/04-SEGURANCA-E-LEGAL.md.
 */
import { fmt } from "./format.ts";
import { CONFIG } from "./config.ts";
import type { Composition } from "./bodyComposition.ts";
import type { GoalAssessment } from "./goals.ts";
import type { ScreeningResult } from "./safety.ts";
import type { Flag, GoalType, Profile, Sourced } from "./types.ts";

export interface NutritionPlan {
  kcal: Sourced<number>;
  proteinG: Sourced<number>;
  fatG: Sourced<number>;
  carbsG: Sourced<number>;
  mealsPerDay: number;
  proteinPerMealG: Sourced<number>;
  foodGuidance: Sourced<string[]>;
  flags: Flag[];
}

const FOOD_GUIDANCE: Sourced<string[]> = {
  value: [
    "Monte a base das refeições com alimentos in natura ou minimamente processados (arroz, feijão, ovos, carnes, frutas, legumes, verduras, leite).",
    "Use alimentos processados (queijos, pães, conservas) em pequenas quantidades, como parte de refeições.",
    "Evite ultraprocessados (refrigerantes, biscoitos recheados, salgadinhos, refeições prontas congeladas).",
  ],
  sources: ["GUIA_ALIMENTAR_2014"],
};

export function buildNutritionPlan(
  profile: Profile,
  comp: Composition,
  goalType: GoalType,
  assessment: GoalAssessment,
  tdeeKcal: number,
  screening: ScreeningResult,
): NutritionPlan | null {
  if (!screening.allowNumericDiet) return null;

  const flags: Flag[] = [];
  const mealsPerDay = profile.mealsPerDay ?? 4;
  let direction = assessment.direction;

  if (direction === "lose" && !screening.allowCalorieDeficit) {
    direction = "maintain";
    flags.push({
      code: "DEFICIT_NOT_ALLOWED",
      severity: "warning",
      message: "Pela sua triagem, o plano fica em manutenção calórica (sem déficit).",
      sources: ["PREMISSA_PROJETO"],
    });
  }

  // ---------- Calorias ----------
  let kcal: number;
  const kcalSources: Sourced<number>["sources"] = ["MIFFLIN_1990"];
  if (direction === "lose") {
    const wanted = (assessment.plannedRatePctPerWeek / 100) * profile.weightKg * CONFIG.kcalPerKgTissue.value / 7;
    const cap = Math.min(CONFIG.maxDeficit.value.kcal, CONFIG.maxDeficit.value.fractionOfTdee * tdeeKcal);
    const deficit = Math.min(wanted, cap);
    if (wanted > cap) {
      flags.push({
        code: "DEFICIT_CAPPED",
        severity: "warning",
        message: `O déficit foi limitado a ${fmt(Math.round(cap))} kcal/dia. O ritmo real deve ser um pouco menor que o planejado; o check-in vai mostrar.`,
        sources: CONFIG.maxDeficit.sources,
      });
    }
    kcal = tdeeKcal - deficit;
    kcalSources.push(...CONFIG.kcalPerKgTissue.sources, ...CONFIG.maxDeficit.sources);
    const floor = CONFIG.calorieFloor.value[profile.sex];
    if (kcal < floor) {
      kcal = floor;
      flags.push({
        code: "CALORIE_FLOOR",
        severity: "warning",
        message: `As calorias ficaram no piso de ${fmt(floor)} kcal. Abaixo disso, só com acompanhamento profissional.`,
        sources: CONFIG.calorieFloor.sources,
      });
    }
    kcalSources.push(...CONFIG.calorieFloor.sources);
  } else if (direction === "gain") {
    kcal = tdeeKcal * (1 + CONFIG.surplusFraction.value[profile.experience]);
    kcalSources.push(...CONFIG.surplusFraction.sources);
  } else {
    kcal = tdeeKcal;
  }

  // ---------- Proteína ----------
  let proteinG: number;
  let proteinSources: Sourced<number>["sources"];
  if (direction === "lose") {
    proteinG = CONFIG.proteinDeficitGPerKgFfm.value.default * comp.fatFreeMassKg;
    proteinSources = [...CONFIG.proteinDeficitGPerKgFfm.sources];
  } else if (goalType === "performance_endurance") {
    proteinG = CONFIG.proteinEnduranceGPerKgBw.value * profile.weightKg;
    proteinSources = [...CONFIG.proteinEnduranceGPerKgBw.sources];
  } else {
    proteinG = CONFIG.proteinGPerKgBw.value.default * profile.weightKg;
    proteinSources = [...CONFIG.proteinGPerKgBw.sources];
  }

  // ---------- Carboidrato mínimo para performance de resistência ----------
  let carbMinG = 0;
  if (goalType === "performance_endurance") {
    const load = profile.enduranceTrainingLoad ?? "moderate";
    carbMinG = CONFIG.carbsByTrainingLoad.value[load].min * profile.weightKg;
    if (load === "extreme") {
      flags.push({
        code: "EXTREME_LOAD_PROFESSIONAL",
        severity: "warning",
        message: "Com 4 h ou mais de treino por dia, as necessidades variam muito. Recomendamos acompanhamento com nutricionista esportivo.",
        sources: CONFIG.carbsByTrainingLoad.sources,
      });
    }
    if ((load === "high" || load === "extreme") && (profile.activityLevel === "sedentary" || profile.activityLevel === "light")) {
      flags.push({
        code: "INCONSISTENT_ACTIVITY",
        severity: "warning",
        message: "Você marcou nível de atividade baixo, mas carga de treino alta. Revise o nível de atividade para o gasto ficar correto.",
        sources: ["PREMISSA_PROJETO"],
      });
    }
    const fatShare = CONFIG.fatPctOfKcal.value.default;
    const kcalNeeded = (proteinG * 4 + carbMinG * 4) / (1 - fatShare);
    if (kcalNeeded > kcal) {
      kcal = kcalNeeded;
      flags.push({
        code: "KCAL_RAISED_FOR_CARBS",
        severity: "info",
        message: "As calorias foram ajustadas para cobrir o carboidrato mínimo da sua carga de treino.",
        sources: CONFIG.carbsByTrainingLoad.sources,
      });
    }
    kcalSources.push(...CONFIG.carbsByTrainingLoad.sources);
  }

  kcal = Math.round(kcal / 10) * 10;

  // ---------- Gordura e carboidrato ----------
  let fatG = (kcal * CONFIG.fatPctOfKcal.value.default) / 9;
  let carbsG = (kcal - proteinG * 4 - fatG * 9) / 4;
  if (carbsG < 0) {
    // Proteína alta + calorias baixas: reduz gordura até o mínimo antes de zerar carboidrato.
    fatG = (kcal * CONFIG.fatPctOfKcal.value.min) / 9;
    carbsG = Math.max(0, (kcal - proteinG * 4 - fatG * 9) / 4);
    flags.push({
      code: "LOW_CARB_BY_CONSTRAINT",
      severity: "warning",
      message: "Com essas calorias e essa proteína sobra pouco carboidrato. Revise com um nutricionista.",
      sources: ["PREMISSA_PROJETO"],
    });
  }

  // ---------- Proteína por refeição ----------
  const perMeal = proteinG / mealsPerDay;
  const minPerMeal = CONFIG.proteinPerMealGPerKg.value * profile.weightKg;
  if (perMeal < minPerMeal) {
    flags.push({
      code: "PROTEIN_PER_MEAL_LOW",
      severity: "info",
      message: `Com ${mealsPerDay} refeições, cada uma teria ${Math.round(perMeal)} g de proteína. Tente pelo menos ${Math.round(minPerMeal)} g por refeição.`,
      sources: CONFIG.proteinPerMealGPerKg.sources,
    });
  }

  return {
    kcal: { value: kcal, sources: dedupe(kcalSources) },
    proteinG: { value: Math.round(proteinG), sources: proteinSources },
    fatG: { value: Math.round(fatG), sources: [...CONFIG.fatPctOfKcal.sources] },
    carbsG: {
      value: Math.round(carbsG),
      sources: goalType === "performance_endurance" ? [...CONFIG.carbsByTrainingLoad.sources] : ["PREMISSA_PROJETO"],
      note: goalType === "performance_endurance" ? undefined : "Carboidrato = calorias restantes depois de proteína e gordura.",
    },
    mealsPerDay,
    proteinPerMealG: { value: Math.round(perMeal), sources: CONFIG.proteinPerMealGPerKg.sources },
    foodGuidance: FOOD_GUIDANCE,
    flags,
  };
}

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}
