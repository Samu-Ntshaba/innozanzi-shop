export const isShoppingRequest=(text:string)=>/\b(laptop|computer|pc|gaming|monitor|screen|keyboard|mouse|headset|printer|router|wifi|ssd|storage|ram|memory|gpu|graphics|cpu|processor|motherboard|power supply|psu|case|cooler|tech|tablet|phone|server|workstation|autocad|office|stream|build|component|accessor)/i.test(text);
export const estimateAIRequestCost=(input:number,output:number,inputRate:number,outputRate:number)=>(input/1_000_000)*inputRate+(output/1_000_000)*outputRate;

export type ShoppingTarget="LAPTOP"|"LAPTOP_BAG"|"LAPTOP_CHARGER"|"LAPTOP_STAND"|"DESKTOP_PC"|"COMPUTER"|"MONITOR"|"PRINTER"|"KEYBOARD"|"MOUSE"|"HEADSET"|"ROUTER"|"TABLET"|"SERVER"|"CPU"|"MOTHERBOARD"|"MEMORY"|"STORAGE"|"GRAPHICS_CARD"|"POWER_SUPPLY"|"PC_CASE"|"COOLING"|"GENERAL";
export const isExplicitBuildRequest=(text:string)=>/\b(build|assemble|configure|custom(?:-|\s)?build|choose (?:my|the) parts?|parts? (?:for|to build)|components? (?:for|to build))\b/i.test(text);
export function explicitBudget(text:string){const match=text.match(/(?:under|below|maximum|max|budget(?: of| is)?|up to|less than)\s*(?:r|zar)?\s*([\d,.]+)\s*(k)?\b/i)??text.match(/(?:r|zar)\s*([\d,.]+)\s*(k)?\b/i);if(!match)return null;const base=Number(match[1].replaceAll(",",""));if(!Number.isFinite(base)||base<=0)return null;return Math.round(base*(match[2]?1000:1))}
export function shoppingTarget(text:string):ShoppingTarget{
  if(/\b(laptop|notebook).*(bag|sleeve|backpack|case)\b|\b(bag|sleeve|backpack|case).*(laptop|notebook)\b/i.test(text))return"LAPTOP_BAG";
  if(/\b(laptop|notebook).*(charger|adapter)\b|\b(charger|adapter).*(laptop|notebook)\b/i.test(text))return"LAPTOP_CHARGER";
  if(/\b(laptop|notebook).*(stand|cooling pad)\b|\b(stand|cooling pad).*(laptop|notebook)\b/i.test(text))return"LAPTOP_STAND";
  if(/\b(laptop|notebook)\b/i.test(text))return"LAPTOP";
  if(/\b(cpu|processor)\b/i.test(text))return"CPU";
  if(/\bmotherboard\b/i.test(text))return"MOTHERBOARD";
  if(/\b(ram|memory)\b/i.test(text))return"MEMORY";
  if(/\b(ssd|hard drive|storage)\b/i.test(text))return"STORAGE";
  if(/\b(graphics card|gpu)\b/i.test(text))return"GRAPHICS_CARD";
  if(/\b(power supply|psu)\b/i.test(text))return"POWER_SUPPLY";
  if(/\b(pc case|computer case|chassis)\b/i.test(text))return"PC_CASE";
  if(/\b(cooler|cooling)\b/i.test(text))return"COOLING";
  if(/\b(all[ -]?in[ -]?one|aio)\b/i.test(text))return"DESKTOP_PC";
  if(/\b(desktop|desktop pc|gaming pc|office pc|workstation pc)\b/i.test(text))return"DESKTOP_PC";
  if(/\b(pc|computer)\b/i.test(text))return"COMPUTER";
  if(/\b(monitor|display|screen)\b/i.test(text))return"MONITOR";
  if(/\bprinter\b/i.test(text))return"PRINTER";
  if(/\bkeyboard\b/i.test(text))return"KEYBOARD";
  if(/\b(mouse|mice)\b/i.test(text))return"MOUSE";
  if(/\b(headset|headphones)\b/i.test(text))return"HEADSET";
  if(/\b(router|wi-?fi router)\b/i.test(text))return"ROUTER";
  if(/\btablet\b/i.test(text))return"TABLET";
  if(/\bserver\b/i.test(text))return"SERVER";
  return"GENERAL";
}

export const targetLabel=(target:ShoppingTarget)=>({LAPTOP:"laptop",LAPTOP_BAG:"laptop bag or sleeve",LAPTOP_CHARGER:"laptop charger",LAPTOP_STAND:"laptop stand",DESKTOP_PC:"complete desktop PC",COMPUTER:"complete computer",MONITOR:"monitor",PRINTER:"printer",KEYBOARD:"keyboard",MOUSE:"mouse",HEADSET:"headset",ROUTER:"router",TABLET:"tablet",SERVER:"server",CPU:"processor",MOTHERBOARD:"motherboard",MEMORY:"memory product",STORAGE:"storage product",GRAPHICS_CARD:"graphics card",POWER_SUPPLY:"power supply",PC_CASE:"PC case",COOLING:"cooling product",GENERAL:"matching product"})[target];
