import { prisma } from "@/lib/prisma";

export async function combosEnabled(){
  try{
    const settings=await prisma.comboCampaignSetting.findUnique({where:{id:"default"},select:{automationEnabled:true}});
    return settings?.automationEnabled===true;
  }catch(error){
    console.error("Combo visibility setting unavailable; keeping combos hidden",error);
    return false;
  }
}
