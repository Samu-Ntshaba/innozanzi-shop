import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncAllSuppliers, type SupplierProvider } from "../src/integrations/suppliers/registry";
import { refreshHomepageShowcase } from "../src/domain/catalogue/queries";
async function main(){const mode=process.argv.includes("--incremental")?"INCREMENTAL":"FULL";const providerArgument=process.argv.find(value=>value.startsWith("--provider="))?.split("=")[1]?.toUpperCase();const providers:SupplierProvider[]|undefined=providerArgument==="SYNTECH"||providerArgument==="PINNACLE"?[providerArgument]:undefined;const results=await syncAllSuppliers(mode,providers);console.log(JSON.stringify(results));if(results.some(r=>r.status==="SUCCEEDED")){try{console.log(JSON.stringify({homepageMerchandising:await refreshHomepageShowcase()}))}catch(error){console.error("Homepage merchandising refresh failed after supplier sync",error)}}if(results.some(r=>r.status==="FAILED"))process.exitCode=1;}
main().catch(()=>{console.error("Supplier sync failed. Inspect private feed-health records.");process.exitCode=1;}).finally(()=>prisma.$disconnect());
