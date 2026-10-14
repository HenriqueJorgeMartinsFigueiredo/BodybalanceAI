/**
 * Composição corporal do BodyBalanceAI: o app usa SÓ fotos e dados que o usuário
 * informa (sexo, idade, altura, peso; fita métrica é opcional).
 *
 * Fontes de % de gordura combinadas:
 *  1. Foto (IA)              — estimativa visual em faixa
 *  2. Equação de Deurenberg  — a partir do IMC, idade e sexo (sempre disponível)
 *  3. Método da Marinha      — se o usuário medir pescoço/cintura(/quadril)
 *
 * IMPORTANTE: nada disso é bioimpedância. Nunca apresente como medição de exame.
 */
import { fmt } from "./format.ts";
import type { BodyFatEstimate, BodyFatMethod, Flag, Sex, Sourced } from "./types.ts";
import type { SourceId } from "./references.ts";

/**
 * Erro-padrão por método (pontos percentuais de gordura), usado para ponderar as estimativas.
 *  - bmi_equation: 4,1 p.p. = erro-padrão publicado por Deurenberg et al. (1991).
 *  - navy_tape e photo_ai: PREMISSA DO PROJETO.
 * A IA de foto usa um valor alto de propósito: o estudo de validação de fotos
 * (Majmudar 2022, erro médio ~2 p.p. vs DXA) testou um modelo treinado para isso,
 * não um modelo de linguagem genérico. Quando o app tiver validação própria,
 * reduza este valor e a foto passará a pesar mais.
 */
export const METHOD_SE: Record<BodyFatMethod, number> = {
  photo_ai: 5.0,
  bmi_equation: 4.1,
  navy_tape: 3.5,
};

/**
 * Equação de Deurenberg et al. (1991) para adultos:
 * %G = 1,20·IMC + 0,23·idade − 10,8·sexo − 5,4   (sexo: homem = 1, mulher = 0; erro-padrão 4,1 p.p.)
 * Limitações: o IMC não separa músculo de gordura (superestima em pessoas musculosas)
 * e os autores relatam leve superestimação em pessoas com obesidade.
 */
export function deurenbergBodyFatPct(sex: Sex, weightKg: number, heightCm: number, ageYears: number): Sourced<number> {
  if (ageYears < 18) throw new RangeError("A equação usada aqui vale para adultos.");
  const s = sex === "male" ? 1 : 0;
  const pct = 1.2 * bmi(weightKg, heightCm) + 0.23 * ageYears - 10.8 * s - 5.4;
  return { value: round1(pct), sources: ["DEURENBERG_1991"] };
}

/**
 * Método da Marinha dos EUA (Hodgdon & Beckett, 1984), versão em centímetros.
 * Homens: cintura na altura do umbigo e pescoço. Mulheres: + quadril.
 */
export function navyBodyFatPct(
  sex: Sex,
  heightCm: number,
  neckCm: number,
  waistCm: number,
  hipCm?: number,
): Sourced<number> {
  if (heightCm <= 0 || neckCm <= 0 || waistCm <= 0) {
    throw new RangeError("Medidas devem ser positivas.");
  }
  let pct: number;
  if (sex === "male") {
    if (waistCm <= neckCm) throw new RangeError("A cintura precisa ser maior que o pescoço.");
    pct = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  } else {
    if (hipCm === undefined || hipCm <= 0) throw new RangeError("Para mulheres o quadril é obrigatório.");
    if (waistCm + hipCm <= neckCm) throw new RangeError("Medidas inconsistentes.");
    pct = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450;
  }
  return { value: round1(pct), sources: ["HODGDON_BECKETT_1984"] };
}

export interface CombinedBodyFat {
  percent: number;
  low: number;
  high: number;
  methodsUsed: BodyFatMethod[];
  flags: Flag[];
  sources: Sourced<number>["sources"];
}

/**
 * Combina estimativas por média ponderada pelo inverso da variância.
 */
export function combineBodyFat(estimates: BodyFatEstimate[]): CombinedBodyFat {
  const valid = estimates.filter((e) => Number.isFinite(e.percent) && e.percent > 2 && e.percent < 70);
  if (valid.length === 0) throw new RangeError("Nenhuma estimativa válida de % de gordura.");

  let wSum = 0;
  let wxSum = 0;
  for (const e of valid) {
    const se = seFor(e);
    const w = 1 / (se * se);
    wSum += w;
    wxSum += w * e.percent;
  }
  const mean = wxSum / wSum;
  const combinedSe = Math.sqrt(1 / wSum);

  const flags: Flag[] = [];
  const values = valid.map((e) => e.percent);
  const spread = Math.max(...values) - Math.min(...values);
  if (valid.length > 1 && spread > 6) {
    flags.push({
      code: "BF_METHODS_DISAGREE",
      severity: "warning",
      message: `As estimativas de gordura divergem em ${fmt(round1(spread), 1)} pontos. Isso é comum em pessoas musculosas, porque a conta pelo IMC não separa músculo de gordura. Refaça as fotos seguindo o protocolo (manhã, em jejum, mesma luz e postura) ou adicione as medidas com fita.`,
      sources: ["DEURENBERG_1991", "PREMISSA_PROJETO"],
    });
  }
  const methods = new Set(valid.map((e) => e.method));
  if (!methods.has("photo_ai")) {
    flags.push({
      code: "BF_NO_PHOTO",
      severity: "warning",
      message: "Sem fotos, a estimativa vem só dos seus dados (IMC, idade e sexo), que não separam músculo de gordura. Tire as 3 fotos para uma estimativa melhor.",
      sources: ["DEURENBERG_1991"],
    });
  } else if (!methods.has("navy_tape")) {
    flags.push({
      code: "BF_TAPE_SUGGESTED",
      severity: "info",
      message: "Opcional: medir pescoço e cintura (e quadril, para mulheres) com fita deixa a estimativa mais precisa.",
      sources: ["HODGDON_BECKETT_1984"],
    });
  }

  return {
    percent: round1(mean),
    low: round1(mean - combinedSe),
    high: round1(mean + combinedSe),
    methodsUsed: valid.map((e) => e.method),
    flags,
    sources: [
      ...(methods.has("photo_ai") ? (["MAJMUDAR_2022"] as SourceId[]) : []),
      ...(methods.has("bmi_equation") ? (["DEURENBERG_1991"] as SourceId[]) : []),
      ...(methods.has("navy_tape") ? (["HODGDON_BECKETT_1984"] as SourceId[]) : []),
      "PREMISSA_PROJETO",
    ],
  };
}

function seFor(e: BodyFatEstimate): number {
  const base = METHOD_SE[e.method];
  // Se o método informou uma faixa maior que o erro assumido, respeite a faixa.
  if (e.low !== undefined && e.high !== undefined && e.high > e.low) {
    return Math.max(base, (e.high - e.low) / 2);
  }
  return base;
}

export interface Composition {
  weightKg: number;
  bodyFatPct: number;
  fatMassKg: number;
  fatFreeMassKg: number;
}

export function composition(weightKg: number, bodyFatPct: number): Composition {
  const fatMassKg = (weightKg * bodyFatPct) / 100;
  return {
    weightKg,
    bodyFatPct,
    fatMassKg: round1(fatMassKg),
    fatFreeMassKg: round1(weightKg - fatMassKg),
  };
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

export type WhtrClass = "below_classified_range" | "healthy" | "increased" | "high";

/** Razão cintura/estatura — NICE: 0,4–0,49 saudável; 0,5–0,59 risco aumentado; ≥ 0,6 risco alto. */
export function waistToHeight(waistCm: number, heightCm: number): Sourced<{ ratio: number; class: WhtrClass }> {
  const ratio = Math.round((waistCm / heightCm) * 100) / 100;
  let cls: WhtrClass;
  if (ratio < 0.4) cls = "below_classified_range";
  else if (ratio < 0.5) cls = "healthy";
  else if (ratio < 0.6) cls = "increased";
  else cls = "high";
  return { value: { ratio, class: cls }, sources: ["NICE_WHTR"] };
}

export type AceCategory = "essential" | "athlete" | "fitness" | "acceptable" | "obese";

/** Categorias de % de gordura da ACE. */
export function aceCategory(sex: Sex, bodyFatPct: number): AceCategory {
  const t =
    sex === "male"
      ? { athlete: 6, fitness: 14, acceptable: 18, obese: 25 }
      : { athlete: 14, fitness: 21, acceptable: 25, obese: 32 };
  if (bodyFatPct < t.athlete) return "essential";
  if (bodyFatPct < t.fitness) return "athlete";
  if (bodyFatPct < t.acceptable) return "fitness";
  if (bodyFatPct < t.obese) return "acceptable";
  return "obese";
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
