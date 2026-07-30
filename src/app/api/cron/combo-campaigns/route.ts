import{timingSafeEqual}from"node:crypto";
import{prisma}from"@/lib/prisma";
import{scheduledComboState}from"@/domain/combos/lifecycle";

function allowed(request:Request){const expected=process.env.CRON_SECRET;if(!expected)return false;const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";const a=Buffer.from(expected),b=Buffer.from(supplied);return a.length===b.length&&timingSafeEqual(a,b)}
export async function POST(request:Request){
  if(!allowed(request))return Response.json({error:"Unauthorized"},{status:401});
  const now=new Date(),campaigns=await prisma.comboCampaign.findMany({where:{status:{in:["SCHEDULED","ACTIVE","PAUSED","SOLD_OUT"]}},include:{items:{include:{product:{include:{inventory:true}}}}}});
  let changed=0;
  for(const campaign of campaigns){
    const stock=campaign.items.every(item=>item.product.status==="PUBLISHED"&&item.product.inventory.reduce((n,x)=>n+Math.max(0,x.onHand-x.reserved),0)>=item.quantity);
    const next=scheduledComboState(campaign.status,campaign.startsAt,campaign.endsAt,stock,now);
    if(next===campaign.status)continue;
    await prisma.$transaction([
      prisma.comboCampaign.update({where:{id:campaign.id},data:{status:next}}),
      prisma.comboCampaignEvent.create({data:{campaignId:campaign.id,type:`STATUS_${next}`,channel:"AUTOMATION"}}),
      ...(campaign.marketingBlockId?[prisma.marketingBlock.update({where:{id:campaign.marketingBlockId},data:{status:next==="ACTIVE"?"PUBLISHED":"EXPIRED"}})]:[]),
    ]);
    changed++;
  }
  return Response.json({checked:campaigns.length,changed});
}
