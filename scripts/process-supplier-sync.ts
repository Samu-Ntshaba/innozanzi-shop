import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncAllSuppliers } from "../src/integrations/suppliers/registry";
async function main(){const results=await syncAllSuppliers();console.log(JSON.stringify(results));if(results.some(r=>r.status==="FAILED"))process.exitCode=1;}
main().catch(()=>{console.error("Supplier sync failed. Inspect private feed-health records.");process.exitCode=1;}).finally(()=>prisma.$disconnect());
