import { createHash, timingSafeEqual } from "node:crypto";
import Decimal from "decimal.js";
import type { PaymentEvent } from "./provider";
export type ApprovedGateway="OZOW"|"PAYFAST";
const required={OZOW:["OZOW_SITE_CODE","OZOW_PRIVATE_KEY","OZOW_API_KEY"],PAYFAST:["PAYFAST_MERCHANT_ID","PAYFAST_MERCHANT_KEY","PAYFAST_PASSPHRASE"]};
export function gatewayConfigured(gateway:ApprovedGateway){return !(process.env.NODE_ENV==="production"&&process.env.TEST_MODE_ENVIRONMENT!=="true"&&(gateway==="OZOW"?process.env.OZOW_TEST_MODE==="true":process.env.PAYFAST_SANDBOX==="true"))&&process.env[`${gateway}_ENABLED`]==="true"&&required[gateway].every(k=>Boolean(process.env[k])&&!/replace|placeholder|your[_-]/i.test(process.env[k]!));}
function secret(key:string){const value=process.env[key];if(!value)throw new Error("Payment gateway credentials are missing.");return value;}
const encode=(s:string)=>encodeURIComponent(s.trim()).replace(/[!'()*~]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g,"+");
export function payfastSignature(fields:Record<string,string>,passphrase:string){const data=Object.entries(fields).filter(([k,v])=>k!=="signature"&&v!=="").map(([k,v])=>`${k}=${encode(v)}`).join("&");return createHash("md5").update(`${data}&passphrase=${encode(passphrase)}`).digest("hex");}
export function ozowHash(values:string[],privateKey:string){return createHash("sha512").update((values.join("")+privateKey).toLowerCase()).digest("hex");}
function same(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function hostedFields(gateway:ApprovedGateway,input:{id:string;amount:string;email:string;orderId:string},base:string){
 if(!gatewayConfigured(gateway))throw new Error("This payment method is not available yet.");
 const back=`${base}/api/payments/return/${input.id}`,notify=`${base}/api/webhooks/${gateway.toLowerCase()}`;
 const resultUrl=(result:"success"|"cancelled"|"error")=>`${back}?result=${result}`;
 if(gateway==="PAYFAST"){
 const fields:Record<string,string>={merchant_id:secret("PAYFAST_MERCHANT_ID"),merchant_key:secret("PAYFAST_MERCHANT_KEY"),return_url:resultUrl("success"),cancel_url:resultUrl("cancelled"),notify_url:notify,email_address:input.email,m_payment_id:input.id,amount:new Decimal(input.amount).toFixed(2),item_name:`Innozanzi order ${input.orderId.slice(0,8)}`,payment_method:"cc"};
 fields.signature=payfastSignature(fields,secret("PAYFAST_PASSPHRASE"));return {url:process.env.PAYFAST_SANDBOX==="true"?"https://sandbox.payfast.co.za/eng/process":"https://www.payfast.co.za/eng/process",fields};
 }
 const fields:Record<string,string>={SiteCode:secret("OZOW_SITE_CODE"),CountryCode:"ZA",CurrencyCode:"ZAR",Amount:new Decimal(input.amount).toFixed(2),TransactionReference:input.id,BankReference:`IZ${input.id.replaceAll("-","").slice(0,16)}`,Optional1:"",Optional2:"",Optional3:"",Optional4:"",Optional5:"",Customer:input.email,CancelUrl:resultUrl("cancelled"),ErrorUrl:resultUrl("error"),SuccessUrl:resultUrl("success"),NotifyUrl:notify,IsTest:process.env.OZOW_TEST_MODE==="true"?"true":"false"};
 fields.HashCheck=ozowHash(Object.values(fields),secret("OZOW_PRIVATE_KEY"));return {url:"https://pay.ozow.com/",fields};
}
export async function verifyApprovedNotification(gateway:ApprovedGateway,body:string):Promise<PaymentEvent>{
 if(!gatewayConfigured(gateway))throw new Error("Gateway disabled");
 const params=new URLSearchParams(body);const data:Record<string,string>={};for(const[k,v]of params){if(k in data)throw new Error("Duplicate notification field");data[k]=v;}
 if(gateway==="PAYFAST"){
 if(data.merchant_id!==secret("PAYFAST_MERCHANT_ID")||!same(payfastSignature(data,secret("PAYFAST_PASSPHRASE")),data.signature??""))throw new Error("Invalid payment signature");
 const host=process.env.PAYFAST_SANDBOX==="true"?"sandbox.payfast.co.za":"www.payfast.co.za";
 const validation=await fetch(`https://${host}/eng/query/validate`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:Object.entries(data).filter(([k])=>k!=="signature").map(([k,v])=>`${k}=${encode(v)}`).join("&"),signal:AbortSignal.timeout(15000),cache:"no-store"});
 if(!validation.ok||(await validation.text()).trim()!=="VALID")throw new Error("Payment notification could not be verified");
 if(!data.pf_payment_id||!data.m_payment_id||!data.amount_gross||data.payment_status!=="COMPLETE")throw new Error("Payment is not complete");
 return {eventId:data.pf_payment_id,externalReference:data.m_payment_id,status:"PAID",amount:data.amount_gross,currency:"ZAR",raw:{providerId:data.pf_payment_id,fee:data.amount_fee,status:data.payment_status}};
 }
 const fields=["SiteCode","TransactionId","TransactionReference","Amount","Status","Optional1","Optional2","Optional3","Optional4","Optional5","CurrencyCode","IsTest","StatusMessage"];
 if(data.SiteCode!==secret("OZOW_SITE_CODE")||data.CurrencyCode!=="ZAR"||data.IsTest!==(process.env.OZOW_TEST_MODE==="true"?"true":"false")||!same(ozowHash(fields.map(k=>data[k]??""),secret("OZOW_PRIVATE_KEY")),data.Hash??""))throw new Error("Invalid payment signature");
 const query=new URLSearchParams({siteCode:secret("OZOW_SITE_CODE"),transactionId:data.TransactionId,isTest:data.IsTest});
 const response=await fetch(`https://api.ozow.com/GetTransaction?${query}`,{headers:{ApiKey:secret("OZOW_API_KEY"),Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("Payment verification unavailable");
 const rows=await response.json() as Array<Record<string,unknown>>;
 const row=Array.isArray(rows)?rows.find(r=>r.TransactionId===data.TransactionId):undefined;
 if(!row||row.SiteCode!==data.SiteCode||row.TransactionReference!==data.TransactionReference||row.CurrencyCode!=="ZAR"||row.Status!=="Complete"||data.Status!=="Complete"||!new Decimal(String(row.Amount)).equals(data.Amount))throw new Error("Payment verification mismatch");
 return {eventId:data.TransactionId,externalReference:data.TransactionReference,status:"PAID",amount:data.Amount,currency:"ZAR",raw:{providerId:data.TransactionId,status:data.Status}};
}
