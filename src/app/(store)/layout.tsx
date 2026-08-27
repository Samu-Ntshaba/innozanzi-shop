import { StoreFrame } from "@/components/store/store-frame";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { SupportLauncher } from "@/components/store/support-launcher";
import { MarketingPopupLayer } from "@/components/store/marketing-popup-layer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreFrame header={<StoreHeader />} footer={<StoreFooter />} support={<SupportLauncher />} marketing={<MarketingPopupLayer />}>{children}</StoreFrame>;
}
