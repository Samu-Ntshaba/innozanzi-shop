import Decimal from "decimal.js";

export function resolveEffectivePrice(input:{systemPrice:Decimal.Value;floor:Decimal.Value;override?:{price:Decimal.Value;expiresAt?:Date|null}|null;now?:Date}){
  const systemPrice=new Decimal(input.systemPrice),floor=new Decimal(input.floor),now=input.now??new Date(),override=input.override;
  if(override&&(!override.expiresAt||override.expiresAt>now)){const price=new Decimal(override.price);if(price.gte(floor))return {price:price.toFixed(2),source:"TRADING_OVERRIDE" as const};}
  return {price:systemPrice.toFixed(2),source:"SYSTEM" as const};
}
