export type BuildAnalysis={personality?:string;gaming?:{label:string;rating:string}[];games?:{tier:string;titles:string[]}[]};
export const record=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
export function normalizeBuildAnalysis(value:unknown):BuildAnalysis|null{
  if(!record(value)||typeof value.personality!=="string")return null;
  const gaming=Array.isArray(value.gaming)?value.gaming.filter(record).flatMap(item=>typeof item.label==="string"&&typeof item.rating==="string"?[{label:item.label,rating:item.rating}]:[]):[];
  const games=Array.isArray(value.games)?value.games.filter(record).flatMap(item=>typeof item.tier==="string"&&Array.isArray(item.titles)?[{tier:item.tier,titles:item.titles.filter((title):title is string=>typeof title==="string")}]:[]):[];
  return{personality:value.personality,gaming,games};
}
