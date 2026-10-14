/**
 * Check-in semanal: compara a tendência real de peso com o ritmo planejado e
 * ajusta as calorias em passos pequenos. É o que corrige o erro das equações
 * de gasto (Mifflin erra > 10 % em parte das pessoas) e a adaptação metabólica
 * descrita por Hall 2011.
 */
import { fmt } from "./format.ts";
import { CONFIG } from "./config.ts";
import { weightTrendKgPerWeek, type WeighIn } from "./energy.ts";
import type { Flag, Sex, Sourced } from "./types.ts";

export interface CheckinInput {
  sex: Sex;
  direction: "lose" | "gain" | "maintain";
  plannedRatePctPerWeek: number; // sempre positivo
  currentKcal: number;
  weighIns: WeighIn[];
  /** % de dias em que a pessoa seguiu as calorias (autorrelato). */
  adherencePct: number;
  /** Sinais de alerta de deficiência energética (IOC REDs 2023). */
  symptoms: {
    menstrualChanges?: boolean;
    persistentFatigue?: boolean;
    frequentIllnessOrInjury?: boolean;
    lowMoodOrIrritability?: boolean;
    dizziness?: boolean;
  };
}

export type CheckinDecision = "insufficient_data" | "keep" | "adjust" | "improve_adherence_first" | "pause_deficit";

export interface CheckinResult {
  decision: CheckinDecision;
  actualRatePctPerWeek?: number; // negativo = perdendo
  targetRatePctPerWeek: number;
  newKcal: Sourced<number>;
  messages: string[];
  flags: Flag[];
}

/** Erro tolerado (p.p. de peso/semana) antes de mexer nas calorias. PREMISSA. */
const TOLERANCE = 0.15;
/** Adesão mínima para confiar nos dados. PREMISSA. */
const MIN_ADHERENCE = 80;

export function weeklyCheckin(input: CheckinInput): CheckinResult {
  const flags: Flag[] = [];
  const messages: string[] = [];
  const targetRate =
    input.direction === "lose" ? -input.plannedRatePctPerWeek : input.direction === "gain" ? input.plannedRatePctPerWeek : 0;
  const keep = (decision: CheckinDecision): CheckinResult => ({
    decision,
    targetRatePctPerWeek: targetRate,
    newKcal: { value: input.currentKcal, sources: ["PREMISSA_PROJETO"] },
    messages,
    flags,
  });

  // 1) Sinais de alerta vêm antes de qualquer conta.
  const s = input.symptoms;
  const redFlags = [s.menstrualChanges, s.persistentFatigue, s.frequentIllnessOrInjury, s.lowMoodOrIrritability, s.dizziness].filter(Boolean).length;
  if (redFlags > 0 && input.direction === "lose") {
    flags.push({
      code: "REDS_SYMPTOMS",
      severity: "block",
      message:
        "Você relatou sinais que podem indicar pouca energia disponível (alteração menstrual, cansaço persistente, lesões/doenças frequentes, humor baixo ou tontura). Pausamos o déficit; procure um médico ou nutricionista.",
      sources: ["IOC_REDS_2023"],
    });
    // Volta para a manutenção estimada: kcal atuais + o déficit implícito no ritmo real (se houver dado).
    const t = weightTrendKgPerWeek(input.weighIns);
    const back = t ? Math.max(0, (-t.slopeKgPerWeek * CONFIG.kcalPerKgTissue.value) / 7) : CONFIG.maxAdjustmentKcal.value;
    return {
      decision: "pause_deficit",
      targetRatePctPerWeek: 0,
      newKcal: { value: Math.round((input.currentKcal + back) / 10) * 10, sources: ["IOC_REDS_2023", "HALL_2011"] },
      messages,
      flags,
    };
  }

  // 2) Dados suficientes?
  const trend = weightTrendKgPerWeek(input.weighIns);
  if (!trend || trend.days < CONFIG.checkinMinDays.value - 1 || trend.points < 8) {
    messages.push("Ainda não há pesagens suficientes (precisamos de ~2 semanas, idealmente pesagem diária). Mantenha o plano.");
    return keep("insufficient_data");
  }
  const lastWeight = input.weighIns.reduce((a, b) => (a.date > b.date ? a : b)).weightKg;
  const actualRate = round2((trend.slopeKgPerWeek / lastWeight) * 100);

  // 3) Perda rápida demais: corrige mesmo com adesão baixa.
  if (actualRate < -CONFIG.excessiveLossPctPerWeek.value) {
    const add = CONFIG.maxAdjustmentKcal.value;
    flags.push({
      code: "LOSS_TOO_FAST",
      severity: "warning",
      message: `Você está perdendo ${fmt(Math.abs(actualRate))}% do peso por semana — rápido demais. Aumentamos ${add} kcal/dia.`,
      sources: CONFIG.excessiveLossPctPerWeek.sources,
    });
    return {
      decision: "adjust",
      actualRatePctPerWeek: actualRate,
      targetRatePctPerWeek: targetRate,
      newKcal: { value: input.currentKcal + add, sources: CONFIG.maxAdjustmentKcal.sources },
      messages,
      flags,
    };
  }

  // 4) Adesão baixa: o problema não é a conta, é seguir o plano.
  if (input.adherencePct < MIN_ADHERENCE) {
    messages.push(`Adesão de ${input.adherencePct}% na semana. Antes de mudar as calorias, vamos tentar seguir o plano atual por mais uma semana.`);
    return { ...keep("improve_adherence_first"), actualRatePctPerWeek: actualRate };
  }

  // 5) Ajuste proporcional ao erro, limitado.
  const error = targetRate - actualRate; // em % do peso por semana
  if (Math.abs(error) <= TOLERANCE) {
    messages.push(`Ritmo real ${fmt(actualRate)}%/sem vs. planejado ${fmt(targetRate)}%/sem. Dentro do esperado — nada muda.`);
    return { ...keep("keep"), actualRatePctPerWeek: actualRate };
  }
  const rawDelta = ((error / 100) * lastWeight * CONFIG.kcalPerKgTissue.value) / 7;
  const cap = CONFIG.maxAdjustmentKcal.value;
  let delta = Math.max(-cap, Math.min(cap, rawDelta));
  let newKcal = input.currentKcal + delta;
  const floor = CONFIG.calorieFloor.value[input.sex];
  if (newKcal < floor) {
    newKcal = floor;
    delta = floor - input.currentKcal;
    flags.push({
      code: "CALORIE_FLOOR",
      severity: "warning",
      message: `Chegamos ao piso de ${fmt(floor)} kcal. Para ir além, só com acompanhamento profissional; aumentar o aeróbio é a alternativa.`,
      sources: CONFIG.calorieFloor.sources,
    });
  }
  newKcal = Math.round(newKcal / 10) * 10;
  messages.push(
    `Ritmo real ${fmt(actualRate)}%/sem vs. planejado ${fmt(targetRate)}%/sem. Ajuste de ${Math.round(delta) > 0 ? "+" : ""}${Math.round(delta)} kcal/dia.`,
  );
  return {
    decision: "adjust",
    actualRatePctPerWeek: actualRate,
    targetRatePctPerWeek: targetRate,
    newKcal: { value: newKcal, sources: ["HALL_2011", ...CONFIG.maxAdjustmentKcal.sources] },
    messages,
    flags,
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
