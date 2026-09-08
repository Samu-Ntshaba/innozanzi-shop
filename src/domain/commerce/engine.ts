import Decimal from "decimal.js";
import { DEFAULT_COMMERCE, type CommerceSettings } from "./config";
export function protectedPrice(cost:Decimal.Value,settings:CommerceSettings=DEFAULT_COMMERCE,gateway:"OZOW"|"PAYFAST"="PAYFAST") {
  const c=new Decimal(cost);if(!c.isFinite()||c.lte(0))throw new Error("A positive supplier cost is required.");
  const band=c.lt(settings.accessoryLimit)?"accessory":c.lte(settings.premiumLimit)?"hardware":"premium";
  const g=new Decimal(settings[`${band}Margin`]).div(100),minimum=new Decimal(settings[`${band}Minimum`]);
  const vat=new Decimal(settings.vatPercent).div(100),output=settings.vatRegistered?vat:new Decimal(0),inputFactor=settings.vatRegistered?new Decimal(1):vat.plus(1);
  const feeFactor=settings.vatRegistered?new Decimal(1):new Decimal(settings.feeVatPercent).div(100).plus(1);
  const p=new Decimal(gateway==="OZOW"?settings.ozowPercent:settings.payfastPercent).div(100).mul(feeFactor);
  const fixed=new Decimal(gateway==="OZOW"?settings.ozowFixed:settings.payfastFixed).plus(settings.payoutAllocation).mul(feeFactor);
  const minFee=new Decimal(gateway==="OZOW"?settings.ozowMinimum:settings.payfastMinimum).mul(feeFactor);
  const landed=c.plus(settings.supplierDelivery).plus(settings.surcharge).plus(settings.handling).mul(inputFactor);
  const r=new Decimal(settings.reservePercent).div(100),effective=p.mul(output.plus(1));
  const denominator=new Decimal(1).minus(g).minus(r).minus(effective);
  if(denominator.lte(0)||new Decimal(1).minus(g).minus(r).lte(0))throw new Error("Fees, reserve and target margin leave no viable price.");
  const net=Decimal.max(landed.plus(fixed).div(denominator),landed.plus(fixed).plus(minimum).div(new Decimal(1).minus(r).minus(effective)),landed.plus(minFee).plus(new Decimal(settings.payoutAllocation).mul(feeFactor)).div(new Decimal(1).minus(g).minus(r)),landed.plus(minFee).plus(new Decimal(settings.payoutAllocation).mul(feeFactor)).plus(minimum).div(new Decimal(1).minus(r)));
  let gross=net.mul(output.plus(1)).toDecimalPlaces(2,Decimal.ROUND_CEIL);
  if(settings.rounding==="RAND")gross=gross.ceil();
  if(settings.rounding==="99")gross=gross.minus(.99).ceil().plus(.99);
  const revenue=gross.div(output.plus(1));
  const fees=Decimal.max(gross.mul(p).plus(new Decimal(gateway==="OZOW"?settings.ozowFixed:settings.payfastFixed).mul(feeFactor)),minFee).plus(new Decimal(settings.payoutAllocation).mul(feeFactor));
  const reserve=revenue.mul(r),contribution=revenue.minus(landed).minus(fees).minus(reserve);
  return {gross,net:revenue,vat:gross.minus(revenue),landed,fees,reserve,contribution,margin:contribution.div(revenue).mul(100),band,gateway,settings};
}
export function priceSnapshot(result:ReturnType<typeof protectedPrice>){return JSON.parse(JSON.stringify(result)) as Record<string, string|number|object>;}

export function contributionAtPrice(cost:Decimal.Value,grossPrice:Decimal.Value,settings:CommerceSettings,gateway:"OZOW"|"PAYFAST"){
 const inputFactor=settings.vatRegistered?new Decimal(1):new Decimal(settings.vatPercent).div(100).plus(1),feeFactor=settings.vatRegistered?new Decimal(1):new Decimal(settings.feeVatPercent).div(100).plus(1);
 const gross=new Decimal(grossPrice),net=settings.vatRegistered?gross.div(new Decimal(settings.vatPercent).div(100).plus(1)):gross;
 const landed=new Decimal(cost).plus(settings.supplierDelivery).plus(settings.surcharge).plus(settings.handling).mul(inputFactor);
 const percent=new Decimal(gateway==="OZOW"?settings.ozowPercent:settings.payfastPercent).div(100),fixed=new Decimal(gateway==="OZOW"?settings.ozowFixed:settings.payfastFixed),minimum=new Decimal(gateway==="OZOW"?settings.ozowMinimum:settings.payfastMinimum);
 const fees=Decimal.max(gross.mul(percent).plus(fixed),minimum).plus(settings.payoutAllocation).mul(feeFactor),reserve=net.mul(settings.reservePercent).div(100),contribution=net.minus(landed).minus(fees).minus(reserve);
 return {gateway,gross:gross.toString(),net:net.toString(),landed:landed.toString(),fees:fees.toString(),reserve:reserve.toString(),contribution:contribution.toString(),margin:net.gt(0)?contribution.div(net).mul(100).toString():"0"};
}
