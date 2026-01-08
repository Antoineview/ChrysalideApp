export const UE_NAMES: Record<string, string> = {
  PR: "Produire",
  AG: "Agir",
  CN: "Concevoir",
  PROJET: "Projet",
  PI: "Piloter",
  SH: "Sciences Humaines", // Added based on file prefix "SH" often seen in searches
};

export function getUeName(code: string): string {
  return UE_NAMES[code.toUpperCase()] || code;
}
