import {prisma} from "@/lib/prisma";
import {DEFAULT_TRADING_RULES,tradingRulesSchema,type TradingRules} from "./config";
const KEY="commerce.trading.rules.v1";
export async function getTradingRules(){const row=await prisma.siteSetting.findUnique({where:{key:KEY}});return row?tradingRulesSchema.parse(row.value):DEFAULT_TRADING_RULES;}
export async function saveTradingRules(rules:TradingRules,actorId:string){const value=tradingRulesSchema.parse(rules);await prisma.$transaction([prisma.siteSetting.upsert({where:{key:KEY},update:{value},create:{key:KEY,value}}),prisma.auditLog.create({data:{actorId,action:"trading.rules.update",entityType:"SiteSetting",entityId:KEY,after:value}})]);return value;}
