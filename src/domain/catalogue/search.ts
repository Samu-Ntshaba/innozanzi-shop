const synonymGroups = [
  ["laptop", "notebook"], ["computer", "desktop", "pc"], ["screen", "display", "monitor"],
  ["gpu", "graphics", "graphics card"], ["ram", "memory"], ["ssd", "solid state drive", "storage"],
  ["psu", "power supply"], ["wifi", "wi-fi", "wireless"], ["headphone", "headphones", "headset"],
  ["mouse", "mice"], ["ups", "inverter", "backup power"], ["printer", "printing"],
] as const;

export function catalogueSearchTerms(value?: string) {
  const query = value?.trim().toLowerCase().replace(/[^a-z0-9+.-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!query) return [];
  const tokens = query.split(" ").filter(token => token.length > 1);
  const terms = new Set([query, ...tokens]);
  for (const group of synonymGroups) {
    if (group.some(term => query.includes(term))) group.forEach(term => terms.add(term));
  }
  return [...terms];
}
