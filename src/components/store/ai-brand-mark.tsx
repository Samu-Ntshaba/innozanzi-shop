import Image from "next/image";
import { Sparkles } from "lucide-react";
export function AIBrandMark() {
  return <span aria-hidden="true" className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/60 bg-white shadow-[0_0_16px_#22d3ee55]"><Image src="/brand/innozanzi-shop-mark.png" alt="" width={28} height={28} className="object-contain"/><Sparkles className="absolute -right-1 -top-1 size-4 rounded-full bg-[#071b33] p-0.5 text-cyan-200"/><span className="absolute -bottom-1 rounded bg-cyan-300 px-1 text-[8px] font-black leading-3 text-[#071b33]">AI</span></span>;
}
