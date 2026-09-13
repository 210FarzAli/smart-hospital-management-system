/**
 * Drug Interaction Safety Retrieval
 * Based on documented interactions from:
 * https://www.emedicinehealth.com/which_medicines_should_not_be_taken_together/article_em.htm
 */

const SOURCE_URL =
  "https://www.emedicinehealth.com/which_medicines_should_not_be_taken_together/article_em.htm";

// Drug classification and alias map
const DRUG_CLASSES = {
  nsaid: [
    "nsaid",
    "nsaids",
    "ibuprofen",
    "advil",
    "motrin",
    "naproxen",
    "aleve",
    "diclofenac",
    "voltaren",
    "celecoxib",
    "celebrex",
    "indomethacin",
    "meloxicam",
    "mobic",
    "aspirin",
  ],
  ace_inhibitor: [
    "ace inhibitor",
    "ace inhibitors",
    "lisinopril",
    "enalapril",
    "ramipril",
    "captopril",
    "benazepril",
    "fosinopril",
  ],
  arb: [
    "arb",
    "arbs",
    "losartan",
    "cozaar",
    "valsartan",
    "diovan",
    "telmisartan",
    "micardis",
    "candesartan",
    "irbesartan",
  ],
  diuretic: [
    "diuretic",
    "diuretics",
    "furosemide",
    "lasix",
    "hydrochlorothiazide",
    "hctz",
    "spironolactone",
    "aldactone",
    "chlorthalidone",
  ],
  digoxin: ["digoxin", "lanoxin"],
  lithium: ["lithium", "eskalith", "lithobid"],
  methotrexate: ["methotrexate", "trexall"],
  antacid: [
    "antacid",
    "antacids",
    "calcium carbonate",
    "tums",
    "magnesium hydroxide",
    "milk of magnesia",
    "aluminum hydroxide",
    "gaviscon",
    "gelusil",
    "maalox",
    "mylanta",
  ],
  decongestant: [
    "decongestant",
    "decongestants",
    "pseudoephedrine",
    "sudafed",
    "phenylephrine",
    "dextromethorphan",
  ],
  maoi: [
    "maoi",
    "maois",
    "phenelzine",
    "nardil",
    "selegiline",
    "emsam",
    "tranylcypromine",
    "parnate",
    "isocarboxazid",
    "marplan",
  ],
  first_gen_antihistamine: [
    "first-generation antihistamine",
    "antihistamine",
    "diphenhydramine",
    "benadryl",
    "chlorpheniramine",
    "hydroxyzine",
    "atarax",
    "clemastine",
    "promethazine",
    "phenergan",
  ],
  cns_depressant: [
    "alcohol",
    "benzodiazepine",
    "benzodiazepines",
    "diazepam",
    "valium",
    "lorazepam",
    "ativan",
    "alprazolam",
    "xanax",
    "clonazepam",
    "klonopin",
    "opiate",
    "opioid",
    "opiates",
    "opioids",
    "morphine",
    "codeine",
    "tramadol",
    "ultram",
    "oxycodone",
    "hydrocodone",
    "fentanyl",
    "barbiturate",
    "barbiturates",
    "phenobarbital",
    "sedative",
    "sedatives",
  ],
  calcium_channel_blocker: [
    "calcium channel blocker",
    "ccb",
    "amlodipine",
    "norvasc",
    "felodipine",
    "plendil",
    "nifedipine",
    "procardia",
    "adalat",
    "verapamil",
    "calan",
    "diltiazem",
    "cardizem",
  ],
  statin: [
    "statin",
    "statins",
    "simvastatin",
    "zocor",
    "lovastatin",
    "mevacor",
    "atorvastatin",
    "lipitor",
    "rosuvastatin",
    "crestor",
    "pravastatin",
    "pravachol",
  ],
  grapefruit: ["grapefruit", "grapefruit juice"],
  st_johns_wort: ["st john's wort", "st. john's wort", "hypericum perforatum"],
  ginkgo: ["ginkgo", "ginkgo biloba"],
  kava: ["kava", "kava kava"],
  iron: ["iron", "ferrous sulfate", "iron supplement"],
  dairy: ["dairy", "milk", "cheese", "calcium-rich dairy"],
  ssri: [
    "ssri",
    "ssris",
    "sertraline",
    "zoloft",
    "fluoxetine",
    "prozac",
    "paroxetine",
    "paxil",
    "citalopram",
    "celexa",
    "escitalopram",
    "lexapro",
  ],
  snri: [
    "snri",
    "snris",
    "venlafaxine",
    "effexor",
    "duloxetine",
    "cymbalta",
    "desvenlafaxine",
  ],
  tramadol: ["tramadol", "ultram"],
  clarithromycin: ["clarithromycin", "biaxin"],
  warfarin: [
    "warfarin",
    "coumadin",
    "jantoven",
    "blood thinner",
    "anticoagulant",
    "heparin",
    "rivaroxaban",
    "xarelto",
    "apixaban",
    "eliquis",
  ],
  acetaminophen: ["acetaminophen", "tylenol", "paracetamol", "panadol"],
  tmp_smx: [
    "tmp/smx",
    "trimethoprim",
    "sulfamethoxazole",
    "bactrim",
    "septra",
    "cotrimoxazole",
  ],
  thyroid_hormone: ["thyroid hormone", "levothyroxine", "synthroid", "eltroxin"],
  ppi: [
    "ppi",
    "proton pump inhibitor",
    "omeprazole",
    "prilosec",
    "pantoprazole",
    "protonix",
    "esomeprazole",
    "nexium",
    "lansoprazole",
    "prevacid",
    "rabeprazole",
  ],
  h2_blocker: ["cimetidine", "tagamet", "ranitidine", "zantac", "famotidine", "pepcid"],
  tetracycline: ["tetracycline", "doxycycline", "minocycline"],
  fibrate: ["fibrate", "gemfibrozil", "lopid", "fenofibrate"],
  azole_antifungal: [
    "azole",
    "ketoconazole",
    "nizoral",
    "itraconazole",
    "sporanox",
    "fluconazole",
    "diflucan",
    "miconazole",
    "daktarin",
    "monistat",
    "voriconazole",
    "vfend",
    "posaconazole",
    "noxafil",
    "clotrimazole",
    "canesten",
    "lotrimin",
  ],
};

// Explicit documented interactions from eMedicineHealth article
const DOCUMENTED_INTERACTIONS = [
  {
    classes: ["nsaid", "ace_inhibitor"],
    severity: "danger",
    risk: "Renal Failure & Reduced Blood Pressure Control",
    details:
      "NSAIDs can reduce the antihypertensive effectiveness of ACE inhibitors and significantly increase the risk for acute renal failure.",
    source: "eMedicineHealth: Nonsteroidal anti-inflammatory drugs (NSAIDs) Interactions",
  },
  {
    classes: ["nsaid", "arb"],
    severity: "danger",
    risk: "Renal Failure & Reduced Blood Pressure Control",
    details:
      "NSAIDs can reduce the antihypertensive effectiveness of ARBs and increase the risk for kidney dysfunction and acute renal failure.",
    source: "eMedicineHealth: Nonsteroidal anti-inflammatory drugs (NSAIDs) Interactions",
  },
  {
    classes: ["nsaid", "diuretic"],
    severity: "danger",
    risk: "Decreased Diuretic Effect & Kidney Stress",
    details:
      "NSAIDs reduce the effectiveness of diuretics and significantly elevate the risk of kidney impairment.",
    source: "eMedicineHealth: Nonsteroidal anti-inflammatory drugs (NSAIDs) Interactions",
  },
  {
    classes: ["nsaid", "digoxin"],
    severity: "warning",
    risk: "Elevated Digoxin Levels & Digitalis Toxicity",
    details:
      "NSAIDs can impair renal clearance of digoxin, potentially causing toxic serum concentrations of cardiac medication.",
    source: "eMedicineHealth: Nonsteroidal anti-inflammatory drugs (NSAIDs) Interactions",
  },
  {
    classes: ["nsaid", "lithium"],
    severity: "danger",
    risk: "Severe Lithium Toxicity",
    details:
      "NSAIDs can decrease lithium excretion through the kidneys, leading to dangerously high blood lithium levels and toxicity.",
    source: "eMedicineHealth: Nonsteroidal anti-inflammatory drugs (NSAIDs) Interactions",
  },
  {
    classes: ["nsaid", "methotrexate"],
    severity: "danger",
    risk: "Severe Methotrexate Toxicity & Bone Marrow Suppression",
    details:
      "NSAIDs reduce tubular secretion and renal clearance of methotrexate, causing potentially fatal methotrexate toxicity.",
    source: "eMedicineHealth: Nonsteroidal anti-inflammatory drugs (NSAIDs) Interactions",
  },
  {
    classes: ["nsaid", "warfarin"],
    severity: "danger",
    risk: "Severe Internal Bleeding & Gastrointestinal Hemorrhage",
    details:
      "Combining warfarin (or blood thinners) with NSAIDs significantly elevates the risk of severe stomach bleeding and prolonged clotting time.",
    source: "eMedicineHealth: Warfarin Interactions",
  },
  {
    classes: ["antacid", "tetracycline"],
    severity: "warning",
    risk: "Severely Impaired Antibiotic Absorption",
    details:
      "Antacids increase gastric pH and bind minerals, preventing antibiotics like tetracycline/doxycycline from being absorbed into the blood.",
    source: "eMedicineHealth: Antacids Interactions",
  },
  {
    classes: ["antacid", "warfarin"],
    severity: "warning",
    risk: "Altered Blood Thinner Absorption",
    details:
      "Antacids can alter gastrointestinal absorption of blood thinners, destabilizing INR levels.",
    source: "eMedicineHealth: Antacids Interactions",
  },
  {
    classes: ["decongestant", "ace_inhibitor"],
    severity: "danger",
    risk: "Severe Blood Pressure Spikes (Hypertensive Crisis)",
    details:
      "Decongestants (e.g., pseudoephedrine, phenylephrine) cause vasoconstriction that directly counteracts antihypertensive blood pressure control.",
    source: "eMedicineHealth: Decongestants Interactions",
  },
  {
    classes: ["decongestant", "arb"],
    severity: "danger",
    risk: "Harmful Blood Pressure Elevation",
    details:
      "Cold remedies containing decongestants can cause harmful increases in blood pressure when taken with ARB medications.",
    source: "eMedicineHealth: Decongestants Interactions",
  },
  {
    classes: ["decongestant", "maoi"],
    severity: "danger",
    risk: "Potentially Fatal Hypertensive Crisis",
    details:
      "Combining sympathomimetic decongestants with MAO inhibitors can precipitate a severe, life-threatening hypertensive emergency.",
    source: "eMedicineHealth: Decongestants Interactions",
  },
  {
    classes: ["first_gen_antihistamine", "cns_depressant"],
    severity: "danger",
    risk: "Dangerous Central Nervous System & Respiratory Depression",
    details:
      "First-generation antihistamines (diphenhydramine, chlorpheniramine) have potent sedative actions that multiply CNS depressant effects of alcohol, opioids, and sedatives.",
    source: "eMedicineHealth: First-Generation Antihistamines Interactions",
  },
  {
    classes: ["grapefruit", "calcium_channel_blocker"],
    severity: "warning",
    risk: "Excessive Hypotension & Dizziness",
    details:
      "Grapefruit juice inhibits CYP3A4 metabolism of calcium-channel blockers (like amlodipine and felodipine), causing dangerously high drug levels and severe drops in blood pressure.",
    source: "eMedicineHealth: Certain Foods (Grapefruit Juice) Interactions",
  },
  {
    classes: ["grapefruit", "statin"],
    severity: "danger",
    risk: "Elevated Statin Levels & Risk of Rhabdomyolysis",
    details:
      "Grapefruit juice interferes with statin metabolism (especially simvastatin, lovastatin, and atorvastatin), raising drug concentrations and increasing muscle breakdown risk.",
    source: "eMedicineHealth: Certain Foods (Grapefruit Juice) Interactions",
  },
  {
    classes: ["dairy", "tetracycline"],
    severity: "warning",
    risk: "Inactivated Antibiotic Absorption",
    details:
      "Calcium-rich dairy products chelate with tetracyclines, drastically lessening antibiotic absorption and clinical effectiveness.",
    source: "eMedicineHealth: Calcium-rich Dairy Products Interactions",
  },
  {
    classes: ["st_johns_wort", "ssri"],
    severity: "danger",
    risk: "Life-Threatening Serotonin Syndrome",
    details:
      "St John's wort combined with SSRI or SNRI antidepressants causes excessive serotonergic accumulation, triggering toxic Serotonin Syndrome.",
    source: "eMedicineHealth: Herbal Products and Minerals (St John's Wort)",
  },
  {
    classes: ["ginkgo", "warfarin"],
    severity: "danger",
    risk: "Severe Hemorrhage Risk",
    details:
      "Ginkgo biloba inhibits platelet aggregation and blood clotting; combining it with anticoagulants or aspirin significantly raises bleeding risks.",
    source: "eMedicineHealth: Ginkgo Biloba Interactions",
  },
  {
    classes: ["iron", "tetracycline"],
    severity: "warning",
    risk: "Antibiotic Inactivation",
    details:
      "Ferrous sulfate (iron) binds tetracycline antibiotics, negating therapeutic blood absorption.",
    source: "eMedicineHealth: Iron (Ferrous Sulfate) Interactions",
  },
  {
    classes: ["ssri", "snri"],
    severity: "danger",
    risk: "Life-Threatening Serotonin Syndrome",
    details:
      "Combining two serotonergic agents (SSRIs and SNRIs) risks severe Serotonin Syndrome: agitation, hyperthermia, tremors, rigidity, and autonomic instability.",
    source: "eMedicineHealth: SSRIs and SNRIs Drug Interactions",
  },
  {
    classes: ["ssri", "tramadol"],
    severity: "danger",
    risk: "Severe Serotonin Syndrome & Seizure Risk",
    details:
      "Tramadol exhibits serotonergic activity; taking it alongside SSRIs or SNRIs can induce toxic Serotonin Syndrome.",
    source: "eMedicineHealth: Selective Serotonin Reuptake Inhibitors (SSRIs) Antidepressants",
  },
  {
    classes: ["statin", "fibrate"],
    severity: "danger",
    risk: "Severe Muscle Breakdown (Rhabdomyolysis)",
    details:
      "Statins combined with fibrates (especially gemfibrozil) greatly elevate the risk of rhabdomyolysis, muscle necrosis, and acute kidney failure.",
    source: "eMedicineHealth: Statins (HMG-CoA Reductase Inhibitors) Interactions",
  },
  {
    classes: ["statin", "azole_antifungal"],
    severity: "danger",
    risk: "Severe Muscle Breakdown (Rhabdomyolysis)",
    details:
      "Azole antifungals inhibit CYP3A4, causing toxic accumulation of statins and precipitating acute rhabdomyolysis.",
    source: "eMedicineHealth: Statins (HMG-CoA Reductase Inhibitors) Interactions",
  },
  {
    classes: ["clarithromycin", "calcium_channel_blocker"],
    severity: "danger",
    risk: "Severe Hypotension & Acute Renal Failure",
    details:
      "The macrolide antibiotic clarithromycin can cause profound low blood pressure (hypotension) and acute renal failure when taken with calcium-channel blockers like amlodipine or felodipine.",
    source: "eMedicineHealth: Clarithromycin Drug Interactions",
  },
  {
    classes: ["clarithromycin", "statin"],
    severity: "danger",
    risk: "Severe Rhabdomyolysis & Acute Kidney Injury",
    details:
      "Clarithromycin strongly inhibits statin elimination (particularly simvastatin, lovastatin, and atorvastatin), leading to high risk of muscle tissue breakdown.",
    source: "eMedicineHealth: Clarithromycin Drug Interactions",
  },
  {
    classes: ["tmp_smx", "ace_inhibitor"],
    severity: "danger",
    risk: "Fatal Hyperkalemia (High Potassium)",
    details:
      "Trimethoprim/sulfamethoxazole (Bactrim) combined with ACE inhibitors can cause dangerously high potassium levels (hyperkalemia), especially in elderly patients or those with impaired renal function.",
    source: "eMedicineHealth: Trimethoprim/Sulfamethoxazole (TMP/SMX) Interactions",
  },
  {
    classes: ["tmp_smx", "arb"],
    severity: "danger",
    risk: "Severe Hyperkalemia (High Potassium)",
    details:
      "Combining TMP/SMX with ARBs blocks potassium excretion, carrying a high risk of life-threatening cardiac arrhythmias from hyperkalemia.",
    source: "eMedicineHealth: Trimethoprim/Sulfamethoxazole (TMP/SMX) Interactions",
  },
  {
    classes: ["warfarin", "acetaminophen"],
    severity: "warning",
    risk: "Elevated INR & Increased Bleeding Risk",
    details:
      "High or regular doses of acetaminophen (Tylenol/Paracetamol) combined with warfarin can prolong clotting time and increase the international normalized ratio (INR), elevating bleeding hazards.",
    source: "eMedicineHealth: Warfarin Interactions",
  },
  {
    classes: ["thyroid_hormone", "ppi"],
    severity: "warning",
    risk: "Impaired Thyroid Hormone Absorption",
    details:
      "Proton pump inhibitors (PPIs) elevate stomach pH, interfering with levothyroxine absorption and potentially causing hypothyroidism.",
    source: "eMedicineHealth: Thyroid Hormone and Proton Pump Inhibitors Interactions",
  },
  {
    classes: ["thyroid_hormone", "iron"],
    severity: "warning",
    risk: "Binding & Blocked Thyroid Absorption",
    details:
      "Iron supplements bind thyroid hormone in the digestive tract, severely blocking its absorption.",
    source: "eMedicineHealth: Thyroid Hormone Interactions",
  },
  {
    classes: ["h2_blocker", "warfarin"],
    severity: "warning",
    risk: "Decreased Warfarin Metabolism & Bleeding",
    details:
      "H2 blockers like cimetidine can reduce liver metabolism of warfarin, increasing plasma levels and bleeding tendency.",
    source: "eMedicineHealth: Histamine2 (H2)-Receptor Antagonists Interactions",
  },
  {
    classes: ["warfarin", "azole_antifungal"],
    severity: "danger",
    risk: "Severe, Potentially Fatal Hemorrhage & Massive INR Spikes",
    details:
      "Azole antifungals (e.g., miconazole, fluconazole, ketoconazole, itraconazole, voriconazole) potently inhibit the hepatic CYP2C9 and CYP3A4 enzymes responsible for metabolizing warfarin. This combination markedly impairs warfarin clearance, leading to dangerously elevated International Normalized Ratio (INR) levels and severe or fatal internal hemorrhage.",
    source: "eMedicineHealth: Warfarin Drug Interactions & Antifungal Warnings",
  },
];

/**
 * Identify matching drug classes from a drug string or tokens
 */
function identifyClasses(input) {
  const text = String(input || "").toLowerCase().trim();
  const matched = new Set();

  for (const [cls, terms] of Object.entries(DRUG_CLASSES)) {
    for (const term of terms) {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(text)) {
        matched.add(cls);
        break;
      }
    }
  }

  return Array.from(matched);
}

/**
 * Check drug interactions across a list of medicine names or free-text query
 * @param {string[]|string} drugs
 * @returns {object} structured interaction report
 */
function checkDrugInteractions(drugs) {
  let drugList = [];
  if (Array.isArray(drugs)) {
    drugList = drugs.map((d) => String(d || "").trim()).filter(Boolean);
  } else if (typeof drugs === "string") {
    drugList = drugs
      .split(/[,+&]|\band\b|\bwith\b/i)
      .map((d) => d.trim())
      .filter(Boolean);
  }

  const allDetectedClasses = new Set();
  drugList.forEach((d) => {
    identifyClasses(d).forEach((c) => allDetectedClasses.add(c));
  });

  if (drugList.length <= 1 && typeof drugs === "string") {
    identifyClasses(drugs).forEach((c) => allDetectedClasses.add(c));
  }

  const foundInteractions = [];

  for (const rule of DOCUMENTED_INTERACTIONS) {
    const [c1, c2] = rule.classes;
    if (allDetectedClasses.has(c1) && allDetectedClasses.has(c2)) {
      foundInteractions.push({
        severity: rule.severity,
        risk: rule.risk,
        details: rule.details,
        source: rule.source,
        interactingClasses: [c1, c2],
      });
    }
  }

  if (foundInteractions.length > 0) {
    const hasDanger = foundInteractions.some((i) => i.severity === "danger");
    return {
      hasInteraction: true,
      severity: hasDanger ? "danger" : "warning",
      sourceUrl: SOURCE_URL,
      sourceCitation: "eMedicineHealth: Which Medicines Should Not Be Taken Together?",
      interactions: foundInteractions,
      summary: hasDanger
        ? "CRITICAL WARNING: High-risk drug interaction identified in the reference guide."
        : "CAUTION: Documented drug interaction identified in the reference guide.",
      recommendation:
        "Please STOP and consult your prescribing physician or hospital pharmacist immediately before combining these medications. Do not alter or stop prescribed medications without professional medical supervision.",
    };
  }

  return {
    hasInteraction: false,
    severity: "none",
    sourceUrl: SOURCE_URL,
    sourceCitation: "eMedicineHealth: Which Medicines Should Not Be Taken Together?",
    interactions: [],
    summary:
      "No critical drug-drug interaction was documented in our eMedicineHealth reference guide for the specified medications.",
    recommendation:
      "Important Note: This reference does not include every possible medication combination or individual patient factor. Always consult your doctor or hospital pharmacist before taking medications together.",
  };
}

module.exports = {
  SOURCE_URL,
  DRUG_CLASSES,
  DOCUMENTED_INTERACTIONS,
  identifyClasses,
  checkDrugInteractions,
};
