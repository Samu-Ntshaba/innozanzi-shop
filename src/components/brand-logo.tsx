import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, priority = false, variant = "default" }: { className?: string; priority?: boolean; variant?: "default" | "footer" }) {
  return (
    <Link href="/" aria-label="Innozanzi Shop home" className={cn("inline-flex shrink-0", className)}>
      <Image src={variant === "footer" ? "/brand/innozanzi-shop-logo-footer.svg" : "/brand/innozanzi-shop-logo.png"} alt="Innozanzi Shop" width={720} height={360} className="h-auto w-full object-contain" priority={priority} />
    </Link>
  );
}
