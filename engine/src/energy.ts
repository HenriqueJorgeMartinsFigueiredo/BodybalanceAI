/**
 * Gasto energético.
 *
 * - TMB por Mifflin-St Jeor: a equação de predição mais confiável na revisão
 *   sistemática de Frankenfield 2005, mas ainda erra > 10 % em parte das pessoas.
 * - Por isso o gasto inicial é só um ponto de partida: depois de 2+ semanas de
 *   pesagens e registro de ingestão, `adaptiveTdee` recalcula com dados reais.
 */
import { CONFIG } from "./config.ts";
import type { ActivityLevel, Sex, Sourced } from "./types.ts";

export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, ageYears: number): Sourced<number> {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const value = sex === "male" ? base + 5 : base - 161;
  return { value: Math.round(value), sources: ["MIFFLIN_1990", "FRANKENFIELD_2005"] };
}

export function estimatedTdee(bmrKcal: number, activity: ActivityLevel): Sourced<number> {
  const factor = CONFIG.activityFactors.value[activity];
  return {
    value: Math.round(bmrKcal * factor),
    sources: [...CONFIG.activityFactors.sources],
    note: "Estimativa inicial. Será recalibrada com o seu peso e o que você comeu nas próximas semanas.",
  };
}

export interface WeighIn {
  date: string; // ISO yyyy-mm-dd
  weightKg: number;
}

/**
 * Inclinação da tendência de peso (kg/semana) por regressão linear simples.
 * Usar tendência em vez de "peso de hoje - peso de 7 dias atrás" reduz o efeito
 * de água, sal, ciclo menstrual e intestino.
 */
export function weightTrendKgPerWeek(weighIns: WeighIn[]): { slopeKgPerWeek: number; days: number; points: number } | null {
  if (weighIns.length < 2) return null;
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  const t0 = Date.parse(sorted[0].date);
  const xs = sorted.map((w) => (Date.parse(w.date) - t0) / 86_400_000);
  const ys = sorted.map((w) => w.weightKg);
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slopePerDay = num / den;
  return { slopeKgPerWeek: slopePerDay * 7, days: xs[n - 1] - xs[0], points: n };
}

/**
 * Gasto real estimado = ingestão média − (variação de energia corporal / dia).
 * Exige no mínimo CONFIG.checkinMinDays dias de dados e ingestão registrada.
 */
export function adaptiveTdee(avgIntakeKcal: number, weighIns: WeighIn[]): Sourced<number> | null {
  const trend = weightTrendKgPerWeek(weighIns);
  if (!trend || trend.days < CONFIG.checkinMinDays.value - 1 || trend.points < 8) return null;
  const storedKcalPerDay = (trend.slopeKgPerWeek * CONFIG.kcalPerKgTissue.value) / 7;
  return {
    value: Math.round(avgIntakeKcal - storedKcalPerDay),
    sources: ["HALL_2011", ...CONFIG.checkinMinDays.sources],
    note: "Calculado a partir da sua tendência de peso e do que você registrou ter comido.",
  };
}
