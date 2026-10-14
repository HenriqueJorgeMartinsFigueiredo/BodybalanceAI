import type { SourceId } from "./references.ts";

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Experience = "novice" | "intermediate" | "advanced";
export type Equipment = "gym" | "home_dumbbells" | "bodyweight";
export type TrainingLoad = "light" | "moderate" | "high" | "extreme";

export type GoalType =
  | "fat_loss"
  | "muscle_gain"
  | "recomposition"
  | "health"
  | "performance_strength"
  | "performance_endurance";

/** Métrica numérica que define a meta. */
export type GoalMetric =
  | "weight_kg"
  | "body_fat_pct"
  | "lean_mass_kg"
  | "waist_to_height"
  | "custom"; // ex.: carga no supino, tempo nos 5 km — acompanhado, não projetado

export interface Profile {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  experience: Experience;
  trainingDaysPerWeek: number; // 2–6
  sessionMinutes: number;
  equipment: Equipment;
  /** Só para metas de performance de resistência. */
  enduranceTrainingLoad?: TrainingLoad;
  mealsPerDay?: number;
}

/**
 * Fontes de % de gordura do BodyBalanceAI:
 *  - photo_ai:     estimativa visual das 3 fotos (sempre em faixa)
 *  - bmi_equation: equação de Deurenberg a partir de altura, peso, idade e sexo (calculada automaticamente)
 *  - navy_tape:    fita métrica (opcional; melhora a precisão)
 */
export type BodyFatMethod = "photo_ai" | "bmi_equation" | "navy_tape";

export interface BodyFatEstimate {
  method: BodyFatMethod;
  percent: number;
  /** Faixa informada pelo método (ex.: a IA de foto devolve min/max). */
  low?: number;
  high?: number;
  measuredAt: string; // ISO date
}

export interface Measurements {
  neckCm?: number;
  waistCm?: number; // na altura do umbigo (método Navy)
  hipCm?: number;
}

export interface Goal {
  type: GoalType;
  metric: GoalMetric;
  targetValue: number;
  deadlineWeeks: number;
  /** Descrição livre quando metric = "custom". */
  customLabel?: string;
}

export interface ScreeningAnswers {
  pregnantOrLactating: boolean;
  eatingDisorderHistory: boolean;
  /** Doença cardiovascular, renal, metabólica (ex.: diabetes em uso de insulina), ou orientação médica de restrição. */
  chronicConditionNeedingClearance: boolean;
  /** Dor no peito, desmaios, tontura ao se exercitar. */
  exerciseWarningSymptoms: boolean;
  hasProfessionalClearance: boolean;
}

/** Todo número recomendado vem com as fontes que o justificam. */
export interface Sourced<T> {
  value: T;
  sources: SourceId[];
  note?: string;
}

export type Severity = "info" | "warning" | "block";

export interface Flag {
  code: string;
  severity: Severity;
  message: string;
  sources: SourceId[];
}
