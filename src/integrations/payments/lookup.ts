import { createHash } from "node:crypto";
import { gatewayConfigured, type ApprovedGateway } from "./approved-gateways";
import type { PaymentEvent } from "./provider";
import { ozowTransactionRows, selectVerifiedOzowTransaction } from "./ozow-contract";

type Lookup={event?:PaymentEvent;reason:string;providerTransactionId?:string};
const encode=(value:string)=>encodeURIComponent(value).replace(/[!'()*~]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g,"+");

// The history API returns CSV, including quoted commas and escaped quotes.
export function historyRows(csv:string):Record<string,string>[] {
  const rows:string[][]=[];let row:string[]=[],value="",quoted=false;
  for(let i=0;i<csv.length;i++){
    const c=csv[i];
    if(c==='"'){if(quoted&&csv[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(c===","&&!quoted){row.push(value);value="";}
    else if(c==="\n"&&!quoted){row.push(value.replace(/\r$/,""));rows.push(row);row=[];value="";}
    else value+=c;
  }
  if(quoted)throw new Error("Invalid provider history format");
  if(value||row.length){row.push(value.replace(/\r$/,""));rows.push(row);}
  const headers=rows.shift();
  if(!headers?.includes("M Payment ID")||!headers.includes("PF Payment ID"))throw new Error("Invalid provider history format");
  return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}

export async function lookupPendingPayment(provider:ApprovedGateway,reference:string,createdAt:Date):Promise<Lookup>{
  if(!gatewayConfigured(provider))return {reason:"GATEWAY_UNAVAILABLE"};
  if(provider==="OZOW"){
    const query=new URLSearchParams({siteCode:process.env.OZOW_SITE_CODE!,transactionReference:reference,isTest:process.env.OZOW_TEST_MODE==="true"?"true":"false"});
    const response=await fetch(`https://api.ozow.com/GetTransactionByReference?${query}`,{headers:{ApiKey:process.env.OZOW_API_KEY!,Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error("Provider lookup unavailable");
    const rows=ozowTransactionRows(await response.json());
    let row;try{row=selectVerifiedOzowTransaction(rows,{siteCode:process.env.OZOW_SITE_CODE!,reference,currencyCode:"ZAR",isTest:process.env.OZOW_TEST_MODE==="true"?"true":"false"});}catch(error){if(error instanceof Error&&/multiple/i.test(error.message))return {reason:"MULTIPLE_PROVIDER_TRANSACTIONS"};throw error;}
    if(!row)return {reason:"NO_PROVIDER_CONFIRMATION"};
    const status=row.status==="Complete"?"PAID":row.status==="Cancelled"?"CANCELLED":row.status==="Error"?"FAILED":undefined;
    if(!status)return {reason:"PROVIDER_PROCESSING"};
    if(!row.transactionId||row.amount==null)throw new Error("Incomplete provider evidence");
    return {reason:"PROVIDER_VERIFIED",event:{eventId:row.transactionId,externalReference:reference,status,amount:row.amount,currency:"ZAR",raw:{providerId:row.transactionId,verification:"OZOW_REFERENCE_API"}}};
  }
  // History identifies a transaction for escalation. Its ledger rows do not carry
  // the signed COMPLETE notification, so they must never alone authorise fulfilment.
  const localDate=(date:Date)=>new Date(date.getTime()+2*60*60_000).toISOString().slice(0,10);
  for(const date of new Set([localDate(createdAt),localDate(new Date())])){
    for(let offset=0;offset<10000;offset+=1000){
      const query={date,offset:String(offset),limit:"1000"};
      const headers:Record<string,string>={"merchant-id":process.env.PAYFAST_MERCHANT_ID!,version:"v1",timestamp:new Date().toISOString().slice(0,19)+"+0000"};
      const fields:Record<string,string>={...query,...headers,passphrase:process.env.PAYFAST_PASSPHRASE!};
      headers.signature=createHash("md5").update(Object.keys(fields).sort().map(key=>`${key}=${encode(fields[key])}`).join("&")).digest("hex");
      const parameters=new URLSearchParams(query);if(process.env.PAYFAST_SANDBOX==="true")parameters.set("testing","true");
      const response=await fetch(`https://api.payfast.co.za/transactions/history/daily?${parameters}`,{headers,cache:"no-store",signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error("Provider lookup unavailable");
      const csv=await response.text();if(csv.length>2_000_000)throw new Error("Provider history too large");
      const rows=historyRows(csv),matches=rows.filter(row=>row["M Payment ID"]===reference);
      if(matches.length)return {reason:"PAYFAST_ITN_RESEND_REQUIRED",providerTransactionId:matches[0]["PF Payment ID"]};
      if(rows.length<1000)break;
      if(offset===9000)return {reason:"PROVIDER_HISTORY_REVIEW_REQUIRED"};
    }
  }
  return {reason:"NO_PROVIDER_CONFIRMATION"};
}
