import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root=process.cwd();
const source=(file:string)=>fs.readFileSync(path.join(root,file),"utf8");

describe("Pricing & Trading production workspace",()=>{
  it("provides every approved operational route",()=>{
    for(const file of [
      "src/app/admin/pricing-trading/page.tsx",
      "src/app/admin/pricing/page.tsx",
      "src/app/admin/trading/page.tsx",
      "src/app/admin/trading/market/page.tsx",
      "src/app/admin/trading/sessions/page.tsx",
      "src/app/admin/trading/rules/page.tsx",
      "src/app/admin/trading/history/page.tsx",
      "src/app/admin/risk/page.tsx",
    ])expect(fs.existsSync(path.join(root,file)),file).toBe(true);
  });
  it("ships a resumable authenticated market worker",()=>{
    expect(source("src/app/api/cron/trading-scan/route.ts")).toContain("CRON_SECRET");
    expect(source("src/domain/trading/jobs.ts")).toContain("leaseUntil");
    expect(source("src/domain/trading/config.ts")).toContain("SUGGEST_ONLY");
  });
});
