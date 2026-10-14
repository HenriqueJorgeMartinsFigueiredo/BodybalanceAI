/**
 * Gerador de programa de treino de força + aeróbio.
 *
 * Princípios (ver docs/02-BASE-CIENTIFICA.md):
 *  - Todos os grandes grupos musculares ≥ 2x/semana (ACSM 2026, OMS 2020).
 *  - Volume semanal por grupo conforme objetivo/experiência; séries "indiretas"
 *    contam como 0,5 série (método fracionário de Pelland et al.).
 *  - Hipertrofia acontece numa faixa ampla de repetições quando a série chega
 *    perto da falha (Schoenfeld 2021; Robinson 2024). Força: cargas altas (~80 % 1RM).
 *  - Descanso maior em exercícios multiarticulares (Schoenfeld 2016).
 */
import { CONFIG } from "./config.ts";
import type { Equipment, Experience, Flag, GoalType, Profile, Sourced } from "./types.ts";
import type { SourceId } from "./references.ts";

export type Muscle =
  | "chest"
  | "back"
  | "quads"
  | "hamstrings_glutes"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "calves"
  | "core";

const MAJOR: Muscle[] = ["chest", "back", "quads", "hamstrings_glutes", "shoulders"];
const MINOR: Muscle[] = ["biceps", "triceps", "calves", "core"];

export const MUSCLE_LABEL_PT: Record<Muscle, string> = {
  chest: "Peito",
  back: "Costas",
  quads: "Quadríceps",
  hamstrings_glutes: "Posteriores e glúteos",
  shoulders: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  calves: "Panturrilhas",
  core: "Core/abdômen",
};

interface ExerciseDef {
  name: string;
  primary: Muscle;
  secondary: Muscle[]; // contam 0,5 série cada
  kind: "compound" | "isolation";
  /** Exercício isométrico medido em segundos (ex.: prancha). */
  timed?: boolean;
}

const LIB: Record<Equipment, Record<Muscle, ExerciseDef[]>> = {
  gym: {
    chest: [
      { name: "Supino reto com barra", primary: "chest", secondary: ["triceps", "shoulders"], kind: "compound" },
      { name: "Supino inclinado com halteres", primary: "chest", secondary: ["triceps", "shoulders"], kind: "compound" },
    ],
    back: [
      { name: "Puxada na polia (pegada aberta)", primary: "back", secondary: ["biceps"], kind: "compound" },
      { name: "Remada baixa na polia", primary: "back", secondary: ["biceps"], kind: "compound" },
    ],
    quads: [
      { name: "Agachamento livre", primary: "quads", secondary: ["hamstrings_glutes"], kind: "compound" },
      { name: "Leg press 45°", primary: "quads", secondary: ["hamstrings_glutes"], kind: "compound" },
    ],
    hamstrings_glutes: [
      { name: "Levantamento terra romeno", primary: "hamstrings_glutes", secondary: [], kind: "compound" },
      { name: "Mesa flexora", primary: "hamstrings_glutes", secondary: [], kind: "isolation" },
    ],
    shoulders: [
      { name: "Desenvolvimento com halteres", primary: "shoulders", secondary: ["triceps"], kind: "compound" },
      { name: "Elevação lateral com halteres", primary: "shoulders", secondary: [], kind: "isolation" },
    ],
    biceps: [{ name: "Rosca direta", primary: "biceps", secondary: [], kind: "isolation" }],
    triceps: [{ name: "Tríceps na polia", primary: "triceps", secondary: [], kind: "isolation" }],
    calves: [{ name: "Panturrilha em pé", primary: "calves", secondary: [], kind: "isolation" }],
    core: [{ name: "Prancha", primary: "core", secondary: [], kind: "isolation", timed: true }],
  },
  home_dumbbells: {
    chest: [
      { name: "Supino com halteres no chão", primary: "chest", secondary: ["triceps", "shoulders"], kind: "compound" },
      { name: "Flexão de braço", primary: "chest", secondary: ["triceps", "shoulders"], kind: "compound" },
    ],
    back: [
      { name: "Remada unilateral com halter", primary: "back", secondary: ["biceps"], kind: "compound" },
      { name: "Remada curvada com halteres", primary: "back", secondary: ["biceps"], kind: "compound" },
    ],
    quads: [
      { name: "Agachamento goblet", primary: "quads", secondary: ["hamstrings_glutes"], kind: "compound" },
      { name: "Agachamento búlgaro com halteres", primary: "quads", secondary: ["hamstrings_glutes"], kind: "compound" },
    ],
    hamstrings_glutes: [
      { name: "Stiff com halteres", primary: "hamstrings_glutes", secondary: [], kind: "compound" },
      { name: "Ponte de glúteo com halter", primary: "hamstrings_glutes", secondary: [], kind: "isolation" },
    ],
    shoulders: [
      { name: "Desenvolvimento sentado com halteres", primary: "shoulders", secondary: ["triceps"], kind: "compound" },
      { name: "Elevação lateral com halteres", primary: "shoulders", secondary: [], kind: "isolation" },
    ],
    biceps: [{ name: "Rosca alternada com halteres", primary: "biceps", secondary: [], kind: "isolation" }],
    triceps: [{ name: "Tríceps francês com halter", primary: "triceps", secondary: [], kind: "isolation" }],
    calves: [{ name: "Panturrilha unilateral com halter", primary: "calves", secondary: [], kind: "isolation" }],
    core: [{ name: "Prancha", primary: "core", secondary: [], kind: "isolation", timed: true }],
  },
  bodyweight: {
    chest: [
      { name: "Flexão de braço (progrida a inclinação)", primary: "chest", secondary: ["triceps", "shoulders"], kind: "compound" },
      { name: "Flexão com pés elevados", primary: "chest", secondary: ["triceps", "shoulders"], kind: "compound" },
    ],
    back: [
      { name: "Remada invertida (mesa firme ou barra baixa)", primary: "back", secondary: ["biceps"], kind: "compound" },
      { name: "Barra fixa (ou negativa)", primary: "back", secondary: ["biceps"], kind: "compound" },
    ],
    quads: [
      { name: "Agachamento (use uma cadeira como apoio, se precisar)", primary: "quads", secondary: ["hamstrings_glutes"], kind: "compound" },
      { name: "Agachamento búlgaro", primary: "quads", secondary: ["hamstrings_glutes"], kind: "compound" },
    ],
    hamstrings_glutes: [
      { name: "Ponte de glúteo unilateral", primary: "hamstrings_glutes", secondary: [], kind: "isolation" },
      { name: "Levantamento terra unilateral sem peso", primary: "hamstrings_glutes", secondary: [], kind: "compound" },
    ],
    shoulders: [
      { name: "Flexão pike (joelhos apoiados, se precisar)", primary: "shoulders", secondary: ["triceps"], kind: "compound" },
      { name: "Elevação em Y no chão", primary: "shoulders", secondary: [], kind: "isolation" },
    ],
    biceps: [{ name: "Remada invertida com pegada supinada", primary: "biceps", secondary: ["back"], kind: "compound" }],
    triceps: [{ name: "Mergulho no banco", primary: "triceps", secondary: ["chest"], kind: "compound" }],
    calves: [{ name: "Panturrilha unilateral no degrau", primary: "calves", secondary: [], kind: "isolation" }],
    core: [{ name: "Prancha", primary: "core", secondary: [], kind: "isolation", timed: true }],
  },
};

type SessionTemplate = { name: string; muscles: Muscle[] };

const UPPER: Muscle[] = ["chest", "back", "shoulders", "biceps", "triceps"];
const LOWER: Muscle[] = ["quads", "hamstrings_glutes", "calves", "core"];
const FULL: Muscle[] = [...MAJOR, ...MINOR];
const PUSH: Muscle[] = ["chest", "shoulders", "triceps"];
const PULL: Muscle[] = ["back", "biceps", "core"];
const LEGS: Muscle[] = ["quads", "hamstrings_glutes", "calves"];

export function chooseSplit(days: number): SessionTemplate[] {
  switch (clampInt(days, 2, 6)) {
    case 2:
      return [{ name: "Corpo inteiro A", muscles: FULL }, { name: "Corpo inteiro B", muscles: FULL }];
    case 3:
      return [
        { name: "Corpo inteiro A", muscles: FULL },
        { name: "Corpo inteiro B", muscles: FULL },
        { name: "Corpo inteiro C", muscles: FULL },
      ];
    case 4:
      return [
        { name: "Superior A", muscles: UPPER },
        { name: "Inferior A", muscles: LOWER },
        { name: "Superior B", muscles: UPPER },
        { name: "Inferior B", muscles: LOWER },
      ];
    case 5:
      return [
        { name: "Superior", muscles: UPPER },
        { name: "Inferior", muscles: LOWER },
        { name: "Empurrar", muscles: PUSH },
        { name: "Puxar", muscles: PULL },
        { name: "Pernas", muscles: LEGS },
      ];
    default:
      return [
        { name: "Empurrar A", muscles: PUSH },
        { name: "Puxar A", muscles: PULL },
        { name: "Pernas A", muscles: LEGS },
        { name: "Empurrar B", muscles: PUSH },
        { name: "Puxar B", muscles: PULL },
        { name: "Pernas B", muscles: [...LEGS, "core"] },
      ];
  }
}

export interface Prescription {
  repRange: [number, number];
  rir: [number, number];
  restSeconds: [number, number];
  loadNote: string;
}

export function prescriptionFor(goal: GoalType, experience: Experience, kind: "compound" | "isolation"): Sourced<Prescription> {
  const rest: [number, number] = kind === "compound" ? [120, 180] : [60, 120];
  const sources: SourceId[] = ["SCHOENFELD_LOAD_2021", "ROBINSON_2024", "ACSM_RT_2026", "SCHOENFELD_REST_2016"];
  if (goal === "performance_strength" && kind === "compound") {
    return {
      value: { repRange: [3, 6], rir: [1, 3], restSeconds: [180, 300], loadNote: "Carga alta (~80–90% de 1RM). Não precisa ir à falha." },
      sources,
    };
  }
  if (goal === "health" || goal === "performance_endurance") {
    return {
      value: { repRange: [8, 15], rir: [2, 4], restSeconds: rest, loadNote: "Carga moderada. Termine a série sentindo esforço alto, sem falhar a técnica." },
      sources,
    };
  }
  // Hipertrofia / emagrecimento / recomposição
  const rir: [number, number] = experience === "novice" ? [2, 3] : [1, 2];
  const reps: [number, number] = kind === "compound" ? [6, 10] : [10, 15];
  return {
    value: {
      repRange: reps,
      rir,
      restSeconds: rest,
      loadNote: "Escolha uma carga que deixe só as repetições de reserva indicadas (RIR) ao final da série.",
    },
    sources: [...sources, ...(experience === "novice" ? (["PREMISSA_PROJETO"] as SourceId[]) : [])],
  };
}

export interface PlannedExercise {
  name: string;
  muscle: Muscle;
  kind: "compound" | "isolation";
  sets: number;
  /** "reps": repRange são repetições; "seconds": repRange são segundos de sustentação. */
  unit: "reps" | "seconds";
  prescription: Prescription;
}

export interface PlannedSession {
  name: string;
  exercises: PlannedExercise[];
  estimatedMinutes: number;
}

export interface TrainingPlan {
  sessions: PlannedSession[];
  weeklySetsByMuscle: Record<Muscle, number>; // fracionário (indiretas = 0,5)
  frequencyByMuscle: Record<Muscle, number>;
  progression: Sourced<string[]>;
  aerobic: Sourced<{ startMinutesPerWeek: number; targetMinutesPerWeek: number; sessions: number; intensity: string; progression: string }>;
  sources: SourceId[];
  flags: Flag[];
}

export function buildTrainingPlan(profile: Profile, goal: GoalType): TrainingPlan {
  const flags: Flag[] = [];
  const split = chooseSplit(profile.trainingDaysPerWeek);
  const lib = LIB[profile.equipment];
  const majorTarget = CONFIG.weeklySetsPerMuscle.value[goal][profile.experience];

  // Alvo semanal fracionário por músculo. Menores = 60 % do alvo maior; core fixo. (PREMISSA)
  const target: Record<Muscle, number> = {
    chest: majorTarget,
    back: majorTarget,
    quads: majorTarget,
    hamstrings_glutes: majorTarget,
    shoulders: majorTarget,
    biceps: Math.round(majorTarget * 0.6),
    triceps: Math.round(majorTarget * 0.6),
    calves: Math.round(majorTarget * 0.6),
    core: Math.max(4, Math.round(majorTarget * 0.4)),
  };

  const frequency = Object.fromEntries(
    (Object.keys(target) as Muscle[]).map((m) => [m, split.filter((s) => s.muscles.includes(m)).length]),
  ) as Record<Muscle, number>;

  for (const m of MAJOR) {
    if (frequency[m] < CONFIG.minFrequencyPerMuscle.value) {
      flags.push({
        code: "LOW_FREQUENCY",
        severity: "warning",
        message: `${MUSCLE_LABEL_PT[m]} ficou com frequência ${frequency[m]}x/semana.`,
        sources: CONFIG.minFrequencyPerMuscle.sources,
      });
    }
  }

  // 1) Séries diretas dos grupos maiores, distribuídas pelas sessões.
  const sessions: PlannedSession[] = split.map((s) => ({ name: s.name, exercises: [], estimatedMinutes: 0 }));
  const defs = new Map<string, ExerciseDef>();
  for (const list of Object.values(lib)) for (const d of list) defs.set(d.name, d);
  // Iniciantes repetem o mesmo exercício principal nas sessões (aprender a técnica). PREMISSA.
  const variantFor = (k: number) => (profile.experience === "novice" ? 0 : k);

  const addSets = (sessionIdx: number, m: Muscle, sets: number, variant: number) => {
    if (sets <= 0) return;
    const options = lib[m];
    const ex = options[variant % options.length];
    const base = prescriptionFor(goal, profile.experience, ex.kind).value;
    const presc: Prescription = ex.timed
      ? { ...base, repRange: [20, 60], loadNote: "Sustente com boa postura; quando passar de 60 s, use uma variação mais difícil." }
      : base;
    const existing = sessions[sessionIdx].exercises.find((e) => e.name === ex.name);
    if (existing) existing.sets += sets;
    else sessions[sessionIdx].exercises.push({ name: ex.name, muscle: m, kind: ex.kind, sets, unit: ex.timed ? "seconds" : "reps", prescription: presc });
  };

  const distribute = (m: Muscle, total: number) => {
    const idxs = split.map((s, i) => (s.muscles.includes(m) ? i : -1)).filter((i) => i >= 0);
    if (idxs.length === 0 || total <= 0) return;
    const base = Math.floor(total / idxs.length);
    let rest = total - base * idxs.length;
    idxs.forEach((sessionIdx, k) => {
      const sets = base + (rest-- > 0 ? 1 : 0);
      // Até 4 séries: um exercício. Acima: divide em dois exercícios diferentes.
      if (sets <= 4) addSets(sessionIdx, m, sets, variantFor(k));
      else {
        addSets(sessionIdx, m, Math.ceil(sets / 2), variantFor(k));
        addSets(sessionIdx, m, Math.floor(sets / 2), variantFor(k) + 1);
      }
    });
  };

  /** Séries diretas e indiretas (0,5) por músculo a partir das sessões atuais. */
  const tally = () => {
    const direct = { chest: 0, back: 0, quads: 0, hamstrings_glutes: 0, shoulders: 0, biceps: 0, triceps: 0, calves: 0, core: 0 } as Record<Muscle, number>;
    const indirect = { ...direct };
    for (const s of sessions)
      for (const e of s.exercises) {
        const d = defs.get(e.name)!;
        direct[d.primary] += e.sets;
        for (const sec of d.secondary) indirect[sec] += e.sets * 0.5;
      }
    return { direct, indirect };
  };

  for (const m of MAJOR) distribute(m, target[m]);
  // 2) Grupos menores: só o que falta depois de contar as séries indiretas.
  {
    const { direct, indirect } = tally();
    for (const m of MINOR) distribute(m, Math.max(0, Math.round(target[m] - indirect[m] - direct[m])));
  }

  // 3) Caber no tempo disponível: primeiro corta isolados dos grupos menores; depois
  //    séries dos grupos maiores, sem descer abaixo da "dose mínima" (volume do objetivo saúde). PREMISSA.
  const warmup = 10;
  const minutesOf = (s: PlannedSession) =>
    Math.round(warmup + s.exercises.reduce((sum, e) => sum + e.sets * CONFIG.minutesPerSet.value[e.kind], 0));
  const majorFloor = CONFIG.weeklySetsPerMuscle.value.health[profile.experience];
  let trimmed = false;
  for (const s of sessions) {
    while (minutesOf(s) > profile.sessionMinutes) {
      let victim = s.exercises.filter((e) => MINOR.includes(e.muscle) && e.sets > 0).sort((a, b) => b.sets - a.sets)[0];
      if (!victim) {
        const { direct } = tally();
        victim = s.exercises
          .filter((e) => MAJOR.includes(e.muscle) && e.sets > 1 && direct[e.muscle] - 1 >= majorFloor)
          .sort((a, b) => b.sets - a.sets)[0];
      }
      if (!victim) break;
      victim.sets -= 1;
      trimmed = true;
      s.exercises = s.exercises.filter((e) => e.sets > 0);
    }
    s.estimatedMinutes = minutesOf(s);
  }
  if (trimmed) {
    flags.push({
      code: "VOLUME_REDUCED_FOR_TIME",
      severity: "info",
      message: `Reduzimos o volume para caber nos seus ${profile.sessionMinutes} min por sessão. Para recuperar o volume ideal, treine mais dias ou faça bi-séries (pares de exercícios de músculos opostos com descanso entre os pares).`,
      sources: ["IVERSEN_2021", ...CONFIG.minutesPerSet.sources],
    });
  }
  for (const s of sessions) {
    if (s.estimatedMinutes > profile.sessionMinutes) {
      flags.push({
        code: "SESSION_TOO_LONG",
        severity: "warning",
        message: `${s.name} leva ~${s.estimatedMinutes} min, mais que os ${profile.sessionMinutes} min disponíveis, mesmo no volume mínimo. Treine mais dias por semana ou use bi-séries.`,
        sources: ["IVERSEN_2021", ...CONFIG.minutesPerSet.sources],
      });
    }
  }

  const { direct, indirect } = tally();
  const weeklySetsByMuscle = Object.fromEntries(
    (Object.keys(direct) as Muscle[]).map((m) => [m, direct[m] + indirect[m]]),
  ) as Record<Muscle, number>;

  const aerobicCfg =
    goal === "fat_loss" ? CONFIG.aerobicMinutesPerWeek.value.fat_loss : goal === "health" ? CONFIG.aerobicMinutesPerWeek.value.health : CONFIG.aerobicMinutesPerWeek.value.default;
  const aerobicSessions = goal === "performance_endurance" ? 0 : Math.max(3, Math.min(5, Math.ceil(aerobicCfg.target / 45)));

  return {
    sessions,
    weeklySetsByMuscle,
    frequencyByMuscle: frequency,
    progression: {
      value: [
        "Progressão dupla: mantenha a carga até completar o topo da faixa de repetições em todas as séries com o RIR indicado; então aumente a carga ~2,5–5% e volte ao início da faixa.",
        "Se o desempenho cair por 2 sessões seguidas, reduza as séries em ~1/3 por uma semana.",
        goal === "performance_strength"
          ? "Teste ou estime a carga máxima (1RM) a cada 4–6 semanas para recalibrar as cargas."
          : "A cada 4 semanas, compare cargas e repetições do exercício principal de cada grupo.",
      ],
      sources: ["ACSM_RT_2026", "PREMISSA_PROJETO"],
    },
    aerobic: {
      value: {
        startMinutesPerWeek: goal === "performance_endurance" ? 0 : aerobicCfg.min,
        targetMinutesPerWeek: goal === "performance_endurance" ? 0 : aerobicCfg.target,
        sessions: aerobicSessions,
        progression:
          aerobicCfg.target > aerobicCfg.min
            ? `Comece com ${aerobicCfg.min} min/semana e some ~25 min por semana até ${aerobicCfg.target} min.`
            : `Mantenha ${aerobicCfg.min} min/semana; caminhadas contam.`,
        intensity:
          goal === "performance_endurance"
            ? "Use o plano do seu esporte; o app cuida da força e da nutrição."
            : "Moderada: dá para conversar, mas não cantar (ou 75–150 min/semana em intensidade vigorosa).",
      },
      sources: [...CONFIG.aerobicMinutesPerWeek.sources],
    },
    sources: [...CONFIG.weeklySetsPerMuscle.sources, ...CONFIG.minFrequencyPerMuscle.sources, ...(trimmed ? (["IVERSEN_2021"] as SourceId[]) : [])],
    flags,
  };
}

function clampInt(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(x)));
}
