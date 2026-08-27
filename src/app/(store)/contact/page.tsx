import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, Clock3, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { submitHelpDeskTicket } from "@/domain/communications/actions";
import { supportEmail, whatsappUrl } from "@/lib/support";

export const metadata: Metadata = {
  title: "Contact Innozanzi customer support",
  description: "Contact Innozanzi for product help, orders, payments, delivery and technical support in South Africa.",
  alternates: { canonical: "/contact" },
};

const input = "mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-700/15";
const label = "text-sm font-semibold text-slate-800";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const { submitted } = await searchParams;
  return (
    <main>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[.14em] text-sky-700">Contact Innozanzi</p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">How can we help?</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Tell us what you need. We will route your request to the right person and keep the conversation in one tracked place.</p>
            </div>
            <p className="border-l-2 border-sky-600 pl-5 text-sm leading-6 text-slate-600">For product questions, orders, payments, delivery or technical support, use the form below.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8 lg:py-14">
        <div className="min-w-0">
          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
              <CheckCircle2 className="size-9 text-emerald-700" />
              <h2 className="mt-4 text-2xl font-bold text-slate-950">Your message is with our team</h2>
              <p className="mt-2 leading-7 text-slate-700">Your support reference is <strong>{submitted}</strong>. A confirmation has been emailed to you.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="rounded-lg bg-[#071b33] px-5 py-3 text-sm font-semibold text-white" href="/">Return home</Link>
                <a className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800" href={whatsappUrl(`Hello Innozanzi, I am following up on support ticket ${submitted}.`)} target="_blank" rel="noreferrer">Follow up on WhatsApp</a>
              </div>
            </div>
          ) : (
            <form action={submitHelpDeskTicket} className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <div className="border-b border-slate-200 pb-5 sm:col-span-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">Send us a message</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Required fields are marked with an asterisk. You will receive a reference number after submitting.</p>
              </div>
              <label className={label}>Name <span className="text-sky-700">*</span><input className={input} name="name" autoComplete="name" required /></label>
              <label className={label}>Email <span className="text-sky-700">*</span><input className={input} name="email" type="email" autoComplete="email" required /></label>
              <label className={label}>Phone <span className="font-normal text-slate-500">(optional)</span><input className={input} name="phone" type="tel" autoComplete="tel" /></label>
              <label className={label}>Company <span className="font-normal text-slate-500">(optional)</span><input className={input} name="companyName" autoComplete="organization" /></label>
              <label className={label}>Request type<select className={input} name="category" defaultValue="OTHER">{["ORDER", "PAYMENT", "PRODUCT", "DELIVERY", "TECHNICAL", "ACCOUNT", "OTHER"].map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}</select></label>
              <label className={label}>Subject <span className="text-sky-700">*</span><input className={input} name="subject" placeholder="A short summary" required /></label>
              <label className={`${label} sm:col-span-2`}>Message <span className="text-sky-700">*</span><textarea className={`${input} min-h-40 py-3`} name="message" placeholder="Include a product or order reference if you have one." required /></label>
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-xs leading-5 text-slate-500">Submitting this form creates a tracked support request and emails you a confirmation.</p>
                <button className="min-h-12 rounded-lg bg-[#071b33] px-6 font-semibold text-white transition hover:bg-slate-800">Send message</button>
              </div>
            </form>
          )}
        </div>

        <aside className="border-t border-slate-200 pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <h2 className="text-lg font-bold text-slate-950">Other ways to reach us</h2>
          <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            <a className="group flex gap-4 py-5" href={whatsappUrl()} target="_blank" rel="noreferrer">
              <MessageCircle className="mt-0.5 size-5 shrink-0 text-sky-700" />
              <div><p className="font-semibold text-slate-950">WhatsApp</p><p className="mt-1 text-sm leading-6 text-slate-600">Best for a quick question or ticket follow-up.</p><span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-sky-700">Start a chat <ArrowUpRight className="size-3.5" /></span></div>
            </a>
            <a className="flex gap-4 py-5" href={`mailto:${supportEmail}`}>
              <Mail className="mt-0.5 size-5 shrink-0 text-sky-700" />
              <div><p className="font-semibold text-slate-950">Email</p><p className="mt-1 break-all text-sm text-slate-600">{supportEmail}</p></div>
            </a>
            <div className="flex gap-4 py-5">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-sky-700" />
              <div><p className="font-semibold text-slate-950">Tracked assistance</p><p className="mt-1 text-sm leading-6 text-slate-600">Every form request receives a reference so it is easy to follow up.</p></div>
            </div>
          </div>
          <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-700" href="/how-to">Browse helpful guides <ArrowUpRight className="size-4" /></Link>
        </aside>
      </section>
    </main>
  );
}
