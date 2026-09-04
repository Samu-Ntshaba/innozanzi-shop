import { describe, expect, it } from "vitest";
import { estimateAIRequestCost, explicitBudget, isExplicitBuildRequest, isShoppingRequest, shoppingTarget } from "@/domain/ai-shopping/rules";

describe("AI shopping safeguards",()=>{
  it("allows concise technology shopping requests",()=>{expect(isShoppingRequest("Gaming laptop under R20k")).toBe(true);expect(isShoppingRequest("Build a PC for AutoCAD")).toBe(true)});
  it("rejects obvious general-purpose prompts before an OpenAI call",()=>{expect(isShoppingRequest("Write my history essay")).toBe(false);expect(isShoppingRequest("Who is the president?")).toBe(false)});
  it("estimates token cost from configurable per-million rates",()=>{expect(estimateAIRequestCost(1000,200,1,5)).toBeCloseTo(.002)});
  it("treats ordinary PC and computer requests as finished computers",()=>{expect(isExplicitBuildRequest("I need a PC under R50k")).toBe(false);expect(shoppingTarget("I need a PC under R50k")).toBe("COMPUTER");expect(shoppingTarget("office desktop under R10k")).toBe("DESKTOP_PC")});
  it("only enters build mode when the customer explicitly asks",()=>{expect(isExplicitBuildRequest("Build me a gaming PC under R25k")).toBe(true);expect(isExplicitBuildRequest("I need parts to build a computer")).toBe(true)});
  it("keeps laptops distinct from laptop accessories",()=>{expect(shoppingTarget("laptop under R5,000")).toBe("LAPTOP");expect(shoppingTarget("laptop bag")).toBe("LAPTOP_BAG");expect(shoppingTarget("notebook charger")).toBe("LAPTOP_CHARGER")});
  it("does not confuse component wording with a complete desktop",()=>{expect(shoppingTarget("desktop memory")).toBe("MEMORY");expect(shoppingTarget("computer case")).toBe("PC_CASE")});
  it("enforces customer budgets deterministically",()=>{expect(explicitBudget("laptop under R5,000")).toBe(5000);expect(explicitBudget("PC below 50k")).toBe(50000);expect(explicitBudget("budget of ZAR 12,500")).toBe(12500)});
});
