// Mapping of official hospital department names to patient-friendly terminology
// Rule: PATIENT-FRIENDLY NAME (Official Department Name)

const FRIENDLY_NAMES: Record<string, string> = {
  cardiology: "Heart & Heart Care (Cardiology)",
  dermatology: "Skin & Skin Care (Dermatology)",
  pediatrics: "Child Health (Pediatrics)",
  neurology: "Brain & Nerve Care (Neurology)",
  orthopedics: "Bone & Joint Care (Orthopedics)",
  gynecology: "Women's Health (Gynecology)",
  oncology: "Cancer Care (Oncology)",
  urology: "Urinary & Kidney Care (Urology)",
  ophthalmology: "Eye & Vision Care (Ophthalmology)",
  ent: "Ear, Nose & Throat (ENT)",
  gastroenterology: "Digestive & Liver Care (Gastroenterology)",
  pulmonology: "Chest & Respiratory Care (Pulmonology)",
  psychiatry: "Mental Health & Wellness (Psychiatry)",
  "general medicine": "General Health & Family Care (General Medicine)",
};

/**
 * Returns the patient-friendly label with official department in parentheses.
 * If already formatted or unknown, preserves the official name gracefully.
 */
export function getPatientFriendlyDepartmentName(officialName: string | null | undefined): string {
  if (!officialName) return "";
  const trimmed = officialName.trim();
  if (trimmed.includes("(") && trimmed.includes(")")) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (FRIENDLY_NAMES[lower]) {
    return FRIENDLY_NAMES[lower];
  }
  return `${trimmed} (${trimmed})`;
}
