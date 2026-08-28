"use client";

import { useEffect,useState } from "react";
import { ArrowRight,Cpu } from "lucide-react";
import { pcBuilderWelcomeKind,type PcBuilderWelcomeKind } from "@/domain/pc-projects/welcome-state";

const visitKey="innozanzi-pc-builder-last-visit-v1";

export function PcBuilderWelcome(){
  const[kind,setKind]=useState<PcBuilderWelcomeKind>(null),[visible,setVisible]=useState(false);
  useEffect(()=>{let timer:ReturnType<typeof setTimeout>|undefined,cancelled=false;try{const now=Date.now(),stored=Number(localStorage.getItem(visitKey))||null,next=pcBuilderWelcomeKind(stored,now);localStorage.setItem(visitKey,String(now));if(next)queueMicrotask(()=>{if(cancelled)return;setKind(next);setVisible(true);timer=setTimeout(()=>setVisible(false),next==="first"?5200:4400)})}catch{/* The workshop remains usable when browser storage is unavailable. */}return()=>{cancelled=true;if(timer)clearTimeout(timer)}},[]);
  useEffect(()=>{if(!visible)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setVisible(false)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[visible]);
  if(!kind)return null;
  const first=kind==="first";
  return <div aria-hidden={!visible} aria-live="polite" className={`fixed inset-0 z-[90] grid place-items-center bg-[#0b111b] px-5 text-white transition-opacity duration-500 ${visible?"opacity-100":"pointer-events-none opacity-0"}`} role="dialog" aria-modal="true" aria-label={first?"Welcome to Build a PC":"Welcome back to Build a PC"} onTransitionEnd={event=>{if(event.target===event.currentTarget&&!visible)setKind(null)}}>
    <div className="max-w-xl text-center"><div className="mx-auto grid size-20 place-items-center rounded-2xl border border-slate-700 bg-[#111927]"><Cpu className="size-9 text-sky-300"/></div><p className="mt-7 text-xs font-black uppercase tracking-[.24em] text-sky-300">Innozanzi PC Workshop</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{first?"Welcome to your build.":"Welcome back."}</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">{first?"Your workshop is ready.":"Continue when you are ready."}</p><button tabIndex={visible?0:-1} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-6 font-black text-slate-950 hover:bg-sky-300" onClick={()=>setVisible(false)}>Enter workshop<ArrowRight className="size-4"/></button></div>
  </div>;
}
