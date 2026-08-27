import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { brand } from "@/config/brand";

export function BrandLogo({ className, priority = false, variant = "default" }: { className?: string; priority?: boolean; variant?: "default" | "footer" }) {
  if (variant === "footer") {
    return (
      <Link href="/" aria-label={`${brand.shopName} home`} className={cn("inline-flex shrink-0", className)}>
        <Image src={brand.assets.lightLogo} alt={brand.shopName} width={720} height={360} className="h-auto w-full object-contain" loading={priority ? "eager" : undefined} priority={priority} />
      </Link>
    );
  }

  return (
    <Link href="/" aria-label={`${brand.shopName} home`} className={cn("inline-flex shrink-0", className)}>
      <Image src={brand.assets.headerLogo} alt={brand.shopName} width={600} height={200} className="h-auto w-full object-contain" loading={priority ? "eager" : undefined} priority={priority} />
    </Link>
  );
}
