import { Landmark, LoaderCircle, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { AutoSubmitPaymentForm } from "@/components/payments/auto-submit-payment-form";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { hostedFields } from "@/integrations/payments/approved-gateways";
import { publicSiteUrl } from "@/lib/public-site-url";
import { formatZar } from "@/lib/money";

export default async function Page({ params }: { params: Promise<{ paymentId: string }> }) {
  const ctx = await requireUser();
  const payment = await prisma.payment.findFirst({ where: { id: (await params).paymentId, status: "PENDING", provider: "OZOW", order: { userId: ctx.user.id } }, include: { order: true } });
  if (!payment) notFound();
  const form = hostedFields("OZOW", { id: payment.id, amount: payment.amount.toString(), email: payment.order.email, orderId: payment.orderId }, publicSiteUrl());
  return <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-4 py-12">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-sky-100 text-sky-800"><Landmark className="size-7"/></span>
      <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-sky-800"><LoaderCircle className="size-4 animate-spin"/>Opening Ozow…</div>
      <h1 className="mt-3 text-2xl font-black text-slate-950">Complete your secure bank payment</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Order {payment.order.orderNumber} · {formatZar(payment.amount)}. You should be redirected automatically.</p>
      <AutoSubmitPaymentForm action={form.url} fields={form.fields}/>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500"><LockKeyhole className="size-3.5"/>Use the button only if Ozow does not open automatically.</p>
    </section>
  </main>;
}
