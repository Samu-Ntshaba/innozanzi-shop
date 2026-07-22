import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" aria-label="Innozanzi Shop home" className={cn("inline-flex shrink-0", className)}>
      <Image src="/brand/innozanzi-shop-logo.png" alt="Innozanzi Shop" width={720} height={360} className="h-auto w-full object-contain" priority={priority} />
    </Link>
  );
}
