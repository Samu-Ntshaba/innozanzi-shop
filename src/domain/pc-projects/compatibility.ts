export type CompatibilityProduct = { name: string; categoryPath?: string | null; specifications?: unknown };
export type CompatibilitySelection = Partial<Record<string, CompatibilityProduct>>;

const productText = (product?: CompatibilityProduct) => product ? `${product.name} ${product.categoryPath ?? ""} ${JSON.stringify(product.specifications ?? {})}`.toLowerCase() : "";
const socket = (product?: CompatibilityProduct) => productText(product).match(/\b(?:lga\s?\d{3,4}|am[45]|tr4|strx4)\b/i)?.[0]?.replace(/\s/g, "").toUpperCase();
const memory = (product?: CompatibilityProduct) => productText(product).match(/\bddr[345]\b/i)?.[0]?.toUpperCase();

export function pcPartCompatibility(stepKey: string, candidate: CompatibilityProduct, selected: CompatibilitySelection) {
  if (stepKey === "motherboard" && selected.cpu) { const a=socket(selected.cpu),b=socket(candidate); if(a&&b)return a===b?{kind:"ok" as const,label:`${a} socket match`}:{kind:"bad" as const,label:`${b} board does not match ${a} CPU`}; }
  if (stepKey === "cpu" && selected.motherboard) { const a=socket(candidate),b=socket(selected.motherboard); if(a&&b)return a===b?{kind:"ok" as const,label:`${b} socket match`}:{kind:"bad" as const,label:`${a} CPU does not match ${b} board`}; }
  if (stepKey === "memory" && selected.motherboard) { const a=memory(candidate),b=memory(selected.motherboard); if(a&&b)return a===b?{kind:"ok" as const,label:`${a} memory match`}:{kind:"bad" as const,label:`${a} memory does not match ${b} board`}; }
  if (stepKey === "motherboard" && selected.memory) { const a=memory(candidate),b=memory(selected.memory); if(a&&b)return a===b?{kind:"ok" as const,label:`${a} memory match`}:{kind:"bad" as const,label:`${a} board does not match ${b} memory`}; }
  return {kind:"unknown" as const,label:"Compatibility needs final verification"};
}
