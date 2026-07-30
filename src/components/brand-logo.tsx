import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, priority = false, variant = "default" }: { className?: string; priority?: boolean; variant?: "default" | "footer" }) {
  if (variant === "footer") {
    return (
      <Link href="/" aria-label="Innozanzi Shop home" className={cn("inline-flex shrink-0", className)}>
        <Image src="/brand/innozanzi-shop-logo-white.png" alt="Innozanzi Shop" width={720} height={360} className="h-auto w-full object-contain" loading={priority ? "eager" : undefined} priority={priority} />
      </Link>
    );
  }

  return (
    <Link href="/" aria-label="Innozanzi Shop home" className={cn("inline-flex shrink-0", className)}>
      <Image src="/brand/innozanzi-shop-logo-header-v2.png" alt="Innozanzi Shop" width={600} height={200} className="h-auto w-full object-contain" loading={priority ? "eager" : undefined} priority={priority} />
    </Link>
  );
}
