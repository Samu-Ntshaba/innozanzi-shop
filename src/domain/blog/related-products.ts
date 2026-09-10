export type BlogSourceEntry = { title?: string; url?: string; kind?: string; catalogueReference?: string; image?: string | null };

export function blogSourceEntries(value: unknown) {
  const entries = Array.isArray(value) ? value.filter((entry): entry is BlogSourceEntry => Boolean(entry) && typeof entry === "object") : [];
  return {
    research: entries.filter(entry => entry.kind !== "PRODUCT"),
    products: entries.filter(entry => entry.kind === "PRODUCT" && entry.catalogueReference),
  };
}
