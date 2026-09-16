"use server";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {requirePermission} from "@/domain/auth/session";
import {approveDecision,rejectDecision} from "./decisions";
import {saveTradingRules} from "./settings";
import {tradingRulesSchema} from "./config";
import {startTradingSession} from "./sessions";

export async function createTradingSession(formData:FormData){const ctx=await requirePermission("trading.market.manage");const scanType=z.enum(["MONTHLY","ON_DEMAND"]).parse(formData.get("scanType"));await startTradingSession({scanType,createdById:ctx.user.id});revalidatePath("/admin/trading/sessions");}
export async function reviewTradingDecision(formData:FormData){const ctx=await requirePermission("trading.decisions.manage"),id=z.string().uuid().parse(formData.get("id")),action=z.enum(["APPROVE","REJECT"]).parse(formData.get("action"));if(action==="APPROVE")await approveDecision({id,actorId:ctx.user.id,expiresAt:formData.get("expiresAt")?z.coerce.date().parse(formData.get("expiresAt")):null});else await rejectDecision({id,actorId:ctx.user.id,reason:z.string().trim().min(3).max(500).parse(formData.get("reason"))});revalidatePath("/admin/pricing");revalidatePath("/admin/trading/market");}
export async function updateTradingRules(formData:FormData){const ctx=await requirePermission("trading.rules.manage");const rules=tradingRulesSchema.parse({monthlyEnabled:formData.get("monthlyEnabled")==="on",smartMode:formData.get("smartMode"),competitiveBand:formData.get("competitiveBand"),aboveMarketPercent:formData.get("aboveMarketPercent"),underpricedPercent:formData.get("underpricedPercent"),promotionOutlierPercent:formData.get("promotionOutlierPercent"),minimumRetailers:formData.get("minimumRetailers"),maxAgeDays:formData.get("maxAgeDays"),maxProductsPerSession:formData.get("maxProductsPerSession"),maxRequestsPerSession:formData.get("maxRequestsPerSession"),batchSize:formData.get("batchSize"),concurrency:formData.get("concurrency"),requestsPerMinute:formData.get("requestsPerMinute"),maxAttempts:formData.get("maxAttempts"),autoScopes:[]});await saveTradingRules(rules,ctx.user.id);revalidatePath("/admin/trading/rules");}
