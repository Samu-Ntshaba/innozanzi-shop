import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Headphones, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const authInputClass="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100";

export function AuthShell({eyebrow,title,description,children,footer}:{eyebrow:string;title:string;description:string;children:ReactNode;footer:ReactNode}){
  return <main className="min-h-screen lg:grid lg:grid-cols-[minmax(360px,.82fr)_minmax(520px,1.18fr)]">
    <aside className="relative hidden overflow-hidden bg-[#071b33] px-10 py-12 text-white lg:flex lg:min-h-screen lg:flex-col xl:px-16">
      <div className="absolute -right-32 -top-32 size-96 rounded-full border-[70px] border-sky-400/10"/><div className="absolute -bottom-44 -left-32 size-[30rem] rounded-full bg-sky-500/10 blur-3xl"/>
      <BrandLogo variant="footer" className="relative z-10 w-48" priority/>
      <div className="relative z-10 my-auto max-w-md py-16"><p className="text-xs font-bold uppercase tracking-[.2em] text-sky-300">Customer procurement portal</p><h2 className="mt-4 text-4xl font-black leading-tight xl:text-5xl">Technology buying, without the uncertainty.</h2><p className="mt-5 text-base leading-7 text-slate-300">Request business quotations, follow approvals and keep your ICT orders organised in one secure workspace.</p><div className="mt-9 space-y-4"><Benefit icon={<CheckCircle2/>} text="Track quotations and final documents"/><Benefit icon={<ShieldCheck/>} text="Secure account and payment workflows"/><Benefit icon={<Headphones/>} text="Local support from our South African team"/></div></div>
      <p className="relative z-10 text-xs text-slate-400">Innozanzi (Pty) Ltd · ICT procurement & solutions</p>
    </aside>
    <section className="flex min-h-screen flex-col">
      <header className="flex h-20 items-center justify-between px-4 sm:px-8 lg:px-10"><BrandLogo className="w-36 lg:hidden" priority/><Link className="ml-auto text-sm font-semibold text-slate-600 hover:text-sky-700" href="/">← Back to shop</Link></header>
      <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:px-8 sm:pb-16 lg:px-10"><div className="w-full max-w-[31rem]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,.08)] sm:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>{children}</div><div className="mt-5 text-center text-sm text-slate-600">{footer}</div><p className="mt-6 text-center text-xs leading-5 text-slate-400">By continuing, you agree to our <Link className="underline hover:text-slate-700" href="/policies/terms">terms</Link> and <Link className="underline hover:text-slate-700" href="/policies/privacy">privacy policy</Link>.</p></div></div>
    </section>
  </main>
}
function Benefit({icon,text}:{icon:ReactNode;text:string}){return <div className="flex items-center gap-3 text-sm font-medium text-slate-200"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-sky-300 [&_svg]:size-4">{icon}</span><span>{text}</span></div>}
