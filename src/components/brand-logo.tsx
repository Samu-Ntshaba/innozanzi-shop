import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, priority = false, variant = "default" }: { className?: string; priority?: boolean; variant?: "default" | "footer" }) {
  if (variant === "footer") {
    return (
      <Link href="/" aria-label="Innozanzi Shop home" className={cn("inline-flex shrink-0 items-end gap-2", className)}>
        <span className="relative mb-0.5 aspect-square w-[29%] shrink-0 overflow-hidden rounded-[23%] bg-white">
          <Image src="/brand/innozanzi-shop-mark.png" alt="" fill sizes="52px" className="object-contain" priority={priority} />
        </span>
        <span className="flex min-w-0 flex-1 items-end gap-2 pb-1">
          <span className="text-[1.35rem] font-bold leading-[0.82] tracking-tight text-white">Inno<br />Zanzi</span>
          <span className="mb-0.5 rounded bg-[#ffc400] px-2 py-1 text-[0.6rem] font-extrabold leading-none tracking-wide text-[#071b33]">SHOP</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" aria-label="Innozanzi Shop home" className={cn("inline-flex shrink-0", className)}>
      <Image src="/brand/innozanzi-shop-logo.png" alt="Innozanzi Shop" width={720} height={360} className="h-auto w-full object-contain" priority={priority} />
    </Link>
  );
}
