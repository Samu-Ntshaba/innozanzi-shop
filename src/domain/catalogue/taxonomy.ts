import type { Prisma } from "@/generated/prisma/client";

export type CatalogueCapability =
  | "LAPTOP" | "LAPTOP_BAG" | "LAPTOP_CHARGER" | "LAPTOP_STAND"
  | "DESKTOP_PC" | "COMPUTER" | "MONITOR" | "PRINTER" | "KEYBOARD"
  | "MOUSE" | "HEADSET" | "ROUTER" | "TABLET" | "SERVER" | "CPU"
  | "MOTHERBOARD" | "MEMORY" | "STORAGE" | "GRAPHICS_CARD"
  | "POWER_SUPPLY" | "PC_CASE" | "COOLING" | "GENERAL";

type TaxonomyProduct = { name?: string | null; category?: string | null; categoryPath?: string | null };

const text = (product: TaxonomyProduct) => `${product.name ?? ""} ${product.category ?? ""} ${product.categoryPath ?? ""}`.toLowerCase();

const patterns: Record<Exclude<CatalogueCapability, "GENERAL">, RegExp[]> = {
  LAPTOP: [/\b(notebook|laptop)s?\b/],
  LAPTOP_BAG: [/\b(notebook|laptop).*(bag|sleeve|backpack|case)\b/, /\b(bag|sleeve|backpack).*(notebook|laptop)\b/],
  LAPTOP_CHARGER: [/\b(notebook|laptop).*(charger|adapter)\b/, /notebook chargers?/],
  LAPTOP_STAND: [/\b(notebook|laptop).*(stand|cooling pad)\b/],
  DESKTOP_PC: [/desktop computers?/, /\baio computers?\b/, /\b(all.in.one|desktop pc)\b/],
  COMPUTER: [/\b(notebook|laptop)s?\b/, /desktop computers?/, /\baio computers?\b/],
  MONITOR: [/\bmonitors?\b/, /displays?\/monitors?/],
  PRINTER: [/\bprinters?\b/, /\bprinting\b/],
  KEYBOARD: [/\bkeyboards?\b/],
  MOUSE: [/\b(mice|mouse)\b/],
  HEADSET: [/\b(headsets?|headphones?)\b/],
  ROUTER: [/\brouters?\b/],
  TABLET: [/\btablets?\b/],
  SERVER: [/\bservers?\b/],
  CPU: [/components?\/cpu\b/, /\b(processors?|cpus?)\b/],
  MOTHERBOARD: [/\bmotherboards?\b/],
  MEMORY: [/components?\/memory\b/, /\bdesktop memory\b/, /\b(ddr[345]|dimm)\b/],
  STORAGE: [/solid state drives?/, /hard disk drives?/, /storage\/(internal|portable) ssd/, /\b(nvme|sata) ssd\b/],
  GRAPHICS_CARD: [/graphics cards?/, /\b(gpu|geforce|radeon)\b/],
  POWER_SUPPLY: [/power supplies?/, /\b(psu|[0-9]{3,4}w power supply)\b/],
  PC_CASE: [/components?\/chassis\b/, /\b(pc|computer) cases?\b/, /gaming chassis/],
  COOLING: [/components?\/cooling\b/, /\b(cpu|liquid) coolers?\b/],
};

export function productHasCapability(product: TaxonomyProduct, capability: CatalogueCapability) {
  if (capability === "GENERAL") return true;
  const value = text(product);
  if ((capability === "LAPTOP" || capability === "COMPUTER") && /\b(bag|sleeve|backpack|case|charger|adapter|stand|cooling pad)\b/.test(value)) return false;
  if (capability === "MONITOR" && /\b(arm|mount|stand|cable|adapter|protector)\b/.test(value)) return false;
  if (capability === "CPU" && /\b(cooler|cooling|fan|heatsink)\b/.test(value)) return false;
  return patterns[capability].some(pattern => pattern.test(value));
}

const contains = (value: string): Prisma.SupplierCatalogueProductWhereInput => ({
  OR: [
    { name: { contains: value, mode: "insensitive" } },
    { category: { contains: value, mode: "insensitive" } },
    { categoryPath: { contains: value, mode: "insensitive" } },
  ],
});

const terms: Record<Exclude<CatalogueCapability, "GENERAL">, string[]> = {
  LAPTOP: ["notebook", "laptop"], LAPTOP_BAG: ["laptop bag", "notebook bag", "laptop sleeve"],
  LAPTOP_CHARGER: ["notebook charger", "laptop charger"], LAPTOP_STAND: ["laptop stand", "cooling pad"],
  DESKTOP_PC: ["desktop computer", "AIO computer", "all-in-one"], COMPUTER: ["notebook", "laptop", "desktop computer", "AIO computer"],
  MONITOR: ["monitor"], PRINTER: ["printer", "printing"], KEYBOARD: ["keyboard"], MOUSE: ["mouse", "mice"],
  HEADSET: ["headset", "headphone"], ROUTER: ["router"], TABLET: ["tablet"], SERVER: ["server"],
  CPU: ["/CPU", "processor"], MOTHERBOARD: ["motherboard"], MEMORY: ["/Memory", "desktop memory", "DDR"],
  STORAGE: ["solid state drive", "hard disk drive", "internal SSD", "portable SSD", "NVMe SSD", "SATA SSD"],
  GRAPHICS_CARD: ["graphics card", "GeForce", "Radeon"], POWER_SUPPLY: ["power suppl", "PSU"],
  PC_CASE: ["/Chassis", "PC case", "computer case"], COOLING: ["/Cooling", "CPU cooler", "liquid cooler"],
};

export function supplierCapabilityWhere(capability: CatalogueCapability): Prisma.SupplierCatalogueProductWhereInput {
  if (capability === "GENERAL") return {};
  return { OR: terms[capability].map(contains) };
}
