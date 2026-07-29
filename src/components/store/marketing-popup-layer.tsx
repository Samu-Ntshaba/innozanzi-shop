import { getAuthContext } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { MarketingPopup, type StorePopup } from "./marketing-popup";

const fallback:StorePopup={
  id:"supplier-readiness",
  key:"supplier-readiness",
  heading:"Our live catalogue is being prepared",
  body:"We’re finalising product availability, images and catalogue details with our distribution partners. You can explore the store now, and live purchasing will open as soon as this process is complete.",
  buttonLabel:"Explore the catalogue",
  buttonLink:"/shop",
  audience:"ALL",
  pathMode:"ALL",
  paths:[],
  frequency:"ONCE_7_DAYS",
  tone:"INFO",
};

const distributorNeutralCopy=(value:string|null|undefined)=>
  value
    ?.replace(/\bour distribution partner,\s*Syntech\b/gi,"our distribution partners")
    .replace(/\bSyntech(?: Distribution)?\b/gi,"distribution partners")??null;

export async function MarketingPopupLayer(){
  const now=new Date();
  const [rows,auth]=await Promise.all([
    prisma.marketingBlock.findMany({where:{location:"POPUP",type:"POPUP",status:"PUBLISHED",isTestData:false,AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{endsAt:null},{endsAt:{gt:now}}]}]},orderBy:{displayOrder:"asc"}}),
    getAuthContext(),
  ]);
  const popups=rows.map(row=>{
    const content=row.content as Partial<StorePopup>;
    return {id:row.id,key:row.key,heading:distributorNeutralCopy(content.heading??row.title)??"Innozanzi update",body:distributorNeutralCopy(content.body)??"",buttonLabel:distributorNeutralCopy(content.buttonLabel),buttonLink:content.buttonLink??null,audience:content.audience??"ALL",pathMode:content.pathMode??"ALL",paths:Array.isArray(content.paths)?content.paths:[],frequency:content.frequency??"ONCE_SESSION",tone:content.tone??"INFO"} satisfies StorePopup;
  }).filter(item=>item.body);
  return <MarketingPopup popups={popups.length?[...popups,fallback]:[fallback]} isAuthenticated={Boolean(auth)}/>;
}
