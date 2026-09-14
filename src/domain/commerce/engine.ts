import Decimal from "decimal.js";
import { commerceSchema, DEFAULT_COMMERCE, type CommerceSettings } from "./config";

type Gateway = "OZOW" | "PAYFAST" | "EFT";

// Custom amounts are economic costs: include unrecoverable tax, exclude recoverable tax.
// Per-order costs are conservatively carried by every unit, matching existing delivery allocation.
export function costAllocations(settings: CommerceSettings) {
  let other = new Decimal(0), monthly = new Decimal(0), percent = new Decimal(0);
  for (const component of settings.customCosts) {
    if (!component.active) continue;
    if (component.basis === "MONTHLY") monthly = monthly.plus(component.amount);
    else if (component.basis === "PERCENT_NET") percent = percent.plus(component.amount);
    else other = other.plus(component.amount);
  }
  const operating = (settings.overheadAllocation === "PER_UNIT" ? new Decimal(settings.platformMonthly) : new Decimal(0))
    .plus(monthly).div(settings.expectedMonthlyUnits);
  return { operating, other, percent: percent.div(100) };
}

function inputs(cost: Decimal.Value, settings: CommerceSettings, gateway: Gateway) {
  const c = new Decimal(cost);
  if (!c.isFinite() || c.lte(0)) throw new Error("A positive supplier cost is required.");
  const band: "accessory" | "hardware" | "premium" = c.lt(settings.accessoryLimit) ? "accessory" : c.lte(settings.premiumLimit) ? "hardware" : "premium";
  const outputFactor = settings.vatRegistered ? new Decimal(settings.vatPercent).div(100).plus(1) : new Decimal(1);
  const inputFactor = settings.vatRegistered ? new Decimal(1) : new Decimal(settings.vatPercent).div(100).plus(1);
  const feeFactor = settings.vatRegistered ? new Decimal(1) : new Decimal(settings.feeVatPercent).div(100).plus(1);
  const supplier = c.mul(inputFactor);
  const delivery = new Decimal(settings.supplierDelivery).plus(settings.surcharge).mul(inputFactor);
  const handling = new Decimal(settings.handling).mul(inputFactor);
  const allocations = costAllocations(settings);
  const landed = supplier.plus(delivery).plus(handling).plus(allocations.operating).plus(allocations.other);
  const p = new Decimal(gateway === "EFT" ? 0 : gateway === "OZOW" ? settings.ozowPercent : settings.payfastPercent).div(100).mul(feeFactor);
  const fixed = new Decimal(gateway === "EFT" ? 0 : gateway === "OZOW" ? settings.ozowFixed : settings.payfastFixed).mul(feeFactor);
  const minFee = new Decimal(gateway === "EFT" ? 0 : gateway === "OZOW" ? settings.ozowMinimum : settings.payfastMinimum).mul(feeFactor);
  const payout = new Decimal(settings.payoutAllocation).mul(feeFactor);
  return { band, outputFactor, supplier, delivery, handling, allocations, landed, p, fixed, minFee, payout };
}

export function roundRetailPrice(price: Decimal.Value, rounding: CommerceSettings["rounding"]) {
  let gross = new Decimal(price).toDecimalPlaces(2, Decimal.ROUND_CEIL);
  if (rounding === "RAND") gross = gross.ceil();
  if (rounding === "99") gross = gross.minus("0.99").ceil().plus("0.99");
  return gross;
}

export function protectedPrice(cost: Decimal.Value, rawSettings: CommerceSettings = DEFAULT_COMMERCE, gateway: "OZOW" | "PAYFAST" = "PAYFAST") {
  const settings = commerceSchema.parse(rawSettings);
  const i = inputs(cost, settings, gateway);
  const g = new Decimal(settings[`${i.band}Margin`]).div(100), minimum = new Decimal(settings[`${i.band}Minimum`]);
  const r = new Decimal(settings.reservePercent).div(100), deductions = r.plus(i.allocations.percent), effective = i.p.mul(i.outputFactor);
  const marginDenominator = new Decimal(1).minus(g).minus(deductions).minus(effective);
  const minimumDenominator = new Decimal(1).minus(deductions).minus(effective);
  if (marginDenominator.lte(0) || minimumDenominator.lte(0)) throw new Error("Fees, costs, reserve and target margin leave no viable price.");
  const fixedCosts = i.landed.plus(i.fixed).plus(i.payout), minimumFeeCosts = i.landed.plus(i.minFee).plus(i.payout);
  const net = Decimal.max(
    fixedCosts.div(marginDenominator),
    fixedCosts.plus(minimum).div(minimumDenominator),
    minimumFeeCosts.div(new Decimal(1).minus(g).minus(deductions)),
    minimumFeeCosts.plus(minimum).div(new Decimal(1).minus(deductions)),
  );
  const gross = roundRetailPrice(net.mul(i.outputFactor), settings.rounding);
  const revenue = gross.div(i.outputFactor), fees = Decimal.max(gross.mul(i.p).plus(i.fixed), i.minFee).plus(i.payout);
  const reserve = revenue.mul(r), variableCosts = revenue.mul(i.allocations.percent);
  const contribution = revenue.minus(i.landed).minus(fees).minus(reserve).minus(variableCosts);
  return { gross, net: revenue, vat: gross.minus(revenue), landed: i.landed, supplier: i.supplier, delivery: i.delivery, handling: i.handling,
    operating: i.allocations.operating, otherCosts: i.allocations.other.plus(variableCosts), fees, reserve, contribution,
    grossProfit: revenue.minus(i.supplier), margin: contribution.div(revenue).mul(100), band: i.band, gateway, settings };
}

export function innozanziPrice(cost: Decimal.Value, settings: CommerceSettings) {
  const a = protectedPrice(cost, settings, "PAYFAST"), b = protectedPrice(cost, settings, "OZOW");
  const floor = a.gross.gte(b.gross) ? a : b;
  const candidate = floor.gross.mul(new Decimal(settings.competitiveAdjustment).div(100).plus(1));
  return { floor, gross: roundRetailPrice(Decimal.max(floor.gross, candidate), settings.rounding) };
}

export function priceSnapshot(result: ReturnType<typeof protectedPrice>) {
  return JSON.parse(JSON.stringify(result)) as Record<string, string | number | object>;
}

export function contributionAtPrice(cost: Decimal.Value, grossPrice: Decimal.Value, rawSettings: CommerceSettings, gateway: Gateway) {
  const settings = commerceSchema.parse(rawSettings), i = inputs(cost, settings, gateway);
  const gross = new Decimal(grossPrice);
  if (!gross.isFinite() || gross.lte(0)) throw new Error("A positive selling price is required.");
  const net = gross.div(i.outputFactor), fees = Decimal.max(gross.mul(i.p).plus(i.fixed), i.minFee).plus(i.payout);
  const reserve = net.mul(settings.reservePercent).div(100), variableCosts = net.mul(i.allocations.percent);
  const contribution = net.minus(i.landed).minus(fees).minus(reserve).minus(variableCosts);
  return { gateway, gross: gross.toString(), net: net.toString(), landed: i.landed.toString(), fees: fees.toString(), reserve: reserve.toString(),
    operating: i.allocations.operating.toString(), otherCosts: i.allocations.other.plus(variableCosts).toString(),
    contribution: contribution.toString(), margin: contribution.div(net).mul(100).toString() };
}
