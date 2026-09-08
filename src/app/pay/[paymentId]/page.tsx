import { notFound } from "next/navigation";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { hostedFields } from "@/integrations/payments/approved-gateways";
import { publicSiteUrl } from "@/lib/public-site-url";
import { formatZar } from "@/lib/money";
export default async function Page({params}:{params:Promise<{paymentId:string}>}){const ctx=await requireUser();const p=await prisma.payment.findFirst({where:{id:(await params).paymentId,status:"PENDING",order:{userId:ctx.user.id}},include:{order:true}});if(!p||!["OZOW","PAYFAST"].includes(p.provider))notFound();const form=hostedFields(p.provider as "OZOW"|"PAYFAST",{id:p.id,amount:p.amount.toString(),email:p.order.email,orderId:p.orderId},publicSiteUrl());return <main className="mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-bold">Pay securely with {p.provider==="OZOW"?"Ozow":"PayFast"}</h1><p className="my-5">Order {p.order.orderNumber} · {formatZar(p.amount)}</p><form method="POST" action={form.url}>{Object.entries(form.fields).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}<button className="rounded-lg bg-sky-700 px-5 py-3 font-bold text-white">Continue to secure payment</button></form><p className="mt-4 text-sm text-slate-500">Payment is confirmed only after verification with the payment provider.</p></main>}
