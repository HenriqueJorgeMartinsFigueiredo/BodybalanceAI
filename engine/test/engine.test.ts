import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG,
  SOURCES,
  assessGoal,
  buildNutritionPlan,
  buildTrainingPlan,
  chooseSplit,
  combineBodyFat,
  composition,
  deurenbergBodyFatPct,
  generatePlan,
  mifflinStJeor,
  navyBodyFatPct,
  rateForDeadline,
  screen,
  waistToHeight,
  weeklyCheckin,
  weeksToTarget,
  type Profile,
  type ScreeningAnswers,
  type WeighIn,
} from "../src/index.ts";

const healthy: ScreeningAnswers = {
  pregnantOrLactating: false,
  eatingDisorderHistory: false,
  chronicConditionNeedingClearance: false,
  exerciseWarningSymptoms: false,
  hasProfessionalClearance: false,
};

const man: Profile = {
  sex: "male",
  ageYears: 30,
  heightCm: 180,
  weightKg: 90,
  activityLevel: "moderate",
  experience: "intermediate",
  trainingDaysPerWeek: 4,
  sessionMinutes: 75,
  equipment: "gym",
};

const woman: Profile = { ...man, sex: "female", heightCm: 165, weightKg: 70, experience: "novice", trainingDaysPerWeek: 3 };

// ------------------------------------------------------------------
// Composição corporal
// ------------------------------------------------------------------
test("Navy (cm) bate com a versão original em polegadas", () => {
  const inch = (cm: number) => cm / 2.54;
  // Homem
  const m = navyBodyFatPct("male", 178, 40, 87).value;
  const mInch = 86.01 * Math.log10(inch(87) - inch(40)) - 70.041 * Math.log10(inch(178)) + 36.76;
  assert.ok(Math.abs(m - mInch) < 0.6, `homem: ${m} vs ${mInch}`);
  // Mulher
  const f = navyBodyFatPct("female", 165, 33, 78, 100).value;
  const fInch = 163.205 * Math.log10(inch(78) + inch(100) - inch(33)) - 97.684 * Math.log10(inch(165)) - 78.387;
  assert.ok(Math.abs(f - fInch) < 0.6, `mulher: ${f} vs ${fInch}`);
});

test("Navy rejeita medidas impossíveis", () => {
  assert.throws(() => navyBodyFatPct("male", 180, 45, 40));
  assert.throws(() => navyBodyFatPct("female", 165, 33, 78));
});

test("Deurenberg: valores de referência (homem = 1, mulher = 0)", () => {
  // IMC 25, 30 anos: homem 1,2·25 + 0,23·30 − 10,8 − 5,4 = 20,7 ; mulher = 31,5
  const h = 180;
  const w = 25 * (h / 100) ** 2;
  assert.equal(deurenbergBodyFatPct("male", w, h, 30).value, 20.7);
  assert.equal(deurenbergBodyFatPct("female", w, h, 30).value, 31.5);
  assert.throws(() => deurenbergBodyFatPct("male", 70, 175, 16));
});

test("combinação: divergência entre foto e IMC gera alerta; fita pesa mais que foto", () => {
  const r = combineBodyFat([
    { method: "bmi_equation", percent: 26, measuredAt: "2026-01-01" },
    { method: "photo_ai", percent: 16, low: 13, high: 19, measuredAt: "2026-01-01" },
  ]);
  assert.ok(r.flags.some((f) => f.code === "BF_METHODS_DISAGREE"));
  const t = combineBodyFat([
    { method: "navy_tape", percent: 20, measuredAt: "2026-01-01" },
    { method: "photo_ai", percent: 24, measuredAt: "2026-01-01" },
  ]);
  assert.ok(t.percent < 22, `fita deveria pesar mais, veio ${t.percent}`);
});

test("sem fita sugere medir; sem foto avisa que a estimativa é só pelo IMC", () => {
  const comFoto = combineBodyFat([
    { method: "photo_ai", percent: 22, low: 18, high: 26, measuredAt: "2026-01-01" },
    { method: "bmi_equation", percent: 23, measuredAt: "2026-01-01" },
  ]);
  assert.ok(comFoto.flags.some((f) => f.code === "BF_TAPE_SUGGESTED"));
  assert.ok(comFoto.high - comFoto.low >= 5, "faixa deve refletir a incerteza");
  const semFoto = combineBodyFat([{ method: "bmi_equation", percent: 23, measuredAt: "2026-01-01" }]);
  assert.ok(semFoto.flags.some((f) => f.code === "BF_NO_PHOTO"));
});

test("razão cintura/estatura segue os cortes do NICE", () => {
  assert.equal(waistToHeight(85, 180).value.class, "healthy");
  assert.equal(waistToHeight(90, 180).value.class, "increased");
  assert.equal(waistToHeight(110, 180).value.class, "high");
});

// ------------------------------------------------------------------
// Energia
// ------------------------------------------------------------------
test("Mifflin-St Jeor: valores de referência", () => {
  assert.equal(mifflinStJeor("male", 80, 180, 30).value, 1780);
  assert.equal(mifflinStJeor("female", 60, 165, 30).value, 1320);
});

// ------------------------------------------------------------------
// Metas
// ------------------------------------------------------------------
test("weeksToTarget e rateForDeadline são inversas", () => {
  for (const [from, to, rate] of [
    [90, 80, 0.7],
    [70, 75, 0.3],
  ] as const) {
    const w = weeksToTarget(from, to, rate);
    assert.ok(Math.abs(rateForDeadline(from, to, w) - rate) < 0.011);
  }
});

test("emagrecimento: 25% → 15% em 8 semanas não é viável; prazo mínimo ~13 sem", () => {
  const comp = composition(90, 25);
  const a = assessGoal(man, comp, { type: "fat_loss", metric: "body_fat_pct", targetValue: 15, deadlineWeeks: 8 });
  assert.equal(a.status, "not_feasible_in_deadline");
  assert.equal(a.targetWeightKg, 79.4);
  assert.equal(a.minWeeks, 13);
  assert.ok((a.recommendedWeeks ?? 0) >= a.minWeeks!);
});

test("emagrecimento: mesma meta em 24 semanas é viável", () => {
  const comp = composition(90, 25);
  const a = assessGoal(man, comp, { type: "fat_loss", metric: "body_fat_pct", targetValue: 15, deadlineWeeks: 24 });
  assert.ok(a.status === "ok" || a.status === "aggressive");
  assert.ok(a.plannedRatePctPerWeek <= CONFIG.fatLossRatePctPerWeek.value.max);
});

test("metas inseguras são bloqueadas", () => {
  const compW = composition(70, 28);
  assert.equal(assessGoal(woman, compW, { type: "fat_loss", metric: "body_fat_pct", targetValue: 12, deadlineWeeks: 40 }).status, "unsafe");
  assert.equal(assessGoal(woman, compW, { type: "fat_loss", metric: "weight_kg", targetValue: 48, deadlineWeeks: 80 }).status, "unsafe");
});

test("meta já atingida ou na direção errada vira 'invalid' em vez de erro", () => {
  const comp = composition(80, 20);
  assert.equal(assessGoal(man, comp, { type: "fat_loss", metric: "body_fat_pct", targetValue: 22, deadlineWeeks: 10 }).status, "invalid");
  assert.equal(assessGoal(man, comp, { type: "fat_loss", metric: "weight_kg", targetValue: 95, deadlineWeeks: 10 }).status, "invalid");
  assert.equal(assessGoal(man, comp, { type: "muscle_gain", metric: "lean_mass_kg", targetValue: 60, deadlineWeeks: 10 }).status, "invalid");
});

test("ganho de massa magra respeita o ritmo máximo", () => {
  const comp = composition(75, 15);
  const p: Profile = { ...man, weightKg: 75 };
  const a = assessGoal(p, comp, { type: "muscle_gain", metric: "lean_mass_kg", targetValue: comp.fatFreeMassKg + 5, deadlineWeeks: 12 });
  assert.equal(a.status, "not_feasible_in_deadline");
  const b = assessGoal(p, comp, { type: "muscle_gain", metric: "lean_mass_kg", targetValue: comp.fatFreeMassKg + 2, deadlineWeeks: 40 });
  assert.equal(b.status, "ok");
  assert.ok(b.plannedRatePctPerWeek >= 0.25 && b.plannedRatePctPerWeek <= 0.5);
});

// ------------------------------------------------------------------
// Nutrição
// ------------------------------------------------------------------
test("macros fecham com as calorias e respeitam o piso", () => {
  const comp = composition(70, 30);
  const scr = screen(woman, healthy, "fat_loss");
  const a = assessGoal(woman, comp, { type: "fat_loss", metric: "weight_kg", targetValue: 60, deadlineWeeks: 20 });
  const plan = buildNutritionPlan(woman, comp, "fat_loss", a, 1500, scr)!;
  assert.ok(plan.kcal.value >= CONFIG.calorieFloor.value.female);
  const fromMacros = plan.proteinG.value * 4 + plan.fatG.value * 9 + plan.carbsG.value * 4;
  assert.ok(Math.abs(fromMacros - plan.kcal.value) <= 20, `macros ${fromMacros} vs kcal ${plan.kcal.value}`);
  assert.equal(plan.proteinG.value, Math.round(2.3 * comp.fatFreeMassKg));
});

test("déficit é limitado a 25% do gasto / 1000 kcal", () => {
  const comp = composition(120, 35);
  const p: Profile = { ...man, weightKg: 120 };
  const a = assessGoal(p, comp, { type: "fat_loss", metric: "weight_kg", targetValue: 100, deadlineWeeks: 17 });
  const plan = buildNutritionPlan(p, comp, "fat_loss", a, 3000, screen(p, healthy, "fat_loss"))!;
  assert.ok(3000 - plan.kcal.value <= 750 + 10);
  assert.ok(plan.flags.some((f) => f.code === "DEFICIT_CAPPED"));
});

test("superávit depende da experiência", () => {
  const comp = composition(75, 14);
  const p: Profile = { ...man, weightKg: 75, experience: "novice" };
  const a = assessGoal(p, comp, { type: "muscle_gain", metric: "weight_kg", targetValue: 80, deadlineWeeks: 30 });
  const plan = buildNutritionPlan(p, comp, "muscle_gain", a, 2600, screen(p, healthy, "muscle_gain"))!;
  assert.equal(plan.kcal.value, Math.round((2600 * 1.15) / 10) * 10);
});

test("resistência: carboidrato mínimo da carga de treino é garantido", () => {
  const comp = composition(65, 14);
  const p: Profile = { ...man, weightKg: 65, enduranceTrainingLoad: "high" };
  const a = assessGoal(p, comp, { type: "performance_endurance", metric: "custom", targetValue: 0, deadlineWeeks: 12 });
  const plan = buildNutritionPlan(p, comp, "performance_endurance", a, 2400, screen(p, healthy, "performance_endurance"))!;
  assert.ok(plan.carbsG.value >= 6 * 65 - 5, `carbs ${plan.carbsG.value}`);
});

// ------------------------------------------------------------------
// Treino
// ------------------------------------------------------------------
test("todos os grandes grupos ≥ 2x/semana de 2 a 6 dias", () => {
  for (let d = 2; d <= 6; d++) {
    const t = buildTrainingPlan({ ...man, trainingDaysPerWeek: d, sessionMinutes: 120 }, "muscle_gain");
    for (const m of ["chest", "back", "quads", "hamstrings_glutes", "shoulders"] as const) {
      assert.ok(t.frequencyByMuscle[m] >= 2, `${d} dias: ${m} = ${t.frequencyByMuscle[m]}x`);
    }
    assert.equal(chooseSplit(d).length, d);
  }
});

test("volume semanal dos grandes grupos atinge o alvo", () => {
  for (const goal of ["muscle_gain", "fat_loss", "health"] as const) {
    for (const exp of ["novice", "intermediate", "advanced"] as const) {
      const t = buildTrainingPlan({ ...man, experience: exp, sessionMinutes: 200 }, goal);
      const target = CONFIG.weeklySetsPerMuscle.value[goal][exp];
      for (const m of ["chest", "back", "quads", "hamstrings_glutes", "shoulders"] as const) {
        assert.ok(t.weeklySetsByMuscle[m] >= target, `${goal}/${exp}/${m}: ${t.weeklySetsByMuscle[m]} < ${target}`);
      }
    }
  }
});

test("treino cabe no tempo disponível sem descer abaixo da dose mínima", () => {
  const p: Profile = { ...woman, trainingDaysPerWeek: 3, sessionMinutes: 50, equipment: "home_dumbbells" };
  const t = buildTrainingPlan(p, "fat_loss");
  for (const s of t.sessions) assert.ok(s.estimatedMinutes <= 50, `${s.name}: ${s.estimatedMinutes} min`);
  const floor = CONFIG.weeklySetsPerMuscle.value.health[p.experience];
  for (const m of ["chest", "back", "quads", "hamstrings_glutes", "shoulders"] as const) {
    assert.ok(t.weeklySetsByMuscle[m] >= floor, `${m}: ${t.weeklySetsByMuscle[m]} < ${floor}`);
  }
  assert.ok(t.flags.some((f) => f.code === "VOLUME_REDUCED_FOR_TIME"));
});

test("viabilidade considera déficit máximo e piso calórico quando o gasto é informado", () => {
  const comp = composition(70, 34);
  const sem = assessGoal(woman, comp, { type: "fat_loss", metric: "weight_kg", targetValue: 62, deadlineWeeks: 16 });
  const com = assessGoal(woman, comp, { type: "fat_loss", metric: "weight_kg", targetValue: 62, deadlineWeeks: 16 }, 1600);
  // 1.600 kcal de gasto → déficit máx. = min(400, 1600−1200) = 400 kcal → ~0,52 %/sem para 70 kg
  assert.ok(com.plannedRatePctPerWeek <= 0.53, `planejado ${com.plannedRatePctPerWeek}`);
  assert.ok((com.minWeeks ?? 0) > (sem.minWeeks ?? 0));
  // Gasto colado no piso: sem espaço para déficit seguro
  const nada = assessGoal(woman, comp, { type: "fat_loss", metric: "weight_kg", targetValue: 62, deadlineWeeks: 30 }, 1230);
  assert.equal(nada.status, "not_feasible_in_deadline");
});

test("plano gerado nunca planeja ritmo maior que o déficit permite", () => {
  const plan = generatePlan({
    profile: { ...woman, weightKg: 72, activityLevel: "light" },
    bodyFatEstimates: [{ method: "photo_ai", percent: 34, low: 31, high: 37, measuredAt: "2026-10-01" }],
    goal: { type: "fat_loss", metric: "body_fat_pct", targetValue: 23, deadlineWeeks: 20 },
    screening: healthy,
    today: "2026-10-13",
  });
  assert.ok(plan.nutrition);
  assert.ok(!plan.flags.some((f) => f.code === "DEFICIT_CAPPED"), "a meta não deveria exigir déficit acima do limite");
});

test("sessão longa demais gera alerta", () => {
  const t = buildTrainingPlan({ ...man, trainingDaysPerWeek: 2, experience: "advanced", sessionMinutes: 45 }, "muscle_gain");
  assert.ok(t.flags.some((f) => f.code === "SESSION_TOO_LONG"));
});

// ------------------------------------------------------------------
// Check-in
// ------------------------------------------------------------------
function series(startKg: number, pctPerWeek: number, days: number): WeighIn[] {
  const out: WeighIn[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    out.push({ date: d, weightKg: startKg * (1 + (pctPerWeek / 100) * (i / 7)) });
  }
  return out;
}

test("check-in: perdendo devagar demais → reduz calorias (limitado a 250)", () => {
  const r = weeklyCheckin({
    sex: "male",
    direction: "lose",
    plannedRatePctPerWeek: 0.7,
    currentKcal: 2400,
    weighIns: series(90, -0.2, 21),
    adherencePct: 90,
    symptoms: {},
  });
  assert.equal(r.decision, "adjust");
  assert.equal(r.newKcal.value, 2400 - 250);
});

test("check-in: dentro da tolerância → mantém", () => {
  const r = weeklyCheckin({
    sex: "male",
    direction: "lose",
    plannedRatePctPerWeek: 0.7,
    currentKcal: 2400,
    weighIns: series(90, -0.65, 21),
    adherencePct: 90,
    symptoms: {},
  });
  assert.equal(r.decision, "keep");
});

test("check-in: perda rápida demais → aumenta calorias", () => {
  const r = weeklyCheckin({
    sex: "female",
    direction: "lose",
    plannedRatePctPerWeek: 0.7,
    currentKcal: 1500,
    weighIns: series(70, -2, 21),
    adherencePct: 100,
    symptoms: {},
  });
  assert.equal(r.decision, "adjust");
  assert.ok(r.newKcal.value > 1500);
});

test("check-in: poucos dados, adesão baixa e sintomas", () => {
  const base = { sex: "male" as const, direction: "lose" as const, plannedRatePctPerWeek: 0.7, currentKcal: 2400, adherencePct: 90 };
  assert.equal(weeklyCheckin({ ...base, weighIns: series(90, -0.7, 5), symptoms: {} }).decision, "insufficient_data");
  assert.equal(weeklyCheckin({ ...base, adherencePct: 50, weighIns: series(90, 0, 21), symptoms: {} }).decision, "improve_adherence_first");
  const r = weeklyCheckin({ ...base, weighIns: series(90, -0.7, 21), symptoms: { dizziness: true } });
  assert.equal(r.decision, "pause_deficit");
  assert.ok(r.newKcal.value > 2400);
});

test("check-in nunca desce abaixo do piso", () => {
  const r = weeklyCheckin({
    sex: "female",
    direction: "lose",
    plannedRatePctPerWeek: 1,
    currentKcal: 1250,
    weighIns: series(70, 0, 21),
    adherencePct: 95,
    symptoms: {},
  });
  assert.ok(r.newKcal.value >= 1200);
});

// ------------------------------------------------------------------
// Triagem e plano completo
// ------------------------------------------------------------------
test("triagem: menor de idade é bloqueado; gestante sem dieta numérica", () => {
  assert.equal(screen({ ...man, ageYears: 16 }, healthy, "fat_loss").status, "blocked");
  const g = screen(woman, { ...healthy, pregnantOrLactating: true }, "health");
  assert.equal(g.allowNumericDiet, false);
  assert.equal(g.status, "needs_professional");
});

test("plano completo: todas as fontes citadas existem e o aviso está presente", () => {
  const plan = generatePlan({
    profile: man,
    measurements: { neckCm: 40, waistCm: 95 },
    bodyFatEstimates: [{ method: "photo_ai", percent: 24, low: 20, high: 28, measuredAt: "2026-10-01" }],
    goal: { type: "fat_loss", metric: "body_fat_pct", targetValue: 16, deadlineWeeks: 20 },
    screening: healthy,
    today: "2026-10-13",
  });
  assert.ok(plan.nutrition && plan.training);
  assert.ok(plan.body?.methodsUsed.includes("navy_tape"));
  assert.ok(plan.body?.methodsUsed.includes("bmi_equation"));
  assert.ok(plan.sources.length > 5);
  for (const s of plan.sources) assert.ok(s.id in SOURCES);
  assert.match(plan.disclaimer, /não substitui/);
});

test("plano completo: menor de idade não processa fotos nem gera plano", () => {
  const plan = generatePlan({
    profile: { ...man, ageYears: 16 },
    bodyFatEstimates: [],
    goal: { type: "fat_loss", metric: "weight_kg", targetValue: 80, deadlineWeeks: 20 },
    screening: healthy,
    today: "2026-10-13",
  });
  assert.equal(plan.screening.status, "blocked");
  assert.equal(plan.body, undefined);
  assert.equal(plan.nutrition, null);
  assert.equal(plan.training, null);
});

test("plano só com dados do perfil (sem fotos ainda) funciona e avisa", () => {
  const plan = generatePlan({
    profile: man,
    bodyFatEstimates: [],
    goal: { type: "muscle_gain", metric: "weight_kg", targetValue: 95, deadlineWeeks: 30 },
    screening: healthy,
    today: "2026-10-13",
  });
  assert.deepEqual(plan.body?.methodsUsed, ["bmi_equation"]);
  assert.ok(plan.flags.some((f) => f.code === "BF_NO_PHOTO"));
  assert.ok(plan.nutrition);
});

test("plano completo não gera dieta quando a meta é insegura", () => {
  const plan = generatePlan({
    profile: woman,
    bodyFatEstimates: [{ method: "photo_ai", percent: 27, low: 24, high: 30, measuredAt: "2026-10-01" }],
    goal: { type: "fat_loss", metric: "body_fat_pct", targetValue: 10, deadlineWeeks: 30 },
    screening: healthy,
    today: "2026-10-13",
  });
  assert.equal(plan.goal?.status, "unsafe");
  assert.equal(plan.nutrition, null);
});

// ------------------------------------------------------------------
// Varredura: perfis aleatórios nunca produzem números absurdos
// ------------------------------------------------------------------
test("varredura de 2.000 perfis: macros não negativos, piso respeitado, fontes presentes", () => {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const goals = ["fat_loss", "muscle_gain", "recomposition", "health", "performance_strength", "performance_endurance"] as const;
  let plans = 0;
  for (let i = 0; i < 2000; i++) {
    const sex = pick(["male", "female"] as const);
    const heightCm = 150 + rnd() * 45;
    const weightKg = 45 + rnd() * 90;
    const bf = sex === "male" ? 8 + rnd() * 30 : 16 + rnd() * 30;
    const type = pick(goals);
    const profile: Profile = {
      sex,
      ageYears: 18 + Math.floor(rnd() * 60),
      heightCm,
      weightKg,
      activityLevel: pick(["sedentary", "light", "moderate", "active", "very_active"] as const),
      experience: pick(["novice", "intermediate", "advanced"] as const),
      trainingDaysPerWeek: 2 + Math.floor(rnd() * 5),
      sessionMinutes: 30 + Math.floor(rnd() * 90),
      equipment: pick(["gym", "home_dumbbells", "bodyweight"] as const),
      enduranceTrainingLoad: pick(["light", "moderate", "high", "extreme"] as const),
    };
    const comp = composition(weightKg, bf);
    let goal;
    if (type === "fat_loss") goal = { type, metric: "weight_kg" as const, targetValue: weightKg * (0.8 + rnd() * 0.15), deadlineWeeks: 4 + Math.floor(rnd() * 60) };
    else if (type === "muscle_gain") goal = { type, metric: "lean_mass_kg" as const, targetValue: comp.fatFreeMassKg + 0.5 + rnd() * 6, deadlineWeeks: 4 + Math.floor(rnd() * 80) };
    else goal = { type, metric: "custom" as const, targetValue: 0, deadlineWeeks: 12 };

    const plan = generatePlan({ profile, bodyFatEstimates: [{ method: "photo_ai", percent: bf, low: bf - 3, high: bf + 3, measuredAt: "2026-10-01" }], goal, screening: healthy, today: "2026-10-13" });
    if (!plan.nutrition) continue;
    plans++;
    const n = plan.nutrition;
    assert.ok(n.proteinG.value > 0 && n.fatG.value > 0 && n.carbsG.value >= 0, `macros negativos no perfil ${i}`);
    if (plan.goal?.direction === "lose") assert.ok(n.kcal.value >= CONFIG.calorieFloor.value[sex], `abaixo do piso no perfil ${i}`);
    const extreme = type === "performance_endurance" && profile.enduranceTrainingLoad === "extreme";
    assert.ok(n.kcal.value < 6000 || extreme, `kcal absurda no perfil ${i}: ${n.kcal.value}`);
    if (extreme) assert.ok(n.flags.some((f) => f.code === "EXTREME_LOAD_PROFESSIONAL"));
    for (const k of ["kcal", "proteinG", "fatG", "carbsG"] as const) assert.ok(n[k].sources.length > 0);
    assert.ok(plan.training && plan.training.sessions.length === Math.min(6, Math.max(2, profile.trainingDaysPerWeek)));
  }
  assert.ok(plans > 1500, `poucos planos gerados: ${plans}`);
});
