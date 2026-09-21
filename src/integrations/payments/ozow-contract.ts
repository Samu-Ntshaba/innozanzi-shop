import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { z } from "zod";

export type OzowTransaction={transactionId:string;siteCode:string;transactionReference:string;currencyCode:string;amount:string;status:string;isTest:string|undefined};

const transactionSchema=z.union([
  z.object({transactionId:z.string(),siteCode:z.string(),transactionReference:z.string(),currencyCode:z.string(),amount:z.union([z.string(),z.number()]),status:z.string(),isTest:z.union([z.string(),z.boolean()]).optional()}),
  z.object({TransactionId:z.string(),SiteCode:z.string(),TransactionReference:z.string(),CurrencyCode:z.string(),Amount:z.union([z.string(),z.number()]),Status:z.string(),IsTest:z.union([z.string(),z.boolean()]).optional()}),
]);

export function normalizeOzowBoolean(value:string){
  const normalized=value.trim().toLowerCase();
  if(normalized!=="true"&&normalized!=="false")throw new Error("Invalid Ozow test mode");
  return normalized as "true"|"false";
}

export function ozowTransactionRows(value:unknown):OzowTransaction[]{
  return z.array(transactionSchema).parse(Array.isArray(value)?value:[value]).map(row=>"transactionId" in row?{
    transactionId:row.transactionId,siteCode:row.siteCode,transactionReference:row.transactionReference,currencyCode:row.currencyCode,amount:String(row.amount),status:row.status,isTest:row.isTest===undefined?undefined:String(row.isTest),
  }:{
    transactionId:row.TransactionId,siteCode:row.SiteCode,transactionReference:row.TransactionReference,currencyCode:row.CurrencyCode,amount:String(row.Amount),status:row.Status,isTest:row.IsTest===undefined?undefined:String(row.IsTest),
  });
}

export function selectVerifiedOzowTransaction(rows:OzowTransaction[],expected:{siteCode:string;reference:string;currencyCode:string;isTest:"true"|"false"}){
  const matching=rows.filter(row=>row.siteCode===expected.siteCode&&row.transactionReference===expected.reference&&row.currencyCode===expected.currencyCode&&(row.isTest===undefined||normalizeOzowBoolean(row.isTest)===expected.isTest));
  if(matching.length>1)throw new Error("Multiple provider transactions match this payment reference");
  return matching[0];
}

type OzowNotificationFields={SiteCode:string;TransactionId:string;TransactionReference:string;Amount:string;Status:string;Optional1:string;Optional2:string;Optional3:string;Optional4:string;Optional5:string;CurrencyCode:string;IsTest:string;StatusMessage:string};
export function ozowNotificationHash(fields:OzowNotificationFields,privateKey:string){
  const values=[fields.SiteCode,fields.TransactionId,fields.TransactionReference,new Decimal(fields.Amount).toFixed(2),fields.Status,fields.Optional1,fields.Optional2,fields.Optional3,fields.Optional4,fields.Optional5,fields.CurrencyCode,fields.IsTest,fields.StatusMessage];
  return createHash("sha512").update((values.join("")+privateKey).toLowerCase()).digest("hex");
}
