const DAY_MS = 86_400_000;

export type HomepageShowcaseCandidate = {
  id: string;
  name: string;
  categoryPath: string | null;
  images: unknown[];
  stock: number;
  costPrice: { toString(): string } | string | number | null;
  recommendedRetail: { toString(): string } | string | number | null;
  promotionalPrice: { toString(): string } | string | number | null;
};

export function homepageShowcaseWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const localDay = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
  const weekdayFromMonday = (new Date(localDay).getUTCDay() + 6) % 7;
  const monday = localDay - weekdayFromMonday * DAY_MS;
  return { key: new Date(monday).toISOString().slice(0, 10), index: Math.floor(monday / (7 * DAY_MS)) };
}

function showcaseScore(product: HomepageShowcaseCandidate) {
  return Number(product.recommendedRetail?.toString() ?? product.costPrice?.toString() ?? 0) / 1000 + Math.min(12, product.images.length) * 4 + Math.min(10, product.stock) * .5 + (product.promotionalPrice ? 8 : 0);
}

export function premiumShowcase<T extends HomepageShowcaseCandidate>(products: T[], now = new Date()) {
  const ranked = [...products].sort((a, b) => showcaseScore(b) - showcaseScore(a));
  const { index } = homepageShowcaseWindow(now);
  const selectors = [
    (product: T) => /notebook|laptop/i.test(`${product.name} ${product.categoryPath}`),
    (product: T) => /gaming desktops|creator workstations|super computer/i.test(`${product.name} ${product.categoryPath}`),
    (product: T) => /monitor|display/i.test(`${product.name} ${product.categoryPath}`),
  ];
  const selected: T[] = [];
  selectors.forEach((selector, role) => {
    const pool = ranked.filter(product => !selected.some(item => item.id === product.id) && selector(product)).slice(0, 5);
    const match = pool[(index + role * 2) % pool.length];
    if (match) selected.push(match);
  });
  return [...selected, ...ranked.filter(product => !selected.some(item => item.id === product.id))].slice(0, 3);
}
