/**
 * Catálogo de fontes usadas pelo motor.
 *
 * Toda recomendação numérica que o motor devolve carrega uma lista de IDs
 * deste catálogo, para que o app possa mostrar "de onde vem este número"
 * (transparência exigida pela diretriz 1.4.1 da App Store e boa prática clínica).
 *
 * Itens marcados como `kind: "premissa"` NÃO vêm de uma fonte: são escolhas
 * do projeto, documentadas e ajustáveis. O app deve exibi-las como tal.
 */

export type SourceKind = "estudo" | "diretriz" | "lei" | "premissa";

export interface Source {
  id: string;
  kind: SourceKind;
  citation: string;
  url?: string;
}

export const SOURCES = {
  ISSN_PROTEIN_2017: {
    id: "ISSN_PROTEIN_2017",
    kind: "diretriz",
    citation:
      "Jäger R, et al. International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.",
    url: "https://doi.org/10.1186/s12970-017-0177-8",
  },
  MORTON_2018: {
    id: "MORTON_2018",
    kind: "estudo",
    citation:
      "Morton RW, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. Br J Sports Med. 2018;52(6):376-384.",
    url: "https://doi.org/10.1136/bjsports-2017-097608",
  },
  HELMS_2014: {
    id: "HELMS_2014",
    kind: "estudo",
    citation:
      "Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr. 2014;11:20.",
    url: "https://doi.org/10.1186/1550-2783-11-20",
  },
  IRAKI_2019: {
    id: "IRAKI_2019",
    kind: "estudo",
    citation:
      "Iraki J, Fitschen P, Espinar S, Helms E. Nutrition Recommendations for Bodybuilders in the Off-Season: A Narrative Review. Sports (Basel). 2019;7(7):154.",
    url: "https://doi.org/10.3390/sports7070154",
  },
  ACSM_RT_2026: {
    id: "ACSM_RT_2026",
    kind: "diretriz",
    citation:
      "American College of Sports Medicine. Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. Med Sci Sports Exerc. 2026.",
    url: "https://acsm.org/resistance-training-guidelines-update-2026/",
  },
  PELLAND_VOLUME: {
    id: "PELLAND_VOLUME",
    kind: "estudo",
    citation:
      "Pelland JC, et al. The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain. Sports Medicine (preprint SportRxiv 2024).",
    url: "https://sportrxiv.org/index.php/server/preprint/view/460",
  },
  SCHOENFELD_FREQ_2016: {
    id: "SCHOENFELD_FREQ_2016",
    kind: "estudo",
    citation:
      "Schoenfeld BJ, Ogborn D, Krieger JW. Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis. Sports Med. 2016;46(11):1689-1697.",
    url: "https://doi.org/10.1007/s40279-016-0543-8",
  },
  SCHOENFELD_LOAD_2021: {
    id: "SCHOENFELD_LOAD_2021",
    kind: "estudo",
    citation:
      "Schoenfeld BJ, Grgic J, Van Every DW, Plotkin DL. Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A Re-Examination of the Repetition Continuum. Sports (Basel). 2021;9(2):32.",
    url: "https://doi.org/10.3390/sports9020032",
  },
  ROBINSON_2024: {
    id: "ROBINSON_2024",
    kind: "estudo",
    citation:
      "Robinson ZP, et al. Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. Sports Med. 2024;54(9):2209-2231.",
    url: "https://doi.org/10.1007/s40279-024-02069-2",
  },
  SCHOENFELD_REST_2016: {
    id: "SCHOENFELD_REST_2016",
    kind: "estudo",
    citation:
      "Schoenfeld BJ, et al. Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men. J Strength Cond Res. 2016;30(7):1805-1812.",
  },
  IVERSEN_2021: {
    id: "IVERSEN_2021",
    kind: "estudo",
    citation:
      "Iversen VM, Norum M, Schoenfeld BJ, et al. Designing Time-Efficient Training Programs for Strength and Hypertrophy: A Narrative Review. Sports Med. 2021;51:2079-2095.",
  },
  MIFFLIN_1990: {
    id: "MIFFLIN_1990",
    kind: "estudo",
    citation:
      "Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247.",
    url: "https://doi.org/10.1093/ajcn/51.2.241",
  },
  FRANKENFIELD_2005: {
    id: "FRANKENFIELD_2005",
    kind: "estudo",
    citation:
      "Frankenfield D, Roth-Yousey L, Compher C. Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review. J Am Diet Assoc. 2005;105(5):775-789.",
    url: "https://doi.org/10.1016/j.jada.2005.02.005",
  },
  HALL_2011: {
    id: "HALL_2011",
    kind: "estudo",
    citation:
      "Hall KD, et al. Quantification of the effect of energy imbalance on bodyweight. Lancet. 2011;378(9793):826-837.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3880593/",
  },
  WHO_PA_2020: {
    id: "WHO_PA_2020",
    kind: "diretriz",
    citation:
      "World Health Organization. WHO guidelines on physical activity and sedentary behaviour. Geneva: WHO; 2020.",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK566048/",
  },
  DONNELLY_2009: {
    id: "DONNELLY_2009",
    kind: "diretriz",
    citation:
      "Donnelly JE, et al. ACSM Position Stand. Appropriate physical activity intervention strategies for weight loss and prevention of weight regain for adults. Med Sci Sports Exerc. 2009;41(2):459-471.",
    url: "https://pubmed.ncbi.nlm.nih.gov/19127177/",
  },
  ACSM_NUTRITION_2016: {
    id: "ACSM_NUTRITION_2016",
    kind: "diretriz",
    citation:
      "Thomas DT, Erdman KA, Burke LM. American College of Sports Medicine Joint Position Statement. Nutrition and Athletic Performance. Med Sci Sports Exerc. 2016;48(3):543-568.",
    url: "https://doi.org/10.1249/MSS.0000000000000852",
  },
  IOC_REDS_2023: {
    id: "IOC_REDS_2023",
    kind: "diretriz",
    citation:
      "Mountjoy M, et al. 2023 International Olympic Committee's (IOC) consensus statement on Relative Energy Deficiency in Sport (REDs). Br J Sports Med. 2023;57(17):1073-1097.",
    url: "https://pubmed.ncbi.nlm.nih.gov/37752011/",
  },
  NHLBI_LCD: {
    id: "NHLBI_LCD",
    kind: "diretriz",
    citation:
      "NHLBI/NIH. Dieta de baixa caloria para perda de peso: redução de 500–1.000 kcal/dia; planos típicos de 1.200–1.500 kcal (mulheres) e 1.500–1.800 kcal (homens).",
    url: "https://internet-prod.nhlbi.nih.gov/health/educational/wecan/portion/documents/CORESET4.pdf",
  },
  HODGDON_BECKETT_1984: {
    id: "HODGDON_BECKETT_1984",
    kind: "estudo",
    citation:
      "Hodgdon JA, Beckett MB. Prediction of percent body fat for U.S. Navy men (DTIC ADA143890) and women (DTIC ADA146456) from body circumferences and height. Naval Health Research Center, 1984.",
    url: "https://apps.dtic.mil/sti/pdfs/ADA143890.pdf",
  },
  NICE_WHTR: {
    id: "NICE_WHTR",
    kind: "diretriz",
    citation:
      "NICE. Overweight and obesity management (NG246) — Identifying and assessing overweight, obesity and central adiposity: classificação pela razão cintura/estatura.",
    url: "https://www.nice.org.uk/guidance/NG246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity",
  },
  DEURENBERG_1991: {
    id: "DEURENBERG_1991",
    kind: "estudo",
    citation:
      "Deurenberg P, Weststrate JA, Seidell JC. Body mass index as a measure of body fatness: age- and sex-specific prediction formulas. Br J Nutr. 1991;65(2):105-114.",
    url: "https://pubmed.ncbi.nlm.nih.gov/2043597/",
  },
  MAJMUDAR_2022: {
    id: "MAJMUDAR_2022",
    kind: "estudo",
    citation:
      "Majmudar MD, et al. Smartphone camera based assessment of adiposity: a validation study. NPJ Digit Med. 2022;5:79.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9243018/",
  },
  ACE_BODY_FAT: {
    id: "ACE_BODY_FAT",
    kind: "diretriz",
    citation:
      "American Council on Exercise (ACE). Categorias de % de gordura: homens — essencial <6, atleta 6–13, fitness 14–17, aceitável 18–24, obesidade ≥25; mulheres — essencial <14, atleta 14–20, fitness 21–24, aceitável 25–31, obesidade ≥32.",
  },
  WHO_BMI: {
    id: "WHO_BMI",
    kind: "diretriz",
    citation: "World Health Organization. Classificação do IMC em adultos (baixo peso < 18,5 kg/m²).",
  },
  GUIA_ALIMENTAR_2014: {
    id: "GUIA_ALIMENTAR_2014",
    kind: "diretriz",
    citation:
      "Ministério da Saúde. Guia Alimentar para a População Brasileira. 2ª ed. Brasília; 2014.",
  },
  PREMISSA_PROJETO: {
    id: "PREMISSA_PROJETO",
    kind: "premissa",
    citation:
      "Premissa do projeto (não derivada diretamente de fonte). Valor ajustável em engine/src/config.ts; deve ser revisado por nutricionista/profissional de educação física.",
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

export function describeSources(ids: readonly SourceId[]): Source[] {
  return [...new Set(ids)].map((id) => SOURCES[id]);
}
