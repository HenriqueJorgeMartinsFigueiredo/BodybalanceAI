/**
 * Avaliação de viabilidade da meta: transforma "quero chegar a X em Y semanas"
 * num ritmo semanal e compara com os ritmos seguros da literatura.
 *
 * Saídas possíveis:
 *  - ok:                    cabe no prazo dentro do ritmo recomendado
 *  - aggressive:            cabe no prazo, mas acima do ritmo recomendado (ainda dentro do máximo)
 *  - not_feasible_in_deadline: precisaria passar do ritmo máximo seguro → propomos novo prazo
 *  - unsafe:                a meta em si é insegura (IMC < 18,5, gordura abaixo do limite etc.)
 *  - tracked_only:          meta acompanhada, mas sem projeção numérica (ex.: carga no supino)
 *  - invalid:               a meta já foi atingida ou aponta na direção errada (ex.: "emagrecer" para um peso maior).
 *                           Acontece quando uma nova avaliação muda a estimativa; o app pede para redefinir a meta.
 */
import { fmt } from "./format.ts";
import { CONFIG } from "./config.ts";
import { aceCategory, bmi, type Composition } from "./bodyComposition.ts";
import type { Flag, Goal, Profile } from "./types.ts";
import type { SourceId } from "./references.ts";

export type GoalStatus = "ok" | "aggressive" | "not_feasible_in_deadline" | "unsafe" | "tracked_only" | "invalid";

export interface GoalAssessment {
  status: GoalStatus;
  direction: "lose" | "gain" | "maintain";
  targetWeightKg?: number;
  /** Ritmo necessário para cumprir o prazo pedido (% do peso por semana). */
  requiredRatePctPerWeek?: number;
  /** Ritmo que o plano vai usar. */
  plannedRatePctPerWeek: number;
  /** Prazo mínimo no ritmo máximo seguro. */
  minWeeks?: number;
  /** Prazo no ritmo recomendado. */
  recommendedWeeks?: number;
  messages: string[];
  flags: Flag[];
  sources: SourceId[];
}

/** % do peso por semana recomendado para perda de gordura, interpolado pelo % de gordura atual. */
export function recommendedFatLossRate(profile: Profile, bodyFatPct: number): number {
  const { min, max } = CONFIG.fatLossRatePctPerWeek.value;
  const { lean, high } = CONFIG.fatLossInterpolationBf.value[profile.sex];
  const t = clamp((bodyFatPct - lean) / (high - lean), 0, 1);
  return round2(min + t * (max - min));
}

/** Semanas para ir de `from` a `to` mudando `ratePct` % do peso por semana (composto). */
export function weeksToTarget(fromKg: number, toKg: number, ratePct: number): number {
  if (ratePct <= 0) return Infinity;
  const r = ratePct / 100;
  const factor = toKg < fromKg ? 1 - r : 1 + r;
  return Math.log(toKg / fromKg) / Math.log(factor);
}

/** Ritmo (% por semana) para ir de `from` a `to` em `weeks`. */
export function rateForDeadline(fromKg: number, toKg: number, weeks: number): number {
  const ratio = Math.pow(toKg / fromKg, 1 / weeks);
  return round2(Math.abs(ratio - 1) * 100);
}

/**
 * Maior ritmo de perda (% do peso/semana) que cabe nos limites de energia:
 * déficit ≤ min(1.000 kcal, 25 % do gasto) e calorias ≥ piso.
 * Usa a mesma conversão (kcal/kg) que a dieta usa para montar o déficit inicial.
 */
export function maxLossRateFromEnergy(profile: Profile, tdeeKcal: number): number {
  const floor = CONFIG.calorieFloor.value[profile.sex];
  const maxDeficit = Math.max(
    0,
    Math.min(CONFIG.maxDeficit.value.kcal, CONFIG.maxDeficit.value.fractionOfTdee * tdeeKcal, tdeeKcal - floor),
  );
  const rate = ((maxDeficit * 7) / CONFIG.kcalPerKgTissue.value / profile.weightKg) * 100;
  return Math.floor(rate * 100) / 100;
}

/**
 * @param tdeeKcal gasto estimado. Quando informado, o ritmo máximo também respeita
 *                 o déficit máximo e o piso calórico — assim a meta "ok" é sempre
 *                 alcançável pelo plano de dieta que o motor vai gerar.
 */
export function assessGoal(profile: Profile, comp: Composition, goal: Goal, tdeeKcal?: number): GoalAssessment {
  if (goal.deadlineWeeks <= 0 || !Number.isFinite(goal.deadlineWeeks)) {
    throw new RangeError("O prazo precisa ser um número de semanas maior que zero.");
  }
  switch (goal.type) {
    case "fat_loss":
      return assessFatLoss(profile, comp, goal, tdeeKcal);
    case "muscle_gain":
      return assessMuscleGain(profile, comp, goal);
    default:
      return assessTracked(profile, comp, goal, tdeeKcal);
  }
}

function assessFatLoss(profile: Profile, comp: Composition, goal: Goal, tdeeKcal?: number): GoalAssessment {
  const flags: Flag[] = [];
  const messages: string[] = [];
  const sources: SourceId[] = [...CONFIG.fatLossRatePctPerWeek.sources, ...CONFIG.fatLossInterpolationBf.sources];

  let targetWeightKg: number;
  if (goal.metric === "weight_kg") {
    targetWeightKg = goal.targetValue;
  } else if (goal.metric === "body_fat_pct") {
    const minBf = CONFIG.minTargetBodyFatPct.value[profile.sex];
    if (goal.targetValue < minBf) {
      flags.push({
        code: "TARGET_BF_TOO_LOW",
        severity: "block",
        message: `Uma meta abaixo de ${minBf}% de gordura exige acompanhamento profissional (risco de deficiência energética).`,
        sources: CONFIG.minTargetBodyFatPct.sources,
      });
      return { status: "unsafe", direction: "lose", plannedRatePctPerWeek: 0, messages, flags, sources: [...sources, ...CONFIG.minTargetBodyFatPct.sources] };
    }
    if (goal.targetValue >= comp.bodyFatPct) {
      return invalid("lose", `Sua estimativa atual (${fmt(comp.bodyFatPct, 1)}%) já está no nível da meta de ${fmt(goal.targetValue)}%. Defina uma nova meta.`);
    }
    // Supõe massa magra preservada (treino de força + proteína adequada). É otimista: o check-in corrige.
    targetWeightKg = round1(comp.fatFreeMassKg / (1 - goal.targetValue / 100));
    messages.push(
      `Para chegar a ${fmt(goal.targetValue)}% de gordura mantendo sua massa magra (${fmt(comp.fatFreeMassKg)} kg), o peso-alvo estimado é ${fmt(targetWeightKg)} kg.`,
    );
  } else {
    return assessTracked(profile, comp, goal, tdeeKcal);
  }

  if (targetWeightKg >= profile.weightKg) {
    return invalid("lose", `Para emagrecimento, o peso-alvo (${fmt(targetWeightKg, 1)} kg) precisa ser menor que o atual (${fmt(profile.weightKg, 1)} kg).`);
  }

  const targetBmi = bmi(targetWeightKg, profile.heightCm);
  if (targetBmi < CONFIG.minTargetBmi.value) {
    flags.push({
      code: "TARGET_BMI_TOO_LOW",
      severity: "block",
      message: `O peso-alvo daria IMC ${fmt(targetBmi, 1)}, abaixo de 18,5. Escolha uma meta maior.`,
      sources: CONFIG.minTargetBmi.sources,
    });
    return { status: "unsafe", direction: "lose", targetWeightKg, plannedRatePctPerWeek: 0, messages, flags, sources: [...sources, ...CONFIG.minTargetBmi.sources] };
  }

  const literatureMax = CONFIG.fatLossRatePctPerWeek.value.max;
  let maxRate = literatureMax;
  if (tdeeKcal !== undefined) {
    const energyMax = maxLossRateFromEnergy(profile, tdeeKcal);
    if (energyMax < literatureMax) {
      maxRate = energyMax;
      sources.push(...CONFIG.maxDeficit.sources, ...CONFIG.calorieFloor.sources);
      messages.push(
        `Com seu gasto estimado (${fmt(Math.round(tdeeKcal))} kcal/dia), o déficit seguro permite perder até ${fmt(energyMax)}% do peso por semana.`,
      );
    }
  }
  if (maxRate < 0.1) {
    messages.push(
      "Seu gasto estimado já está perto do piso de calorias, então não há espaço para um déficit seguro só com dieta. Vamos aumentar a atividade física e recalibrar o gasto nos check-ins.",
    );
    return {
      status: "not_feasible_in_deadline",
      direction: "lose",
      targetWeightKg,
      requiredRatePctPerWeek: rateForDeadline(profile.weightKg, targetWeightKg, goal.deadlineWeeks),
      plannedRatePctPerWeek: Math.max(0, maxRate),
      messages,
      flags,
      sources,
    };
  }
  const recommended = Math.min(recommendedFatLossRate(profile, comp.bodyFatPct), maxRate);
  const minWeeks = Math.ceil(weeksToTarget(profile.weightKg, targetWeightKg, maxRate));
  const recommendedWeeks = Math.ceil(weeksToTarget(profile.weightKg, targetWeightKg, recommended));
  const required = rateForDeadline(profile.weightKg, targetWeightKg, goal.deadlineWeeks);

  if (required > maxRate) {
    messages.push(
      `No prazo de ${goal.deadlineWeeks} semanas você precisaria perder ${fmt(required)}% do peso por semana; o máximo seguro para você é ${fmt(maxRate)}%.`,
      `Prazo mínimo seguro: ${minWeeks} semanas. Prazo recomendado: ${recommendedWeeks} semanas.`,
    );
    return {
      status: "not_feasible_in_deadline",
      direction: "lose",
      targetWeightKg,
      requiredRatePctPerWeek: required,
      plannedRatePctPerWeek: recommended,
      minWeeks,
      recommendedWeeks,
      messages,
      flags,
      sources,
    };
  }

  const status: GoalStatus = required > recommended ? "aggressive" : "ok";
  if (required < CONFIG.fatLossRatePctPerWeek.value.min) {
    messages.push(
      `Seu prazo é folgado: o plano usa ${fmt(required)}% do peso por semana. Se quiser chegar antes, dá para fazer em ${recommendedWeeks} semanas no ritmo recomendado.`,
    );
  }
  if (status === "aggressive") {
    messages.push(
      `Cabe no prazo, mas exige ${fmt(required)}%/semana — acima do recomendado para você (${fmt(recommended)}%). Há mais risco de perder massa magra.`,
    );
  }
  return {
    status,
    direction: "lose",
    targetWeightKg,
    requiredRatePctPerWeek: required,
    plannedRatePctPerWeek: required,
    minWeeks,
    recommendedWeeks,
    messages,
    flags,
    sources,
  };
}

function assessMuscleGain(profile: Profile, comp: Composition, goal: Goal): GoalAssessment {
  const flags: Flag[] = [];
  const messages: string[] = [];
  const band = CONFIG.gainRatePctPerWeek.value[profile.experience];
  const sources: SourceId[] = [...CONFIG.gainRatePctPerWeek.sources];

  let targetWeightKg: number;
  if (goal.metric === "weight_kg") {
    targetWeightKg = goal.targetValue;
  } else if (goal.metric === "lean_mass_kg") {
    const leanGain = goal.targetValue - comp.fatFreeMassKg;
    if (leanGain <= 0) {
      return invalid("gain", `Sua massa magra estimada (${fmt(comp.fatFreeMassKg, 1)} kg) já alcança a meta de ${fmt(goal.targetValue, 1)} kg. Defina uma nova meta.`);
    }
    const frac = CONFIG.leanFractionOfGain.value;
    targetWeightKg = round1(profile.weightKg + leanGain / frac);
    sources.push(...CONFIG.leanFractionOfGain.sources);
    messages.push(
      `Para ganhar ${fmt(round1(leanGain), 1)} kg de massa magra, estimamos ganhar ~${fmt(round1(leanGain / frac), 1)} kg de peso total (premissa: ${fmt(frac * 100)}% do ganho vira massa magra; ajustamos com suas medições).`,
    );
  } else {
    return assessTracked(profile, comp, goal);
  }
  if (targetWeightKg <= profile.weightKg) {
    return invalid("gain", `Para ganho de massa, o peso-alvo (${fmt(targetWeightKg, 1)} kg) precisa ser maior que o atual (${fmt(profile.weightKg, 1)} kg).`);
  }

  if (aceCategory(profile.sex, comp.bodyFatPct) === "obese") {
    flags.push({
      code: "GAIN_WITH_HIGH_BF",
      severity: "warning",
      message: "Com o % de gordura atual, recomendamos começar por recomposição (manutenção calórica + treino de força) antes de um superávit.",
      sources: ["ACE_BODY_FAT", "PREMISSA_PROJETO"],
    });
  }

  const minWeeks = Math.ceil(weeksToTarget(profile.weightKg, targetWeightKg, band.max));
  const recommendedRate = round2((band.min + band.max) / 2);
  const recommendedWeeks = Math.ceil(weeksToTarget(profile.weightKg, targetWeightKg, recommendedRate));
  const required = rateForDeadline(profile.weightKg, targetWeightKg, goal.deadlineWeeks);

  if (required > band.max) {
    messages.push(
      `No prazo pedido seria preciso ganhar ${fmt(required)}% do peso por semana; acima de ${fmt(band.max)}% o ganho extra tende a ser gordura.`,
      `Prazo mínimo: ${minWeeks} semanas. Recomendado: ${recommendedWeeks} semanas.`,
    );
    return {
      status: "not_feasible_in_deadline",
      direction: "gain",
      targetWeightKg,
      requiredRatePctPerWeek: required,
      plannedRatePctPerWeek: recommendedRate,
      minWeeks,
      recommendedWeeks,
      messages,
      flags,
      sources,
    };
  }
  const planned = Math.max(required, band.min);
  return {
    status: "ok",
    direction: "gain",
    targetWeightKg,
    requiredRatePctPerWeek: required,
    plannedRatePctPerWeek: round2(planned),
    minWeeks,
    recommendedWeeks,
    messages,
    flags,
    sources,
  };
}

/** Metas sem projeção numérica confiável: acompanhamos a métrica e geramos o plano pelo tipo de objetivo. */
function assessTracked(profile: Profile, _comp: Composition, goal: Goal, tdeeKcal?: number): GoalAssessment {
  const messages = [
    "Vamos acompanhar essa métrica a cada check-in. Não existe base científica para prever com precisão quando ela será atingida, então não prometemos uma data.",
  ];
  let direction: GoalAssessment["direction"] = "maintain";
  let planned = 0;
  const sources: SourceId[] = ["PREMISSA_PROJETO"];
  if (goal.type === "health" && goal.metric === "waist_to_height") {
    sources.push("NICE_WHTR");
    if (bmi(profile.weightKg, profile.heightCm) >= 25) {
      direction = "lose";
      planned = CONFIG.fatLossRatePctPerWeek.value.min;
      if (tdeeKcal !== undefined) planned = Math.min(planned, maxLossRateFromEnergy(profile, tdeeKcal));
      messages.push(`Como seu IMC está acima de 25, o plano inclui uma perda de peso lenta (${fmt(planned)}% por semana).`);
      sources.push(...CONFIG.fatLossRatePctPerWeek.sources);
    }
  }
  return { status: "tracked_only", direction, plannedRatePctPerWeek: planned, messages, flags: [], sources };
}

function invalid(direction: GoalAssessment["direction"], message: string): GoalAssessment {
  return {
    status: "invalid",
    direction,
    plannedRatePctPerWeek: 0,
    messages: [message],
    flags: [{ code: "GOAL_INVALID", severity: "block", message, sources: ["PREMISSA_PROJETO"] }],
    sources: ["PREMISSA_PROJETO"],
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
