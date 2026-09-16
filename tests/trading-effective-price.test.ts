import {describe,expect,it} from "vitest";
import {resolveEffectivePrice} from "@/domain/trading/effective-price";

describe("trading price override resolution",()=>{
  it("uses only an unexpired override that remains above the current floor",()=>{
    const now=new Date("2026-09-16T12:00:00Z");
    expect(resolveEffectivePrice({systemPrice:"1200",floor:"1000",override:{price:"1100",expiresAt:new Date("2026-09-17")},now}).source).toBe("TRADING_OVERRIDE");
    expect(resolveEffectivePrice({systemPrice:"1200",floor:"1150",override:{price:"1100",expiresAt:new Date("2026-09-17")},now}).price).toBe("1200.00");
    expect(resolveEffectivePrice({systemPrice:"1200",floor:"1000",override:{price:"1100",expiresAt:new Date("2026-09-15")},now}).price).toBe("1200.00");
  });
});
