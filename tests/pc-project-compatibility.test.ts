import { describe, expect, it } from "vitest";
import { pcPartCompatibility } from "@/domain/pc-projects/compatibility";

describe("PC project compatibility", () => {
  it("rejects a motherboard with the wrong CPU socket", () => expect(pcPartCompatibility("motherboard", {name:"B650 AM5 DDR5 motherboard"}, {cpu:{name:"Intel Core LGA1700 CPU"}}).kind).toBe("bad"));
  it("accepts matching CPU sockets", () => expect(pcPartCompatibility("cpu", {name:"Ryzen AM5 processor"}, {motherboard:{name:"B650 AM5 motherboard"}}).kind).toBe("ok"));
  it("rejects the wrong memory generation", () => expect(pcPartCompatibility("memory", {name:"16GB DDR4 memory"}, {motherboard:{name:"B650 DDR5 motherboard"}}).kind).toBe("bad"));
  it("does not claim certainty without evidence", () => expect(pcPartCompatibility("power", {name:"Power supply"}, {}).kind).toBe("unknown"));
});
