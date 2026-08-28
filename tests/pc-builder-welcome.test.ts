import { describe,expect,it } from "vitest";
import { PC_BUILDER_RETURN_AFTER_MS,pcBuilderWelcomeKind } from "../src/domain/pc-projects/welcome-state";

describe("PC Builder welcome cadence",()=>{
  const now=Date.UTC(2026,7,28);
  it("welcomes a first-time visitor",()=>expect(pcBuilderWelcomeKind(null,now)).toBe("first"));
  it("stays silent during an active journey",()=>expect(pcBuilderWelcomeKind(now-7*24*60*60*1000,now)).toBeNull());
  it("welcomes someone back after a month away",()=>expect(pcBuilderWelcomeKind(now-PC_BUILDER_RETURN_AFTER_MS,now)).toBe("return"));
});
