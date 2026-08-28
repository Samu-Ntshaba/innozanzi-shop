import Decimal from "decimal.js";

export const MINIMUM_RETAIL_PROFIT_PERCENT = new Decimal(5);
export const DAILY_SPECIAL_DISCOUNT_PERCENT = new Decimal(5);

const roundUp = (value: Decimal) => value.toDecimalPlaces(2, Decimal.ROUND_UP);

export function minimumRetailPrice(cost: Decimal.Value) {
  return roundUp(new Decimal(cost).mul(new Decimal(1).plus(MINIMUM_RETAIL_PROFIT_PERCENT.div(100))));
}

export function supplierRetailPrice(input:{costPrice:Decimal.Value;recommendedRetail?:Decimal.Value|null;promotionalPrice?:Decimal.Value|null;promotionStartsAt?:Date|null;promotionEndsAt?:Date|null;special?:boolean;now?:Date}){
  const now=input.now??new Date();
  const standardFloor=minimumRetailPrice(input.costPrice);
  const promotionActive=Boolean(input.promotionalPrice&&new Decimal(input.promotionalPrice).lt(input.costPrice)&&(!input.promotionStartsAt||input.promotionStartsAt<=now)&&(!input.promotionEndsAt||input.promotionEndsAt>=now));
  const activeFloor=promotionActive?minimumRetailPrice(input.promotionalPrice!):standardFloor;
  const regular=Decimal.max(standardFloor,input.recommendedRetail??standardFloor).toDecimalPlaces(2);
  const promotionalRetail=promotionActive?activeFloor:null;
  const dailyDiscount=regular.mul(new Decimal(1).minus(DAILY_SPECIAL_DISCOUNT_PERCENT.div(100))).toDecimalPlaces(2,Decimal.ROUND_DOWN);
  const saleCandidate=promotionalRetail??(input.special?Decimal.max(activeFloor,dailyDiscount):null);
  const salePrice=saleCandidate&&saleCandidate.lt(regular)?saleCandidate:null;
  return{regularPrice:regular,salePrice,minimumPrice:activeFloor,promotionActive};
}

export function isDailySpecial(id:string,now=new Date()){
  const day=Math.floor(now.getTime()/86_400_000);let hash=day;for(const char of id)hash=(hash*31+char.charCodeAt(0))|0;return Math.abs(hash)%12===0;
}
