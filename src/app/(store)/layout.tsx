import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { SupportLauncher } from "@/components/store/support-launcher";
import { MarketingPopupLayer } from "@/components/store/marketing-popup-layer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <div className="storefront min-h-screen bg-white">
    <StoreHeader />
    {children}
    <StoreFooter />
    <SupportLauncher />
    <MarketingPopupLayer />
  </div>;
}
