function fit(value: unknown, maximum: number) {
  if (typeof value !== "string") return value;
  const clean = value.trim();
  if (clean.length <= maximum) return clean;
  const shortened = clean.slice(0, maximum - 1).replace(/\s+\S*$/, "").replace(/[\s,;:.-]+$/, "");
  return `${shortened || clean.slice(0, maximum - 1)}…`;
}

export function normaliseBlogDraft(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const draft = value as Record<string, unknown>;
  return {
    ...draft,
    title: fit(draft.title, 120),
    excerpt: fit(draft.excerpt, 320),
    content: fit(draft.content, 14_000),
    coverImageAlt: fit(draft.coverImageAlt, 220),
    metaTitle: fit(draft.metaTitle, 70),
    metaDescription: fit(draft.metaDescription, 170),
  };
}
