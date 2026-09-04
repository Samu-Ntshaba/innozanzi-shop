import { describe, expect, it } from "vitest";
import { estimateAIRequestCost, isShoppingRequest } from "@/domain/ai-shopping/rules";

describe("AI shopping safeguards",()=>{
  it("allows concise technology shopping requests",()=>{expect(isShoppingRequest("Gaming laptop under R20k")).toBe(true);expect(isShoppingRequest("Build a PC for AutoCAD")).toBe(true)});
  it("rejects obvious general-purpose prompts before an OpenAI call",()=>{expect(isShoppingRequest("Write my history essay")).toBe(false);expect(isShoppingRequest("Who is the president?")).toBe(false)});
  it("estimates token cost from configurable per-million rates",()=>{expect(estimateAIRequestCost(1000,200,1,5)).toBeCloseTo(.002)});
});
