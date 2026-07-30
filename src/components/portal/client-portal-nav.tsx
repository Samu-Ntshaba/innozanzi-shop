"use client";

import { BookOpenCheck, Boxes, ChevronRight, ClipboardList, FileText, Headphones, House, PackageCheck, RotateCcw, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const groups=[
  {label:"Workspace",items:[{label:"Overview",href:"/portal",module:null,icon:House},{label:"Browse products",href:"/shop",module:"PRODUCTS",icon:ShoppingBag}]},
  {label:"Procurement",items:[{label:"Quotation requests",href:"/account/quotations",module:"QUOTATIONS",icon:ClipboardList},{label:"Orders",href:"/account/orders",module:"ORDERS",icon:Boxes},{label:"Delivery tracking",href:"/account/orders",module:"DELIVERIES",icon:PackageCheck}]},
  {label:"Service & records",items:[{label:"Returns & refunds",href:"/account/returns",module:"RETURNS",icon:RotateCcw},{label:"Support centre",href:"/account/support",module:"SUPPORT",icon:Headphones},{label:"Documents",href:"/account",module:"DOCUMENTS",icon:FileText},{label:"Training & guidance",href:"/account/support",module:"TRAINING",icon:BookOpenCheck}]},
] as const;

export function ClientPortalNav({modules}:{modules:string[]}){
  const pathname=usePathname();
  return <nav aria-label="Client Portal" className="space-y-6 p-3">{groups.map(group=>{const items=group.items.filter(item=>!item.module||modules.includes(item.module));if(!items.length)return null;return <section key={group.label}><p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[.17em] text-slate-500">{group.label}</p><div className="space-y-1">{items.map(item=>{const active=item.href==="/portal"?pathname==="/portal":pathname===item.href||pathname.startsWith(`${item.href}/`);const Icon=item.icon;return <Link aria-current={active?"page":undefined} className={`group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[13px] transition ${active?"bg-sky-400/15 font-semibold text-white before:absolute before:-left-3 before:h-6 before:w-0.5 before:bg-sky-300":"text-slate-300 hover:bg-white/[.07] hover:text-white"}`} href={item.href} key={`${item.label}-${item.href}`}><Icon className={`size-4 shrink-0 ${active?"text-sky-300":"text-slate-500 group-hover:text-sky-300"}`}/><span className="min-w-0 flex-1 truncate">{item.label}</span><ChevronRight className="size-3.5 text-slate-600 group-hover:text-sky-300"/></Link>})}</div></section>})}</nav>;
}
