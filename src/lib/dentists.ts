export interface ClinicDentist {
  id: string;
  name: string;
  createdAt: string;
}

/** Seeded into storage when no dentists exist yet. */
export const DEFAULT_DENTISTS: Omit<ClinicDentist, "createdAt">[] = [
  { id: "dr-chen", name: "Dr. Sarah Chen" },
  { id: "dr-patel", name: "Dr. Raj Patel" },
];

export function slugifyDentistName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "dentist";
}

export function findDentistName(dentists: ClinicDentist[], id: string | undefined): string | undefined {
  if (!id) return undefined;
  return dentists.find((dentist) => dentist.id === id)?.name;
}

export function isDentistIdValid(dentists: ClinicDentist[], id: string): boolean {
  return dentists.some((dentist) => dentist.id === id);
}
