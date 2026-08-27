"use client";

import { usePathname } from "next/navigation";

export function StoreFrame({ children, header, footer, support, marketing }: { children: React.ReactNode; header: React.ReactNode; footer: React.ReactNode; support: React.ReactNode; marketing: React.ReactNode }) {
  const pathname = usePathname();
  const focusedWorkspace = pathname === "/build-a-pc";

  if (focusedWorkspace) {
    return <div className="min-h-dvh bg-[#050b14]">{children}</div>;
  }

  return <div className="storefront min-h-screen bg-white">
    {header}
    {children}
    {footer}
    {support}
    {marketing}
  </div>;
}
