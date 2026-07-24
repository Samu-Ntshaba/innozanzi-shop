import { Clock3, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { submitHelpDeskTicket } from "@/domain/communications/actions";
import { supportEmail, whatsappUrl } from "@/lib/support";
import type { Metadata } from "next";
export const metadata:Metadata={title:"Contact our business technology support team",description:"Contact Innozanzi for technology quotations, procurement advice, delivery, installation and ongoing support in South Africa.",alternates:{canonical:"/contact"}};

const input = "mt-1 min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-sky-700 focus:ring-1 focus:ring-sky-700";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const { submitted } = await searchParams;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-sky-800">Business technology support</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">Talk to people who can help.</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">From choosing the right solution to quotation, delivery, installation and after-sales support, our team stays with your business.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <aside className="space-y-4">
          <a className="group block rounded-lg border border-slate-200 bg-white p-6 transition hover:border-slate-400" href={whatsappUrl()} target="_blank" rel="noreferrer">
            <MessageCircle className="size-9 text-[#168a45]" />
            <p className="mt-5 text-sm font-medium text-slate-500">Fastest way to talk</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Chat on WhatsApp</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Start a conversation with our support team about products, quotations, delivery or technical assistance.</p>
            <span className="mt-5 inline-flex rounded-md bg-[#071b33] px-4 py-2 text-sm font-semibold text-white">Open WhatsApp →</span>
          </a>
          <div className="rounded-lg bg-[#071b33] p-6 text-white">
            <div className="flex gap-3"><Mail className="mt-0.5 size-5 text-sky-300" /><div><p className="text-xs text-slate-300">Email support</p><a className="font-bold text-sky-300 hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></div></div>
            <div className="mt-5 flex gap-3"><Clock3 className="mt-0.5 size-5 text-sky-300" /><div><p className="font-semibold">Your request becomes a tracked ticket</p><p className="mt-1 text-xs leading-5 text-slate-300">We email your reference immediately, so the conversation is not lost.</p></div></div>
            <div className="mt-5 flex gap-3"><ShieldCheck className="mt-0.5 size-5 text-sky-300" /><div><p className="font-semibold">Support beyond delivery</p><p className="mt-1 text-xs leading-5 text-slate-300">Ask about setup, deployment and after-sales assistance.</p></div></div>
            <Link className="mt-5 inline-block text-sm font-semibold underline" href="/how-to">Browse our how-to guides →</Link>
          </div>
        </aside>

        <section>
          {submitted ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-8">
              <h2 className="text-xl font-bold text-emerald-900">Conversation started</h2>
              <p className="mt-2 text-emerald-800">Your support reference is <strong>{submitted}</strong>. We emailed your confirmation and notified the Innozanzi support team.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className="rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white" href="/">Return home</Link>
                <a className="rounded-lg border border-emerald-700 px-4 py-2 font-bold text-emerald-800" href={whatsappUrl(`Hello Innozanzi, I am following up on support ticket ${submitted}.`)} target="_blank" rel="noreferrer">Continue on WhatsApp</a>
              </div>
            </div>
          ) : (
            <form action={submitHelpDeskTicket} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
              <div className="sm:col-span-2"><p className="text-sm font-medium text-sky-800">Start a support conversation</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">Tell us what your business needs</h2><p className="mt-2 text-sm text-slate-600">This message creates a help-desk ticket and emails both you and our support team.</p></div>
              <label>Name <span className="text-rose-600">*</span><input className={input} name="name" autoComplete="name" required /></label>
              <label>Email <span className="text-rose-600">*</span><input className={input} name="email" type="email" autoComplete="email" required /></label>
              <label>Phone<input className={input} name="phone" type="tel" autoComplete="tel" /></label>
              <label>Company<input className={input} name="companyName" autoComplete="organization" /></label>
              <label>What do you need help with?<select className={input} name="category" defaultValue="OTHER">{["QUOTATION", "ORDER", "PAYMENT", "PRODUCT", "TECHNICAL", "ACCOUNT", "OTHER"].map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}</select></label>
              <label>Subject <span className="text-rose-600">*</span><input className={input} name="subject" placeholder="A short summary" required /></label>
              <label className="sm:col-span-2">How can we help? <span className="text-rose-600">*</span><textarea className={`${input} min-h-36 py-3`} name="message" placeholder="Include a product, quotation or order reference where applicable." required /></label>
              <button className="min-h-12 rounded-md bg-[#071b33] px-5 font-semibold text-white hover:bg-slate-800 sm:col-span-2">Start support conversation</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
