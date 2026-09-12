export type CatalogueFacet = { name: string; slug: string };

export function mergeCatalogueFacets(...groups: CatalogueFacet[][]) {
  const facets = new Map<string, CatalogueFacet>();
  for (const facet of groups.flat()) {
    const key = facet.name.trim().toLocaleLowerCase("en-ZA");
    if (key && !facets.has(key)) facets.set(key, facet);
  }
  return [...facets.values()].sort((a, b) => a.name.localeCompare(b.name, "en-ZA"));
}
