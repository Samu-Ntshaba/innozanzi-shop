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

export type CatalogueSearchDocument = {
  name: string;
  sku?: string | null;
  manufacturerSku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  category?: string | null;
  categoryPath?: string | null;
  description?: string | null;
};

const normalise = (value?: string | null) => value?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() ?? "";

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

export function catalogueSearchScore(product: CatalogueSearchDocument, query?: string) {
  const needle = normalise(query);
  if (!needle) return 0;
  const sku = normalise(product.sku), mpn = normalise(product.manufacturerSku), barcode = normalise(product.barcode);
  const name = normalise(product.name), brand = normalise(product.brand), category = normalise(product.category);
  const path = normalise(product.categoryPath), description = normalise(product.description);
  if ([sku, mpn, barcode].some(value => value && value === needle)) return 10_000;
  if (name === needle) return 9_000;
  if (name.startsWith(needle)) return 7_000;
  let score = name.includes(needle) ? 5_000 : 0;
  if (brand === needle) score += 2_000;
  else if (brand.includes(needle)) score += 900;
  if (category.includes(needle) || path.includes(needle)) score += 700;
  if ([sku, mpn, barcode].some(value => value.includes(needle))) score += 1_500;
  if (description.includes(needle)) score += 100;
  for (const term of catalogueSearchTerms(query).filter(term => term !== needle)) {
    const token = normalise(term);
    if (token && name.includes(token)) score += 180;
    else if (token && (category.includes(token) || path.includes(token))) score += 60;
  }
  return score;
}

/** Higher-resolution scoring for the small autocomplete candidate set. */
export function catalogueSuggestionScore(product: CatalogueSearchDocument, query?: string) {
  const needle = normalise(query);
  if (!needle) return 0;
  let score = catalogueSearchScore(product, query);
  const searchable = normalise([
    product.name, product.sku, product.manufacturerSku, product.barcode,
    product.brand, product.category, product.categoryPath,
  ].filter(Boolean).join(" "));
  const words = searchable.split(" ").filter(Boolean);
  const tokens = needle.split(" ").filter(Boolean);
  const brand = normalise(product.brand);
  let matched = 0;
  for (const token of tokens) {
    if (brand === token) score += 2_500;
    if (words.some(word => word.startsWith(token))) {
      score += 1_000;
      matched += 1;
      continue;
    }
    if (token.length >= 3 && words.some(word => editDistance(token, word.slice(0, token.length)) <= 1)) {
      score += 550;
      matched += 1;
    }
  }
  if (matched === tokens.length) score += 1_500;
  return score;
}

export function interleaveCatalogueGroups<T>(rows: T[], group: (row: T) => string) {
  const queues = new Map<string, T[]>();
  for (const row of rows) queues.set(group(row), [...(queues.get(group(row)) ?? []), row]);
  const result: T[] = [];
  while ([...queues.values()].some(queue => queue.length)) {
    for (const queue of queues.values()) {
      const next = queue.shift();
      if (next) result.push(next);
    }
  }
  return result;
}

export function fairCataloguePage(groups: Array<{ key: string; count: number }>, skip: number, take: number) {
  const remaining = new Map(groups.map(group => [group.key, group.count]));
  const skipped = new Map(groups.map(group => [group.key, 0]));
  const selected = new Map(groups.map(group => [group.key, 0]));
  const order: string[] = [];
  let position = 0;
  const end = skip + take;
  while (position < end && [...remaining.values()].some(count => count > 0)) {
    for (const group of groups) {
      const left = remaining.get(group.key) ?? 0;
      if (!left || position >= end) continue;
      remaining.set(group.key, left - 1);
      if (position < skip) skipped.set(group.key, (skipped.get(group.key) ?? 0) + 1);
      else {
        selected.set(group.key, (selected.get(group.key) ?? 0) + 1);
        order.push(group.key);
      }
      position += 1;
    }
  }
  return { order, windows: groups.map(group => ({ key: group.key, skip: skipped.get(group.key) ?? 0, take: selected.get(group.key) ?? 0 })).filter(window => window.take > 0) };
}
