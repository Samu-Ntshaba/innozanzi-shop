import Link from "next/link";
import { isTestModeEnvironment } from "@/lib/test-mode";

export function TestModeBanner() {
  if(!isTestModeEnvironment())return null;
  return <div className="sticky top-0 z-[100] flex min-h-9 items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-center text-xs font-black uppercase tracking-wider text-slate-950">Test Mode · isolated data · emails may be captured <Link className="underline" href="/admin/test-mode">Manage test data</Link></div>;
}
