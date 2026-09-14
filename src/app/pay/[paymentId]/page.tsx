import Link from "next/link";
import { validateQuotationPrices } from "@/domain/commerce/quotation-guard";
import { paymentAmountError } from "@/domain/payments/limits";
import { CreditCard, Landmark, LoaderCircle, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { AutoSubmitPaymentForm } from "@/components/payments/auto-submit-payment-form";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { hostedFields } from "@/integrations/payments/approved-gateways";
import { publicSiteUrl } from "@/lib/public-site-url";
import { formatZar } from "@/lib/money";

export default async function Page({ params }: { params: Promise<{ paymentId: string }> }) {
  const ctx = await requireUser();
  const configuredPricing=await prisma.siteSetting.findUnique({where:{key:"commerce.pricing.v1"},select:{key:true}});
  if(!configuredPricing)return <main className="mx-auto max-w-lg px-4 py-12"><h1 className="text-2xl font-bold">Pricing approval pending</h1><p className="mt-4">Please contact support before making a payment. Your saved order has not been changed.</p><Link className="underline" href="/account/support">Contact support</Link></main>;
  const payment = await prisma.payment.findFirst({ where: { id: (await params).paymentId, status: "PENDING", provider: { in: ["PAYFAST", "OZOW"] }, order: { userId: ctx.user.id } }, include: { order: {include:{items:true}} } });
  if (!payment || (payment.provider !== "PAYFAST" && payment.provider !== "OZOW")) notFound();
  if(payment.order.paymentStatus!=="PENDING"||payment.order.status!=="AWAITING_PAYMENT")notFound();
  if(!payment.order.isTestData){
    try{await validateQuotationPrices(payment.order.items);}catch{return <main className="mx-auto max-w-lg px-4 py-12"><h1 className="text-2xl font-bold">Your order needs a price or availability review</h1><p className="mt-4">Supplier details have changed since checkout. No additional charge has been made. Please contact support with order {payment.order.orderNumber} before paying.</p><Link className="underline" href="/account/support">Contact support</Link></main>;}
  }
  const amountError = paymentAmountError(payment.provider, payment.amount);
  if (amountError) return <main className="mx-auto max-w-lg px-4 py-12"><h1 className="text-2xl font-bold">Choose another way to pay</h1><p role="alert" className="mt-4 text-slate-700">{amountError}</p><Link className="mt-6 inline-block rounded-lg bg-sky-700 px-5 py-3 font-bold text-white" href={`/account/orders/${payment.order.orderNumber}`}>Return to your order</Link></main>;
  const providerName = payment.provider === "PAYFAST" ? "PayFast" : "Ozow";
  const Icon = payment.provider === "PAYFAST" ? CreditCard : Landmark;
  const form = hostedFields(payment.provider, { id: payment.id, amount: payment.amount.toString(), email: payment.order.email, orderId: payment.orderId, name: ctx.user.name }, publicSiteUrl());
  return <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-4 py-12">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-sky-100 text-sky-800"><Icon className="size-7"/></span>
      <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-sky-800"><LoaderCircle className="size-4 animate-spin"/>Opening {providerName}…</div>
      <h1 className="mt-3 text-2xl font-black text-slate-950">Complete your secure payment</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Order {payment.order.orderNumber} · {formatZar(payment.amount)}. You should be redirected automatically.</p>
      <AutoSubmitPaymentForm action={form.url} fields={form.fields}/>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500"><LockKeyhole className="size-3.5"/>Use the button only if {providerName} does not open automatically.</p>
    </section>
  </main>;
}
