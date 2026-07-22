import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute left-1/2 top-6 z-10 w-44 -translate-x-1/2">
        <BrandLogo priority />
      </div>
      {children}
    </div>
  );
}
