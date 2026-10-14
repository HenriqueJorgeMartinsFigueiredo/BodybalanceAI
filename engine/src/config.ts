/**
 * Todas as constantes numéricas do motor ficam aqui, com a fonte ao lado.
 * Regra do projeto: nenhum número "mágico" fora deste arquivo.
 * Valores marcados PREMISSA_PROJETO são escolhas do time, não evidência.
 */
import type { SourceId } from "./references.ts";

type Sourced<T> = { value: T; sources: SourceId[] };

export const CONFIG = {
  // ---------------- Gasto energético ----------------
  /** Multiplicadores convencionais de atividade aplicados à TMB (estimativa inicial; o ajuste adaptativo corrige). */
  activityFactors: {
    value: { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 },
    sources: ["MIFFLIN_1990", "PREMISSA_PROJETO"],
  } as Sourced<Record<"sedentary" | "light" | "moderate" | "active" | "very_active", number>>,

  /**
   * Densidade energética aproximada do tecido perdido/ganho (kcal/kg).
   * Hall 2011: a regra estática superestima mudanças no longo prazo — por isso
   * o motor só usa este valor para (a) o déficit inicial e (b) o ajuste
   * semanal com dados reais, nunca para projetar meses à frente.
   */
  kcalPerKgTissue: { value: 7700, sources: ["HALL_2011", "HELMS_2014"] } as Sourced<number>,

  // ---------------- Perda de gordura ----------------
  /** Taxa de perda de peso recomendada: 0,5–1,0 % do peso por semana. */
  fatLossRatePctPerWeek: { value: { min: 0.5, max: 1.0 }, sources: ["HELMS_2014"] } as Sourced<{ min: number; max: number }>,
  /**
   * Interpolação dentro da faixa acima conforme o % de gordura: quem tem mais gordura
   * fica perto de 1,0 %/sem; quem está magro, perto de 0,5 %/sem.
   * Os limites da interpolação são PREMISSA (Helms 2014 recomenda ir mais devagar quando mais magro, sem números exatos).
   */
  fatLossInterpolationBf: {
    value: { male: { lean: 12, high: 25 }, female: { lean: 20, high: 32 } },
    sources: ["HELMS_2014", "ACE_BODY_FAT", "PREMISSA_PROJETO"],
  } as Sourced<Record<"male" | "female", { lean: number; high: number }>>,
  /** Déficit máximo: 500–1.000 kcal/dia ou 25 % do gasto, o que for menor. */
  maxDeficit: { value: { kcal: 1000, fractionOfTdee: 0.25 }, sources: ["NHLBI_LCD"] } as Sourced<{ kcal: number; fractionOfTdee: number }>,
  /** Piso calórico sem acompanhamento profissional. */
  calorieFloor: { value: { female: 1200, male: 1500 }, sources: ["NHLBI_LCD"] } as Sourced<Record<"male" | "female", number>>,

  // ---------------- Ganho de massa ----------------
  /** Ganho de peso alvo por semana (% do peso). Avançado: "mais conservador" (Iraki) → números são PREMISSA. */
  gainRatePctPerWeek: {
    value: {
      novice: { min: 0.25, max: 0.5 },
      intermediate: { min: 0.25, max: 0.5 },
      advanced: { min: 0.1, max: 0.25 },
    },
    sources: ["IRAKI_2019", "PREMISSA_PROJETO"],
  } as Sourced<Record<"novice" | "intermediate" | "advanced", { min: number; max: number }>>,
  /** Superávit inicial como fração do gasto (Iraki: ~10–20 %; avançado mais conservador = PREMISSA). */
  surplusFraction: {
    value: { novice: 0.15, intermediate: 0.1, advanced: 0.05 },
    sources: ["IRAKI_2019", "PREMISSA_PROJETO"],
  } as Sourced<Record<"novice" | "intermediate" | "advanced", number>>,
  /**
   * Fração do peso ganho que vira massa magra, usada SÓ para estimar prazo
   * de metas em "kg de massa magra". Não há fonte com número único: PREMISSA.
   */
  leanFractionOfGain: { value: 0.5, sources: ["PREMISSA_PROJETO"] } as Sourced<number>,

  // ---------------- Macronutrientes ----------------
  /** Proteína em déficit: 2,3–3,1 g/kg de massa magra. Usamos o limite inferior como padrão. */
  proteinDeficitGPerKgFfm: { value: { min: 2.3, max: 3.1, default: 2.3 }, sources: ["HELMS_2014", "ISSN_PROTEIN_2017"] } as Sourced<{ min: number; max: number; default: number }>,
  /** Proteína fora do déficit: ponto de quebra ~1,6 g/kg; faixa útil 1,6–2,2 g/kg. */
  proteinGPerKgBw: { value: { min: 1.6, max: 2.2, default: 1.6 }, sources: ["MORTON_2018", "IRAKI_2019", "ISSN_PROTEIN_2017"] } as Sourced<{ min: number; max: number; default: number }>,
  /** Proteína para foco em resistência (endurance): faixa ISSN 1,4–2,0 g/kg. */
  proteinEnduranceGPerKgBw: { value: 1.4, sources: ["ISSN_PROTEIN_2017"] } as Sourced<number>,
  /** Proteína mínima por refeição: ~0,25 g/kg (ou 20–40 g). */
  proteinPerMealGPerKg: { value: 0.25, sources: ["ISSN_PROTEIN_2017"] } as Sourced<number>,
  /** Gordura: 25 % das kcal por padrão, nunca abaixo de 20 % (Helms usa 15–30 % só para atletas de fisiculturismo). */
  fatPctOfKcal: { value: { default: 0.25, min: 0.2 }, sources: ["HELMS_2014", "PREMISSA_PROJETO"] } as Sourced<{ default: number; min: number }>,
  /** Carboidrato por carga de treino (g/kg/dia) para metas de performance. */
  carbsByTrainingLoad: {
    value: {
      light: { min: 3, max: 5 },
      moderate: { min: 5, max: 7 },
      high: { min: 6, max: 10 },
      extreme: { min: 8, max: 12 },
    },
    sources: ["ACSM_NUTRITION_2016"],
  } as Sourced<Record<"light" | "moderate" | "high" | "extreme", { min: number; max: number }>>,

  // ---------------- Treino ----------------
  /** Séries semanais por grupo muscular (diretas), por objetivo e experiência. */
  weeklySetsPerMuscle: {
    value: {
      health: { novice: 4, intermediate: 6, advanced: 8 },
      fat_loss: { novice: 8, intermediate: 10, advanced: 12 },
      recomposition: { novice: 10, intermediate: 12, advanced: 14 },
      muscle_gain: { novice: 10, intermediate: 14, advanced: 18 },
      performance_strength: { novice: 6, intermediate: 9, advanced: 12 },
      performance_endurance: { novice: 4, intermediate: 6, advanced: 8 },
    },
    sources: ["PELLAND_VOLUME", "ACSM_RT_2026", "WHO_PA_2020", "PREMISSA_PROJETO"],
  } as Sourced<Record<string, Record<"novice" | "intermediate" | "advanced", number>>>,
  /** Frequência mínima por grupo muscular. */
  minFrequencyPerMuscle: { value: 2, sources: ["ACSM_RT_2026", "WHO_PA_2020", "SCHOENFELD_FREQ_2016"] } as Sourced<number>,
  /** Tempo médio por série incluindo descanso (min) — usado para caber na sessão. */
  minutesPerSet: { value: { compound: 3.5, isolation: 2.5 }, sources: ["SCHOENFELD_REST_2016", "PREMISSA_PROJETO"] } as Sourced<{ compound: number; isolation: number }>,

  // ---------------- Aeróbio ----------------
  /** Minutos semanais de aeróbio moderado. */
  aerobicMinutesPerWeek: {
    value: {
      health: { min: 150, target: 150, max: 300 },
      fat_loss: { min: 150, target: 225, max: 300 },
      default: { min: 150, target: 150, max: 300 },
    },
    sources: ["WHO_PA_2020", "DONNELLY_2009"],
  } as Sourced<Record<"health" | "fat_loss" | "default", { min: number; target: number; max: number }>>,

  // ---------------- Limites de segurança ----------------
  minAdultAge: { value: 18, sources: ["PREMISSA_PROJETO"] } as Sourced<number>,
  /** Meta de % de gordura abaixo do limite inferior "atleta" da ACE → exige profissional. */
  minTargetBodyFatPct: { value: { male: 6, female: 14 }, sources: ["ACE_BODY_FAT", "IOC_REDS_2023"] } as Sourced<Record<"male" | "female", number>>,
  minTargetBmi: { value: 18.5, sources: ["WHO_BMI"] } as Sourced<number>,

  // ---------------- Check-in semanal ----------------
  /** Dias mínimos de pesagem antes de mexer nas calorias. */
  checkinMinDays: { value: 14, sources: ["HALL_2011", "PREMISSA_PROJETO"] } as Sourced<number>,
  /** Maior ajuste calórico por check-in (kcal/dia) para evitar reações exageradas a ruído. */
  maxAdjustmentKcal: { value: 250, sources: ["PREMISSA_PROJETO"] } as Sourced<number>,
  /** Perda acima disto (% peso/sem) por 2 semanas = alerta de déficit excessivo. */
  excessiveLossPctPerWeek: { value: 1.5, sources: ["HELMS_2014", "PREMISSA_PROJETO"] } as Sourced<number>,
} as const;
