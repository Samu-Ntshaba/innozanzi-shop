import { getAuthContext } from "@/domain/auth/session";
import { clearTestDatabaseBusinessData, generateCatalogue, generateCommercialJourney, generateCustomer, generateServiceAndRfq, testDataCounts } from "@/domain/test-mode/data";
import { isTestModeEnvironment } from "@/lib/test-mode";

async function authorised(){
  const context=await getAuthContext();
  return context?.isSuperAdministrator?context:null;
}

export async function GET(){
  const context=await authorised();
  if(!context)return Response.json({error:"Forbidden"},{status:403});
  return Response.json({testEnvironment:isTestModeEnvironment(),counts:await testDataCounts()},{headers:{"cache-control":"no-store"}});
}

export async function POST(request:Request){
  const context=await authorised();
  if(!context)return Response.json({error:"Forbidden"},{status:403});
  if(!isTestModeEnvironment())return Response.json({error:"Test data operations are blocked on the live environment."},{status:409});
  const {operation}=await request.json() as {operation?:string};
  try{
    if(operation==="clear")await clearTestDatabaseBusinessData();
    else if(operation==="catalogue")await generateCatalogue();
    else if(operation==="customer")await generateCustomer();
    else if(operation==="commercial")await generateCommercialJourney();
    else if(operation==="operations")await generateServiceAndRfq(context.user.id);
    else return Response.json({error:"Unknown operation"},{status:400});
    return Response.json({ok:true,operation,counts:await testDataCounts()});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Test Mode operation failed."},{status:500});
  }
}
