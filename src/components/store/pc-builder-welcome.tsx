"use client";

import { useEffect,useState } from "react";
import { ArrowRight,Sparkles,Sun } from "lucide-react";
import { pcBuilderWelcomeKind,type PcBuilderWelcomeKind } from "@/domain/pc-projects/welcome-state";

const visitKey="innozanzi-pc-builder-last-visit-v1";

export function PcBuilderWelcome(){
  const[kind,setKind]=useState<PcBuilderWelcomeKind>(null),[visible,setVisible]=useState(false);
  useEffect(()=>{let timer:ReturnType<typeof setTimeout>|undefined,cancelled=false;try{const now=Date.now(),stored=Number(localStorage.getItem(visitKey))||null,next=pcBuilderWelcomeKind(stored,now);localStorage.setItem(visitKey,String(now));if(next)queueMicrotask(()=>{if(cancelled)return;setKind(next);setVisible(true);timer=setTimeout(()=>setVisible(false),next==="first"?5200:4400)})}catch{/* The workshop remains usable when browser storage is unavailable. */}return()=>{cancelled=true;if(timer)clearTimeout(timer)}},[]);
  useEffect(()=>{if(!visible)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setVisible(false)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[visible]);
  if(!kind)return null;
  const first=kind==="first";
  return <div aria-hidden={!visible} aria-live="polite" className={`fixed inset-0 z-[90] grid place-items-center overflow-hidden bg-[#020711] px-5 text-white transition-opacity duration-700 ${visible?"opacity-100":"pointer-events-none opacity-0"}`} role="dialog" aria-modal="true" aria-label={first?"Welcome to Build a PC":"Welcome back to Build a PC"} onTransitionEnd={event=>{if(event.target===event.currentTarget&&!visible)setKind(null)}}>
    <div aria-hidden="true" className="pc-welcome-grid absolute inset-0"/><div aria-hidden="true" className="pc-welcome-orbit absolute size-[23rem] rounded-full border border-sky-400/15 sm:size-[32rem]"/><div aria-hidden="true" className="pc-welcome-orbit pc-welcome-orbit-delay absolute size-[16rem] rounded-full border border-cyan-300/20 sm:size-[23rem]"/>
    <div className="relative max-w-xl text-center"><div className="pc-welcome-rise relative mx-auto grid size-28 place-items-center sm:size-36"><span className="absolute inset-0 rounded-full bg-sky-400/20 blur-2xl"/><Sun className="relative size-20 text-sky-300 sm:size-24" strokeWidth={1}/><Sparkles className="pc-welcome-spark absolute right-0 top-1 size-7 text-cyan-200"/></div><p className="mt-7 text-xs font-black uppercase tracking-[.28em] text-sky-300">Innozanzi PC Workshop</p><h1 className="pc-welcome-copy mt-3 text-4xl font-black tracking-tight sm:text-6xl">{first?"Welcome to your build.":"Welcome back to your journey."}</h1><p className="pc-welcome-copy mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">{first?"Your workshop is ready.":"Your workshop is ready when you are."}</p><button tabIndex={visible?0:-1} className="pc-welcome-copy mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-400 px-6 font-black text-slate-950 hover:bg-sky-300" onClick={()=>setVisible(false)}>Enter workshop<ArrowRight className="size-4"/></button></div>
  </div>;
}
